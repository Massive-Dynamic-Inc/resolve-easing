/**
 * Resolve Easing - Renderer (UI Logic)
 * Milestone 1: Connection & Detection
 */

'use strict';

// State
let currentTool = null;
let currentInput = null;

// DOM Elements
const statusEl = document.getElementById('status');
const statusTextEl = statusEl.querySelector('.status-text');
const errorBox = document.getElementById('error-box');
const errorMessage = document.getElementById('error-message');
const errorHint = document.getElementById('error-hint');
const mainContent = document.getElementById('main-content');
const compNameEl = document.getElementById('comp-name');
const timelineNameEl = document.getElementById('timeline-name');
const toolSelect = document.getElementById('tool-select');
const inputSection = document.getElementById('input-section');
const inputSelect = document.getElementById('input-select');
const noKeyframesHint = document.getElementById('no-keyframes-hint');
const keyframesSection = document.getElementById('keyframes-section');
const keyframesList = document.getElementById('keyframes-list');
const refreshBtn = document.getElementById('refresh-btn');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupEventListeners();
  await refresh();
}

function setupEventListeners() {
  refreshBtn.addEventListener('click', refresh);
  toolSelect.addEventListener('change', onToolChange);
  inputSelect.addEventListener('change', onInputChange);
}

/**
 * Refresh connection and data
 */
async function refresh() {
  setStatus('connecting', 'Connecting...');
  hideError();
  hideMain();

  try {
    const info = await window.api.getCompInfo();

    if (!info.connected) {
      setStatus('error', 'Disconnected');
      showError(info.error, info.hint);
      return;
    }

    setStatus('connected', 'Connected');
    showMain();

    compNameEl.textContent = info.name || 'Fusion Comp';
    timelineNameEl.textContent = info.timeline ? `on ${info.timeline}` : '';

    // Load tools
    await loadTools();

  } catch (e) {
    setStatus('error', 'Error');
    showError('Connection failed', e.message);
  }
}

/**
 * Load tools into dropdown
 */
async function loadTools() {
  toolSelect.innerHTML = '<option value="">Select a tool...</option>';
  inputSection.style.display = 'none';
  keyframesSection.style.display = 'none';
  currentTool = null;
  currentInput = null;

  try {
    const result = await window.api.getAllTools();
    
    if (result.error) {
      console.error('Failed to load tools:', result.error);
      return;
    }

    const tools = result.tools || [];
    
    tools.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      toolSelect.appendChild(opt);
    });

  } catch (e) {
    console.error('Failed to load tools:', e);
  }
}

/**
 * Handle tool selection
 */
async function onToolChange() {
  const toolName = toolSelect.value;
  
  inputSection.style.display = 'none';
  keyframesSection.style.display = 'none';
  noKeyframesHint.style.display = 'none';
  currentInput = null;

  if (!toolName) {
    currentTool = null;
    return;
  }

  currentTool = toolName;

  // Load animated inputs
  try {
    const result = await window.api.getAnimatedInputs(toolName);
    
    if (result.error) {
      console.error('Failed to load inputs:', result.error);
      return;
    }

    const inputs = result.inputs || [];
    
    inputSelect.innerHTML = '<option value="">Select an input...</option>';
    
    if (inputs.length === 0) {
      inputSection.style.display = 'block';
      noKeyframesHint.style.display = 'block';
      inputSelect.disabled = true;
    } else {
      inputSection.style.display = 'block';
      noKeyframesHint.style.display = 'none';
      inputSelect.disabled = false;
      
      inputs.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        inputSelect.appendChild(opt);
      });
    }

  } catch (e) {
    console.error('Failed to load inputs:', e);
  }
}

/**
 * Handle input selection
 */
async function onInputChange() {
  const inputName = inputSelect.value;
  
  keyframesSection.style.display = 'none';

  if (!inputName || !currentTool) {
    currentInput = null;
    return;
  }

  currentInput = inputName;

  // Load keyframes
  try {
    const result = await window.api.getKeyframes(currentTool, inputName);
    
    if (result.error) {
      console.error('Failed to load keyframes:', result.error);
      return;
    }

    const keyframes = result.keyframes || [];
    
    keyframesSection.style.display = 'block';
    renderKeyframes(keyframes);

  } catch (e) {
    console.error('Failed to load keyframes:', e);
  }
}

/**
 * Render keyframes list
 */
function renderKeyframes(keyframes) {
  keyframesList.innerHTML = '';

  if (keyframes.length === 0) {
    keyframesList.innerHTML = '<div class="keyframes-empty">No keyframes</div>';
    return;
  }

  keyframes.forEach(kf => {
    const item = document.createElement('div');
    item.className = 'keyframe-item';
    
    const frame = document.createElement('span');
    frame.className = 'keyframe-frame';
    frame.textContent = `Frame ${kf.frame}`;
    
    const value = document.createElement('span');
    value.className = 'keyframe-value';
    // Format value nicely
    const val = typeof kf.value === 'number' ? kf.value.toFixed(3) : kf.value;
    value.textContent = val;
    
    item.appendChild(frame);
    item.appendChild(value);
    keyframesList.appendChild(item);
  });
}

// UI Helpers

function setStatus(state, text) {
  statusEl.className = 'status ' + state;
  statusTextEl.textContent = text;
}

function showError(message, hint) {
  errorMessage.textContent = message;
  errorHint.textContent = hint || '';
  errorHint.style.display = hint ? 'block' : 'none';
  errorBox.style.display = 'block';
}

function hideError() {
  errorBox.style.display = 'none';
}

function showMain() {
  mainContent.style.display = 'block';
}

function hideMain() {
  mainContent.style.display = 'none';
}
