/**
 * Fusion Easing Plugin - Renderer Process (UI)
 */

'use strict';

// Easing functions for drawing curves
const easingFunctions = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => 1 - (--t) * t * t * t,
  easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  easeInSine: t => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: t => Math.sin((t * Math.PI) / 2),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: t => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  easeInCirc: t => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: t => Math.sqrt(1 - (--t) * t),
  easeInOutCirc: t => t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  easeInBack: t => 2.70158 * t * t * t - 1.70158 * t * t,
  easeOutBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  easeInOutBack: t => {
    const c = 1.70158 * 1.525;
    return t < 0.5 ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2 : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
  },
};

// Easing curve types (shown as icons)
const easingTypes = ['Quad', 'Cubic', 'Quart', 'Sine', 'Expo', 'Circ', 'Back'];

// Linear is special - no direction variants
const LINEAR_EASING = 'linear';

// Direction tabs
const easingDirections = {
  'In': name => `easeIn${name}`,
  'Out': name => `easeOut${name}`,
  'In-Out': name => `easeInOut${name}`,
};

// Current direction tab
let activeDirection = 'Out';

// State
let selectedEasing = 'easeOutQuad';
let compInfo = null;
let selectedTools = [];
let selectedTool = null;
let animatedInputs = [];
let selectedInput = null;
let isSelectingTool = false; // Prevent re-selection during async operations
let isRefreshing = false; // Prevent concurrent refresh calls
let keyframes = [];
let selectedFrames = []; // Array of selected frame numbers (sorted)

// DOM Elements
const compNameEl = document.getElementById('comp-name');
const compTimeEl = document.getElementById('comp-time');
const toolListEl = document.getElementById('tool-list');
const inputSectionEl = document.getElementById('input-section');
const inputSelectEl = document.getElementById('input-select');
const keyframeSectionEl = document.getElementById('keyframe-section');
const timelineTrackEl = document.getElementById('timeline-track');
const timelineLabelsEl = document.getElementById('timeline-labels');
const selectionHintEl = document.getElementById('selection-hint');
const selectionInfoEl = document.getElementById('selection-info');
const selectionRangeEl = document.getElementById('selection-range');
const easingContainerEl = document.getElementById('easing-container');
const previewCanvasEl = document.getElementById('preview-canvas');
const previewLabelEl = document.getElementById('preview-label');
const applyBtnEl = document.getElementById('apply-btn');
const refreshBtnEl = document.getElementById('refresh-btn');
const statusEl = document.getElementById('status');
const overlayEl = document.getElementById('overlay');
const overlayMessageEl = document.getElementById('overlay-message');

/**
 * Show overlay with message
 */
function showOverlay(message) {
  if (overlayEl && overlayMessageEl) {
    overlayMessageEl.textContent = message;
    overlayEl.style.display = 'flex';
  }
}

/**
 * Hide overlay
 */
function hideOverlay() {
  if (overlayEl) {
    overlayEl.style.display = 'none';
  }
}

/**
 * Draw easing curve on canvas
 */
function drawCurve(canvas, easingName, isSmall = true) {
  const fn = easingFunctions[easingName];
  if (!fn) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const pad = isSmall ? 3 : 10;

  ctx.fillStyle = isSmall ? '#252526' : '#1a1a1a';
  ctx.fillRect(0, 0, w, h);

  // Grid for large preview
  if (!isSmall) {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, h - (i / 4) * h);
      ctx.lineTo(w, h - (i / 4) * h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((i / 4) * w, 0);
      ctx.lineTo((i / 4) * w, h);
      ctx.stroke();
    }
  }

  // Curve
  ctx.strokeStyle = '#4a9eff';
  ctx.lineWidth = isSmall ? 1.5 : 2;
  ctx.beginPath();

  const steps = isSmall ? 20 : 50;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let v = fn(t);
    v = Math.max(-0.15, Math.min(1.15, v)); // Clamp for display
    const x = pad + t * (w - 2 * pad);
    const y = h - pad - v * (h - 2 * pad);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/**
 * Format easing name for display
 */
