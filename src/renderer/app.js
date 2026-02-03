/**
 * Resolve Easing - Renderer (UI)
 */

// State
let currentTool = null;
let currentInput = null;
let inValue = 50;
let outValue = 50;

// DOM Elements
const statusEl = document.getElementById('status');
const errorPanel = document.getElementById('error-panel');
const errorMessage = document.getElementById('error-message');
const mainContent = document.getElementById('main-content');
const toolSelect = document.getElementById('tool-select');
const inputSection = document.getElementById('input-section');
const inputSelect = document.getElementById('input-select');
const easingSection = document.getElementById('easing-section');
const inSlider = document.getElementById('in-slider');
const outSlider = document.getElementById('out-slider');
const inValueEl = document.getElementById('in-value');
const outValueEl = document.getElementById('out-value');
const curveCanvas = document.getElementById('curve-canvas');
const applyBtn = document.getElementById('apply-btn');
const refreshBtn = document.getElementById('refresh-btn');
const retryBtn = document.getElementById('retry-btn');
const compNameEl = document.getElementById('comp-name');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupEventListeners();
  await refresh();
}

function setupEventListeners() {
  // Refresh button
  refreshBtn.addEventListener('click', refresh);
  retryBtn.addEventListener('click', refresh);

  // Tool selection
  toolSelect.addEventListener('change', onToolChange);
  inputSelect.addEventListener('change', onInputChange);

  // Sliders
  inSlider.addEventListener('input', onSliderChange);
  outSlider.addEventListener('input', onSliderChange);

  // Presets
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      inSlider.value = btn.dataset.in;
      outSlider.value = btn.dataset.out;
      onSliderChange();
    });
  });

  // Apply button
  applyBtn.addEventListener('click', applyEasing);
}

/**
 * Refresh connection and data
 */
async function refresh() {
  showStatus('Connecting...');
  hideError();

  try {
    const result = await window.api.getComp();
    
    if (result.error) {
      showError(result.error);
      return;
    }

    showStatus('Connected', true);
    compNameEl.textContent = result.name || 'Composition';
    
    // Populate tools
    populateTools(result.tools || []);
    
  } catch (e) {
    showError('Failed to connect: ' + e.message);
  }
}

/**
 * Populate tool dropdown
 */
function populateTools(tools) {
  toolSelect.innerHTML = '<option value="">Select a tool...</option>';
  
  tools.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    toolSelect.appendChild(opt);
  });

  // Reset dependent sections
  inputSection.style.display = 'none';
  easingSection.style.display = 'none';
  currentTool = null;
  currentInput = null;
}

/**
 * Handle tool selection
 */
async function onToolChange() {
  const toolName = toolSelect.value;
  
  if (!toolName) {
    inputSection.style.display = 'none';
    easingSection.style.display = 'none';
    currentTool = null;
    return;
  }

  currentTool = toolName;
  
  // Get animated inputs
  const result = await window.api.getInputs(toolName);
  
  if (result.error) {
    showError(result.error);
    return;
  }

  populateInputs(result.inputs || []);
}

/**
 * Populate input dropdown
 */
function populateInputs(inputs) {
  inputSelect.innerHTML = '<option value="">Select an input...</option>';
  
  inputs.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    inputSelect.appendChild(opt);
  });

  inputSection.style.display = inputs.length > 0 ? 'block' : 'none';
  easingSection.style.display = 'none';
  currentInput = null;
  
  if (inputs.length === 0) {
    showStatus('No animated inputs found');
  }
}

/**
 * Handle input selection
 */
async function onInputChange() {
  const inputName = inputSelect.value;
  
  if (!inputName) {
    easingSection.style.display = 'none';
    currentInput = null;
    return;
  }

  currentInput = inputName;
  easingSection.style.display = 'block';
  
  // Draw initial curve
  drawCurve();
}

/**
 * Handle slider changes
 */
function onSliderChange() {
  inValue = parseInt(inSlider.value);
  outValue = parseInt(outSlider.value);
  
  inValueEl.textContent = inValue;
  outValueEl.textContent = outValue;
  
  drawCurve();
}

/**
 * Draw the easing curve preview
 */
function drawCurve() {
  const ctx = curveCanvas.getContext('2d');
  const w = curveCanvas.width;
  const h = curveCanvas.height;
  const padding = 16;
  
  // Clear
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, w, h);
  
  // Draw grid
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(w - padding, h - padding);
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(padding, padding);
  ctx.stroke();
  
  // Generate curve points
  const points = generateCurve(inValue, outValue, 50);
  
  // Draw curve
  ctx.strokeStyle = '#4a9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  points.forEach((p, i) => {
    const x = padding + p.x * (w - 2 * padding);
    const y = h - padding - p.y * (h - 2 * padding);
    
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  
  ctx.stroke();
}

/**
 * Generate curve from in/out values
 */
function generateCurve(inVal, outVal, steps) {
  const inInfluence = inVal / 100;
  const outInfluence = outVal / 100;
  const points = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = customEase(t, inInfluence, outInfluence);
    points.push({ x: t, y });
  }
  
  return points;
}

/**
 * Custom easing function
 */
function customEase(t, inInfluence, outInfluence) {
  const inCurve = Math.pow(t, 1 + inInfluence * 2);
  const outCurve = 1 - Math.pow(1 - t, 1 + outInfluence * 2);
  const blend = t;
  return inCurve * (1 - blend) + outCurve * blend;
}

/**
 * Apply easing to keyframes
 */
async function applyEasing() {
  if (!currentTool || !currentInput) {
    showStatus('Select a tool and input first');
    return;
  }

  applyBtn.disabled = true;
  applyBtn.textContent = 'Applying...';

  try {
    const result = await window.api.applyEasing({
      toolName: currentTool,
      inputName: currentInput,
      inValue,
      outValue,
    });

    if (result.error) {
      showError(result.error);
    } else {
      showStatus(`Applied to ${result.modified} keyframes`, true);
    }
  } catch (e) {
    showError('Failed to apply: ' + e.message);
  } finally {
    applyBtn.disabled = false;
    applyBtn.textContent = 'Apply Easing';
  }
}

// UI Helpers

function showStatus(msg, success = false) {
  statusEl.textContent = msg;
  statusEl.className = 'status' + (success ? ' connected' : '');
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorPanel.style.display = 'block';
  showStatus('Error');
}

function hideError() {
  errorPanel.style.display = 'none';
}
