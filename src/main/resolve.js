/**
 * Resolve API Wrapper
 * Clean interface for DaVinci Resolve Workflow Integration
 */

'use strict';

const path = require('path');

const PLUGIN_ID = 'com.massive-dynamic.resolve-easing';

let WorkflowIntegration = null;
let resolveObj = null;

/**
 * Initialize Resolve connection (lazy)
 */
async function initialize() {
  if (resolveObj) return true;

  try {
    // Load native module from plugin directory
    WorkflowIntegration = require(path.join(__dirname, 'WorkflowIntegration.node'));
    
    const success = await WorkflowIntegration.Initialize(PLUGIN_ID);
    if (!success) {
      console.error('[Resolve] Failed to initialize WorkflowIntegration');
      return false;
    }

    resolveObj = await WorkflowIntegration.GetResolve();
    if (!resolveObj) {
      console.error('[Resolve] Failed to get Resolve object');
      return false;
    }

    return true;
  } catch (e) {
    console.error('[Resolve] Init error:', e.message);
    return false;
  }
}

/**
 * Get Resolve object (initializes if needed)
 */
async function getResolve() {
  if (!resolveObj) {
    const ok = await initialize();
    if (!ok) return null;
  }
  return resolveObj;
}

/**
 * Get current Fusion composition info
 * Returns: { comp, name, timeline } or { error, hint }
 */
async function getCurrentComp() {
  const resolve = await getResolve();
  if (!resolve) {
    return { error: 'Cannot connect to Resolve' };
  }

  try {
    const pm = await resolve.GetProjectManager();
    if (!pm) return { error: 'No project manager' };

    const project = await pm.GetCurrentProject();
    if (!project) return { error: 'No project open', hint: 'Open a project in Resolve' };

    const timeline = await project.GetCurrentTimeline();
    if (!timeline) return { error: 'No timeline open', hint: 'Open a timeline' };

    const timelineName = await timeline.GetName();

    const item = await timeline.GetCurrentVideoItem();
    if (!item) return { error: 'No clip under playhead', hint: 'Move playhead over a clip' };

    const compCount = await item.GetFusionCompCount();
    if (!compCount || compCount < 1) {
      return { error: 'No Fusion comp on clip', hint: 'Add a Fusion composition' };
    }

    const names = await item.GetFusionCompNameList();
    if (!names || names.length < 1) {
      return { error: 'Cannot read comp names' };
    }

    const comp = await item.LoadFusionCompByName(names[0]);
    if (!comp) return { error: 'Failed to load Fusion comp' };

    return {
      comp,
      name: names[0],
      timeline: timelineName || 'Timeline',
    };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Get current page
 */
async function getCurrentPage() {
  const resolve = await getResolve();
  if (!resolve) return null;
  
  try {
    return await resolve.GetCurrentPage();
  } catch (e) {
    return null;
  }
}

module.exports = {
  initialize,
  getResolve,
  getCurrentComp,
  getCurrentPage,
  PLUGIN_ID,
};