function formatEasingName(name) {
  if (name === 'linear') return 'Linear (No Easing)';
  return name.replace(/ease(In|Out|InOut)?/, (_, type) => {
    if (type === 'In') return 'In ';
    if (type === 'Out') return 'Out ';
    if (type === 'InOut') return 'In-Out ';
    return '';
  });
}

/**
 * Build easing tabs and icon grid
 */
function buildEasingGrid() {
  easingContainerEl.innerHTML = '';

  // Create tabs
  const tabsDiv = document.createElement('div');
  tabsDiv.className = 'easing-tabs';

  for (const direction of Object.keys(easingDirections)) {
    const tab = document.createElement('button');
    tab.className = 'easing-tab' + (direction === activeDirection ? ' active' : '');
    tab.textContent = direction;
    tab.addEventListener('click', () => {
      activeDirection = direction;
      // Update selected easing to match new direction
      const currentType = getEasingType(selectedEasing);
      if (currentType) {
        selectedEasing = easingDirections[direction](currentType);
      }
      buildEasingGrid();
    });
    tabsDiv.appendChild(tab);
  }
  easingContainerEl.appendChild(tabsDiv);

  // Create icon grid for current direction
  const gridDiv = document.createElement('div');
  gridDiv.className = 'easing-grid';

  // Add Linear as first option (no easing / reset)
  const linearDiv = document.createElement('div');
  linearDiv.className = 'easing-icon' + (LINEAR_EASING === selectedEasing ? ' selected' : '');
  linearDiv.dataset.easing = LINEAR_EASING;

  const linearCanvas = document.createElement('canvas');
  linearCanvas.width = 48;
  linearCanvas.height = 32;
  drawCurve(linearCanvas, LINEAR_EASING, true);
  linearDiv.appendChild(linearCanvas);

  const linearLabel = document.createElement('div');
  linearLabel.className = 'easing-icon-label';
  linearLabel.textContent = 'Linear';
  linearDiv.appendChild(linearLabel);

  linearDiv.addEventListener('click', () => selectEasing(LINEAR_EASING));
  gridDiv.appendChild(linearDiv);

  // Add easing curves for current direction
  for (const type of easingTypes) {
    const easing = easingDirections[activeDirection](type);

    const iconDiv = document.createElement('div');
    iconDiv.className = 'easing-icon' + (easing === selectedEasing ? ' selected' : '');
    iconDiv.dataset.easing = easing;

    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 32;
    drawCurve(canvas, easing, true);
    iconDiv.appendChild(canvas);

    const labelDiv = document.createElement('div');
    labelDiv.className = 'easing-icon-label';
    labelDiv.textContent = type;
    iconDiv.appendChild(labelDiv);

    iconDiv.addEventListener('click', () => selectEasing(easing));
    gridDiv.appendChild(iconDiv);
  }

  easingContainerEl.appendChild(gridDiv);
  updatePreview();
}

/**
 * Extract curve type from easing name (e.g., "easeOutQuad" -> "Quad")
 */
function getEasingType(name) {
  for (const type of easingTypes) {
    if (name.includes(type)) return type;
  }
  return null;
}

/**
 * Select an easing
 */
function selectEasing(easing) {
  selectedEasing = easing;

  document.querySelectorAll('.easing-icon').forEach(el => {
    el.classList.toggle('selected', el.dataset.easing === easing);
  });

  updatePreview();
}

/**
 * Update large preview
 */
function updatePreview() {
  drawCurve(previewCanvasEl, selectedEasing, false);
  previewLabelEl.textContent = formatEasingName(selectedEasing);
}

/**
 * Initialize
 */
