/**
 * Resolve Easing - Renderer Process
 * Milestone 1: Connection & Detection UI
 */

'use strict';

// State
let selectedTool = null;
let selectedInput = null;
let isRefreshing = false;

// DOM Elements
const statusEl = document.getElementById('status');
const statusIconEl = document.getElementById('status-icon');
const statusTextEl = document.getElementById('status-text');
const compInfoEl = document.getElementById('comp-info');
const compNameEl = document.getElementById('comp-name');
const compPageEl = document.getElementById('comp-page');
const errorMessageEl = document.getElementById('error-message');
const toolListEl = document.getElementById('tool-list');
const inputSectionEl = document.getElementById('input-section');
const inputSelectEl = document.getElementById('input-select');
const keyframeSectionEl = document.getElementById('keyframe-section');
const keyframeListEl = document.getElementById('keyframe-list');

/**
 * Update status display
 */
function updateStatus(connected, error = null) {
  if (connected) {
    statusEl.className = 'status connected';
    statusIconEl.textContent = '●';
    statusTextEl.textContent = 'Connected';
    compInfoEl.style.display = 'block';
  } else {
    statusEl.className = 'status disconnected';
    statusIconEl.textContent = '●';
    statusTextEl.textContent = error || 'Disconnected';
    compInfoEl.style.display = 'none';
  }

  // Show error message if exists
  if (error && !connected) {
    showError(error);
  } else {
    hideError();
  }
}

/**
 * Show error message
 */
function showError(message) {
  errorMessageEl.textContent = message;
  errorMessageEl.style.display = 'block';
}

/**
 * Hide error message
 */
function hideError() {
  errorMessageEl.style.display = 'none';
}

/**
 * Update comp info display
 */
function updateCompInfo(compName, page) {
  compNameEl.textContent = compName || 'Unknown';
  compPageEl.textContent = page ? `Page: ${page}` : '';
}

/**
 * Update tool list
 */
function updateToolList(tools) {
  if (!tools || tools.length === 0) {
    toolListEl.innerHTML = '<div class="hint">No tools selected in Fusion</div>';
    return;
  }

  toolListEl.innerHTML = '';
  for (const tool of tools) {
    const div = document.createElement('div');
    div.className = 'tool-item';
    if (selectedTool && selectedTool.name === tool.name) {
      div.classList.add('selected');
    }

    div.innerHTML = `
      <span class="tool-name">${tool.name}</span>
      <span class="tool-type">${tool.type}</span>
    `;

    div.addEventListener('click', () => onToolSelect(tool));
    toolListEl.appendChild(div);
  }
}

/**
 * Handle tool selection
 */
async function onToolSelect(tool) {
  selectedTool = tool;
  selectedInput = null;

  // Update UI immediately
  updateToolList([tool]);
  inputSectionEl.style.display = 'none';
  keyframeSectionEl.style.display = 'none';

  if (!window.resolveEasing) return;

  // Get animated inputs
  const result = await window.resolveEasing.getInputs(tool.name);

  if (result.error) {
    showError(result.error);
    return;
  }

  hideError();

  const inputs = result.inputs || [];

  if (inputs.length === 0) {
    showError('No animated inputs. Create keyframes first.');
    return;
  }

  // Update input dropdown
  inputSelectEl.innerHTML = '<option value="">Select an input...</option>';
  for (const input of inputs) {
    const option = document.createElement('option');
    option.value = input.id;
    option.textContent = `${input.name} (${input.keyframeCount} keyframes)`;
    inputSelectEl.appendChild(option);
  }

  inputSectionEl.style.display = 'block';

  // Auto-select if only one input
  if (inputs.length === 1) {
    inputSelectEl.value = inputs[0].id;
    await onInputChange();
  }
}

/**
 * Handle input selection
 */
async function onInputChange() {
  const inputId = inputSelectEl.value;

  if (!inputId) {
    selectedInput = null;
    keyframeSectionEl.style.display = 'none';
    return;
  }

  selectedInput = inputId;

  if (!window.resolveEasing || !selectedTool) return;

  // Get keyframes
  const result = await window.resolveEasing.getKeyframes(selectedTool.name, inputId);

  if (result.error) {
    showError(result.error);
    keyframeSectionEl.style.display = 'none';
    return;
  }

  hideError();

  const keyframes = result.keyframes || [];

  if (keyframes.length < 2) {
    showError('Need at least 2 keyframes');
    keyframeSectionEl.style.display = 'none';
    return;
  }

  // Display keyframes
  keyframeListEl.innerHTML = '';
  for (const kf of keyframes) {
    const div = document.createElement('div');
    div.className = 'keyframe-item';

    const frameSpan = document.createElement('span');
    frameSpan.className = 'keyframe-frame';
    frameSpan.textContent = `Frame ${kf.frame}`;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'keyframe-value';
    valueSpan.textContent = kf.value != null ? kf.value.toFixed(3) : 'N/A';

    div.appendChild(frameSpan);
    div.appendChild(valueSpan);
    keyframeListEl.appendChild(div);
  }

  keyframeSectionEl.style.display = 'block';
}

/**
 * Refresh data from Resolve
 */
async function refresh() {
  if (isRefreshing) return;
  isRefreshing = true;

  try {
    if (!window.resolveEasing) {
      updateStatus(false, 'API not available');
      return;
    }

    // Get status
    const status = await window.resolveEasing.getStatus();

    if (!status.connected) {
      updateStatus(false, status.error);
      return;
    }

    if (status.error) {
      updateStatus(true, null);
      updateCompInfo(status.compName, status.page);
      showError(status.error);
      return;
    }

    // Update status
    updateStatus(true);
    updateCompInfo(status.compName, status.page);
    hideError();

    // Get tools
    const toolsResult = await window.resolveEasing.getTools();

    if (toolsResult.error) {
      showError(toolsResult.error);
      updateToolList([]);
      return;
    }

    const tools = toolsResult.tools || [];
    updateToolList(tools);

    // Auto-select single tool
    if (tools.length === 1 && !selectedTool) {
      await onToolSelect(tools[0]);
    }

    // Refresh current selection
    if (selectedTool && selectedInput) {
      const stillExists = tools.find(t => t.name === selectedTool.name);
      if (stillExists) {
        await onInputChange();
      } else {
        // Tool no longer selected
        selectedTool = null;
        selectedInput = null;
        inputSectionEl.style.display = 'none';
        keyframeSectionEl.style.display = 'none';
      }
    }

  } catch (err) {
    // Only log actual errors
    console.error('Refresh error:', err);
  } finally {
    isRefreshing = false;
  }
}

/**
 * Initialize
 */
async function init() {
  // Set up input change handler
  inputSelectEl.addEventListener('change', onInputChange);

  // Initial refresh
  await refresh();

  // Poll every 500ms
  setInterval(refresh, 500);
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
