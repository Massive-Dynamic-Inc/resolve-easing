/**
 * Resolve API Wrapper
 * Clean interface to DaVinci Resolve's Workflow Integration API
 */

const PLUGIN_ID = 'com.massive-dynamic.resolve-easing';

let WorkflowIntegration = null;
let resolveObj = null;

/**
 * Initialize the Resolve connection
 */
async function initialize() {
  if (resolveObj) return true;

  try {
    // Load the native module
    WorkflowIntegration = require('./WorkflowIntegration.node');
    
    const success = await WorkflowIntegration.Initialize(PLUGIN_ID);
    if (!success) {
      console.error('[Resolve] Failed to initialize');
      return false;
    }

    resolveObj = await WorkflowIntegration.GetResolve();
    if (!resolveObj) {
      console.error('[Resolve] Failed to get Resolve object');
      return false;
    }

    console.log('[Resolve] Connected');
    return true;
  } catch (e) {
    console.error('[Resolve] Init error:', e.message);
    return false;
  }
}

/**
 * Get the current Fusion composition
 */
async function getCurrentComp() {
  if (!resolveObj) {
    const ok = await initialize();
    if (!ok) return { error: 'Not connected to Resolve' };
  }

  try {
    const pm = await resolveObj.GetProjectManager();
    if (!pm) return { error: 'No project manager' };

    const project = await pm.GetCurrentProject();
    if (!project) return { error: 'No project open' };

    const timeline = await project.GetCurrentTimeline();
    if (!timeline) return { error: 'No timeline open' };

    const item = await timeline.GetCurrentVideoItem();
    if (!item) return { error: 'No clip under playhead' };

    const compCount = await item.GetFusionCompCount();
    if (!compCount || compCount < 1) return { error: 'No Fusion comp on clip' };

    const names = await item.GetFusionCompNameList();
    if (!names || names.length < 1) return { error: 'No comp names' };

    const comp = await item.LoadFusionCompByName(names[0]);
    if (!comp) return { error: 'Failed to load comp' };

    return { 
      comp, 
      name: names[0],
      timeline: timeline.GetName ? await timeline.GetName() : 'Timeline'
    };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Get Resolve version info
 */
async function getVersion() {
  if (!resolveObj) return null;
  try {
    return await resolveObj.GetVersionString();
  } catch (e) {
    return null;
  }
}

module.exports = {
  initialize,
  getCurrentComp,
  getVersion,
  PLUGIN_ID,
};