async function init() {
  buildEasingGrid();
  await refresh();

  inputSelectEl.addEventListener('change', onInputChange);
  applyBtnEl.addEventListener('click', onApply);
  refreshBtnEl.addEventListener('click', refresh);
}

/**
 * Refresh composition info and selected tools
 * Preserves current selections when possible
 * Also refreshes keyframes if a tool/input is selected
 */
async function refresh() {
  // Prevent concurrent refresh calls - skip if one is already in progress
  if (isRefreshing) return;
  isRefreshing = true;

  try {
    await doRefresh();
  } finally {
    isRefreshing = false;
  }
}

/**
 * Internal refresh implementation
 */
async function doRefresh() {
  // Don't show "Refreshing..." for background polls - it's distracting
  // Only update status if we're not in the middle of something
  const wasIdle = statusEl.textContent === 'Ready' || statusEl.textContent.startsWith('Refreshing') || statusEl.textContent.startsWith('Ready to apply');

  // Remember current selections
  const previousToolName = selectedTool?.name;
  const previousInputName = selectedInput;
  const previousToolNames = selectedTools.map(t => t.name).join(',');

  // Get comp info
  if (window.fusionEasing) {
    const info = await window.fusionEasing.getCompInfo();
    if (info.error) {
      compNameEl.textContent = 'Not connected';
      compTimeEl.textContent = '';
      showOverlay(info.hint || info.error);
      // Only update status if we were idle
      if (wasIdle) setStatus(info.error, 'error');
      return;
    }

    hideOverlay();
    compInfo = info;
    compNameEl.textContent = info.name;
    compTimeEl.textContent = info.page ? `Page: ${info.page}` : '';

    const tools = await window.fusionEasing.getSelectedTools();
    if (tools.error) {
      if (wasIdle) setStatus(tools.error, 'error');
      return;
    }

    selectedTools = tools;
  } else {
    compNameEl.textContent = 'Demo Mode';
    compTimeEl.textContent = 'Not connected to Resolve';
    selectedTools = [];
  }

  // OPTIMIZATION: Check if tool list actually changed before re-rendering
  const currentToolNames = selectedTools.map(t => t.name).join(',');
  const toolListChanged = currentToolNames !== previousToolNames;

  if (toolListChanged) {
    updateToolList();
  }

  // Determine if we should auto-select a tool
  // Auto-select when: exactly 1 tool selected AND (no previous selection OR previous tool is gone)
  const shouldAutoSelect = selectedTools.length === 1 &&
    (!previousToolName || !selectedTools.find(t => t.name === previousToolName));

  if (shouldAutoSelect && !isSelectingTool) {
    // Clear any stale state from previous tool before selecting new one
    if (previousToolName) {
      animatedInputs = [];
      selectedInput = null;
      keyframes = [];
      selectedFrames = [];
    }
    // Directly select the new tool - don't wait for next poll cycle
    await onToolSelect(selectedTools[0]);
  } else if (previousToolName) {
    const stillExists = selectedTools.find(t => t.name === previousToolName);
    if (stillExists) {
      // Tool still selected - keep the selection
      selectedTool = stillExists;

      // OPTIMIZATION: Only refresh keyframes if we have an input selected
      // Skip the expensive getAnimatedInputs call since tool hasn't changed
      if (previousInputName && window.fusionEasing) {
        await refreshKeyframesOnly(previousInputName);
      }
    } else {
      // Tool no longer selected and multiple tools or no tools - clear everything
      selectedTool = null;
      animatedInputs = [];
      selectedInput = null;
      keyframes = [];
      selectedFrames = [];
      inputSectionEl.style.display = 'none';
      keyframeSectionEl.style.display = 'none';
      if (toolListChanged) updateToolList();
      if (wasIdle) setStatus('Ready');
    }
  } else if (wasIdle && !isSelectingTool) {
    // No previous selection and not auto-selecting
    setStatus('Ready');
  }
}

/**
 * Refresh animated inputs and keyframes for the current tool/input
 * Updates dropdown text and timeline without losing selection
 */
async function refreshKeyframesAndInputs(inputName) {
  if (!selectedTool || !window.fusionEasing) return;

  // Refresh animated inputs to get updated keyframe counts
  const inputResult = await window.fusionEasing.getAnimatedInputs(selectedTool.name);
  if (!inputResult.error && inputResult.animatedInputs) {
    animatedInputs = inputResult.animatedInputs;

    // Update dropdown options with new keyframe counts
    for (const option of inputSelectEl.options) {
      if (option.value) {
        const input = animatedInputs.find(i => (i.id || i.name) === option.value);
        if (input) {
          option.textContent = `${input.name} (${input.keyframeCount} keyframes)`;
        }
      }
    }
  }

  // Refresh keyframes for the selected input
  if (inputName) {
    const result = await window.fusionEasing.getKeyframes(selectedTool.name, inputName);
    if (!result.error && result.keyframes) {
      const oldKeyframeCount = keyframes.length;
      const newKeyframes = result.keyframes;

      // Check if keyframes actually changed
      const keyframesChanged = newKeyframes.length !== oldKeyframeCount ||
        !newKeyframes.every((kf, i) => keyframes[i] && keyframes[i].frame === kf.frame);

      if (keyframesChanged) {
        keyframes = newKeyframes;

        // Preserve frame selections if they still exist
        selectedFrames = selectedFrames.filter(f => keyframes.find(kf => kf.frame === f));

        // Auto-select all if no selection
        if (selectedFrames.length === 0) {
          selectedFrames = keyframes.map(kf => kf.frame);
        }

        // Re-render timeline
        if (keyframes.length >= 2) {
          keyframeSectionEl.style.display = 'block';
          renderKeyframeTimeline();
        } else {
          keyframeSectionEl.style.display = 'none';
        }
      }
    }
  }
}

/**
 * Refresh only keyframes (not animated inputs) - OPTIMIZATION
 * Used when the same tool is still selected to skip expensive getAnimatedInputs call
 * Reduces Lua bridge calls by ~50% during normal polling
 */
async function refreshKeyframesOnly(inputName) {
  if (!selectedTool || !window.fusionEasing || !inputName) return;

  const result = await window.fusionEasing.getKeyframes(selectedTool.name, inputName);
  if (!result.error && result.keyframes) {
    const oldKeyframeCount = keyframes.length;
    const newKeyframes = result.keyframes;

    // Check if keyframes actually changed
    const keyframesChanged = newKeyframes.length !== oldKeyframeCount ||
      !newKeyframes.every((kf, i) => keyframes[i] && keyframes[i].frame === kf.frame);

    if (keyframesChanged) {
      keyframes = newKeyframes;

      // Preserve frame selections if they still exist
      selectedFrames = selectedFrames.filter(f => keyframes.find(kf => kf.frame === f));

      // Auto-select all if no selection
      if (selectedFrames.length === 0) {
        selectedFrames = keyframes.map(kf => kf.frame);
      }

      // Re-render timeline
      if (keyframes.length >= 2) {
        keyframeSectionEl.style.display = 'block';
        renderKeyframeTimeline();
      } else {
        keyframeSectionEl.style.display = 'none';
      }
    }
  }
}

/**
 * Update tool list
 */
function updateToolList() {
  toolListEl.innerHTML = '';

  if (selectedTools.length === 0) {
    toolListEl.innerHTML = '<div class="no-tools">No tools selected</div>';
    return;
  }

  for (const tool of selectedTools) {
    const div = document.createElement('div');
    div.className = 'tool-item' + (selectedTool?.name === tool.name ? ' selected' : '');
    div.innerHTML = `<span class="tool-name">${tool.name}</span><span class="tool-type">${tool.id}</span>`;
    div.addEventListener('click', () => onToolSelect(tool));
    toolListEl.appendChild(div);
  }
}

/**
 * Handle tool selection
 */
async function onToolSelect(tool) {
  // Prevent re-selection while already selecting (race condition with polling)
  if (isSelectingTool) return;
  isSelectingTool = true;

  selectedTool = tool;
  selectedInput = null;
  keyframes = [];
  selectedFrames = [];

  // IMMEDIATELY hide stale UI sections to prevent flash of old content
  inputSectionEl.style.display = 'none';
  keyframeSectionEl.style.display = 'none';

  updateToolList();

  if (!window.fusionEasing) {
    setStatus('Demo mode - no Resolve connection');
    isSelectingTool = false;
    return;
  }

  setStatus('Loading inputs...');
  const result = await window.fusionEasing.getAnimatedInputs(tool.name);

  if (result.error) {
    setStatus(result.error, 'error');
    inputSectionEl.style.display = 'none';
    keyframeSectionEl.style.display = 'none';
    isSelectingTool = false;
    return;
  }

  animatedInputs = result.animatedInputs || [];

  if (animatedInputs.length === 0) {
    setStatus('No animated inputs. Create keyframes first.', 'error');
    inputSectionEl.style.display = 'none';
    keyframeSectionEl.style.display = 'none';
    isSelectingTool = false;
    return;
  }

  inputSelectEl.innerHTML = '<option value="">Select an input...</option>';
  for (const input of animatedInputs) {
    const option = document.createElement('option');
    option.value = input.id || input.name;  // Use ID for lookup
    option.textContent = `${input.name} (${input.keyframeCount} keyframes)`;  // Use name for display
    inputSelectEl.appendChild(option);
  }

  inputSectionEl.style.display = 'block';
  keyframeSectionEl.style.display = 'none';

  // Auto-select if only one animated input
  if (animatedInputs.length === 1) {
    const singleInput = animatedInputs[0];
    inputSelectEl.value = singleInput.id || singleInput.name;
    await onInputChange(); // This will also auto-select keyframes if only 2
  } else {
    setStatus('Select an animated input');
  }

  isSelectingTool = false;
}

/**
 * Handle input selection
 */
async function onInputChange() {
  const inputName = inputSelectEl.value;

  if (!inputName) {
    selectedInput = null;
    keyframes = [];
    keyframeSectionEl.style.display = 'none';
    return;
  }

  selectedInput = inputName;
  selectedFrames = [];

  if (!window.fusionEasing) return;

  setStatus('Loading keyframes...');
  const result = await window.fusionEasing.getKeyframes(selectedTool.name, inputName);

  if (result.error) {
    setStatus(result.error, 'error');
    keyframeSectionEl.style.display = 'none';
    return;
  }

  keyframes = result.keyframes || [];

  if (keyframes.length < 2) {
    setStatus('Need at least 2 keyframes', 'error');
    keyframeSectionEl.style.display = 'none';
    return;
  }

  // Auto-select all keyframes
  selectedFrames = keyframes.map(kf => kf.frame);

  keyframeSectionEl.style.display = 'block';
  renderKeyframeTimeline();
  updateSelectionUI();
}

/**
 * Render keyframe timeline
 */
function renderKeyframeTimeline() {
  timelineTrackEl.innerHTML = '';
  if (keyframes.length === 0) return;

  const minFrame = keyframes[0].frame;
  const maxFrame = keyframes[keyframes.length - 1].frame;
  const range = maxFrame - minFrame;

  for (const kf of keyframes) {
    const pct = range > 0 ? ((kf.frame - minFrame) / range) * 100 : 50;

    const marker = document.createElement('div');
    marker.className = 'timeline-keyframe';
    marker.style.left = `${pct}%`;
    marker.title = `Frame ${kf.frame}\nValue: ${kf.value != null ? kf.value.toFixed(2) : 'N/A'}\nClick to toggle, Shift+click for range`;
    marker.dataset.frame = kf.frame;

    // Color based on selection
    if (selectedFrames.includes(kf.frame)) {
      // First and last selected get special colors
      if (kf.frame === selectedFrames[0]) {
        marker.classList.add('selected-first');
      } else if (kf.frame === selectedFrames[selectedFrames.length - 1]) {
        marker.classList.add('selected-last');
      } else {
        marker.classList.add('selected');
      }
    }

    marker.addEventListener('click', (e) => onKeyframeClick(kf.frame, e));
    timelineTrackEl.appendChild(marker);
  }

  timelineLabelsEl.innerHTML = `<span>${minFrame}</span><span>${maxFrame}</span>`;
  updateSelectionUI();
}

/**
 * Handle keyframe click
 * - Regular click: toggle single keyframe selection
 * - Shift+click: select range from last selected to clicked
 */
function onKeyframeClick(frame, event) {
  const isShiftClick = event && event.shiftKey;

  if (isShiftClick && selectedFrames.length > 0) {
    // Shift+click: select range from last clicked to this frame
    const lastSelected = selectedFrames[selectedFrames.length - 1];
    const allFrameNumbers = keyframes.map(kf => kf.frame);

    const startIdx = allFrameNumbers.indexOf(Math.min(lastSelected, frame));
    const endIdx = allFrameNumbers.indexOf(Math.max(lastSelected, frame));

    if (startIdx !== -1 && endIdx !== -1) {
      // Select all frames in range
      const rangeFrames = allFrameNumbers.slice(startIdx, endIdx + 1);
      // Merge with existing selection (add range, don't replace)
      for (const f of rangeFrames) {
        if (!selectedFrames.includes(f)) {
          selectedFrames.push(f);
        }
      }
      // Sort selected frames
      selectedFrames.sort((a, b) => a - b);
    }
  } else {
    // Regular click: toggle selection
    const idx = selectedFrames.indexOf(frame);
    if (idx !== -1) {
      // Deselect - but keep at least 2 selected
      if (selectedFrames.length > 2) {
        selectedFrames.splice(idx, 1);
      }
    } else {
      // Add to selection
      selectedFrames.push(frame);
      selectedFrames.sort((a, b) => a - b);
    }
  }

  renderKeyframeTimeline();
}

/**
 * Select all keyframes
 */
function selectAllKeyframes() {
  selectedFrames = keyframes.map(kf => kf.frame);
  renderKeyframeTimeline();
}

/**
 * Update selection UI
 */
function updateSelectionUI() {
  const numPairs = selectedFrames.length - 1;

  if (selectedFrames.length >= 2) {
    selectionHintEl.style.display = 'none';
    selectionInfoEl.style.display = 'flex';

    // Show selection range info
    if (selectionRangeEl) {
      const first = selectedFrames[0];
      const last = selectedFrames[selectedFrames.length - 1];
      if (selectedFrames.length === 2) {
        selectionRangeEl.textContent = `${first} → ${last}`;
      } else {
        selectionRangeEl.textContent = `${first} → ${last} (${selectedFrames.length} keyframes, ${numPairs} pairs)`;
      }
    }

    setStatus(`Ready to apply easing (${numPairs} pair${numPairs > 1 ? 's' : ''})`);
  } else if (selectedFrames.length === 1) {
    selectionHintEl.textContent = 'Select at least one more keyframe';
    selectionHintEl.style.display = 'block';
    selectionInfoEl.style.display = 'none';
    setStatus('Select more keyframes');
  } else {
    selectionHintEl.textContent = 'Click keyframes to select (Shift+click for range)';
    selectionHintEl.style.display = 'block';
    selectionInfoEl.style.display = 'none';
    setStatus('Select keyframes');
  }
}

/**
 * Apply easing
 */
async function onApply() {
  if (!selectedTool || !selectedInput) {
    setStatus('Select a tool and input first', 'error');
    return;
  }

  if (selectedFrames.length < 2) {
    setStatus('Select at least two keyframes', 'error');
    return;
  }

  if (!window.fusionEasing) {
    setStatus('Demo mode - cannot apply', 'error');
    return;
  }

  const numPairs = selectedFrames.length - 1;
  setStatus(`Applying to ${numPairs} pair${numPairs > 1 ? 's' : ''}...`);
  applyBtnEl.disabled = true;

  try {
    const result = await window.fusionEasing.applyEasing({
      toolName: selectedTool.name,
      inputName: selectedInput,
      easingType: selectedEasing,
      frames: selectedFrames, // Pass array of selected frames
    });

    if (result.error) {
      setStatus(result.error, 'error');
    } else {
      setStatus(result.message, 'success');
      await onInputChange(); // Refresh keyframes
    }
  } catch (e) {
    setStatus(e.message, 'error');
  } finally {
    applyBtnEl.disabled = false;
  }
}

/**
 * Set status
 */
function setStatus(message, type = 'info', onClick = null) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  
  // Handle clickable status
  if (onClick) {
    statusEl.classList.add('clickable');
    statusEl.onclick = onClick;
  } else {
    statusEl.classList.remove('clickable');
    statusEl.onclick = null;
  }
}

/**
 * Run debug diagnostics
 */
async function runDebug() {
  if (!window.fusionEasing || !window.fusionEasing.debugLuaBridge) {
    setStatus('Debug not available');
    return;
  }

  setStatus('Running diagnostics...');

  try {
    const result = await window.fusionEasing.debugLuaBridge();
    console.log('Debug results:', result);

    if (result.error) {
      setStatus(`Debug: ${result.error}`, 'error');
    } else {
      setStatus(`Debug: ${result.results.length} tests run - check console`, 'success');
    }

    // Log individual results
    if (result.results) {
      for (const r of result.results) {
        const status = r.status === 'ok' ? '✓' : r.status === 'error' ? '✗' : '?';
        let msg = `${status} ${r.test}`;
        if (r.value !== undefined) msg += `: ${r.value}`;
        if (r.error) msg += `: ${r.error}`;
        if (r.info) msg += `\n   ${r.info}`;
        console.log(msg);
      }
    }
  } catch (e) {
    setStatus(`Debug error: ${e.message}`, 'error');
    console.error('Debug error:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();

  // Debug button
  const debugBtn = document.getElementById('debug-btn');
  if (debugBtn) {
    debugBtn.addEventListener('click', runDebug);
  }

  // Select All button
  const selectAllBtn = document.getElementById('select-all-btn');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', selectAllKeyframes);
  }

  // Auto-size window to fit content
  function autoSizeWindow() {
    if (window.fusionEasing && window.fusionEasing.setWindowSize) {
      const container = document.querySelector('.container');
      const height = container ? container.scrollHeight : document.body.scrollHeight;
      const width = 380;
      const totalHeight = height + 50; // +50 for title bar and padding
      window.fusionEasing.setWindowSize(width, totalHeight);
    }
  }

  // Size after initial render and after content settles
  setTimeout(autoSizeWindow, 200);
  setTimeout(autoSizeWindow, 500);

  // Poll for changes - faster when focused, slower when not
  let pollInterval = null;
  let isFocused = true;
  const POLL_FOCUSED = 200;     // half a second when focused - responsive without overloading
  const POLL_UNFOCUSED = 200;  // half a second when not focused

  function updatePolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    const interval = isFocused ? POLL_FOCUSED : POLL_UNFOCUSED;
    pollInterval = setInterval(refresh, interval);
  }

  // Track focus state but keep polling
  document.addEventListener('visibilitychange', () => {
    isFocused = !document.hidden;
    updatePolling();
  });

  window.addEventListener('focus', () => {
    isFocused = true;
    updatePolling();
    refresh(); // Immediate refresh on focus
  });

  window.addEventListener('blur', () => {
    isFocused = false;
    updatePolling();
  });

  // Start polling
  updatePolling();
});
