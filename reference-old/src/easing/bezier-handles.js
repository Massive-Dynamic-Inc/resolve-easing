/**
 * Bezier Handle Calculation for Fusion Splines
 *
 * Converts easing functions to bezier control points that can be
 * applied to existing keyframes in Fusion's BezierSpline format.
 *
 * ⚠️ EMPIRICAL FINDING (January 2026): Fusion uses RELATIVE handle offsets!
 *
 * Despite official docs showing what looks like absolute coordinates,
 * actual GetKeyFrames output shows negative LH X values (e.g., -11.67),
 * which only makes sense as relative offsets, not absolute frame positions.
 *
 * Fusion API format (SetKeyFrames/GetKeyFrames):
 * {
 *   [frame]: { value, LH: { offset_x, offset_y }, RH: { offset_x, offset_y } }
 * }
 *
 * Handle offset conventions:
 *   RH: positive X = to the right, positive Y = toward higher values
 *   LH: negative X = to the left, negative Y = toward lower values
 *
 * Example for linear easing from (33, 0) to (68, 1):
 *   [33] = { 0, RH = { 11.67, 0.333 } }   -- points up-right toward (68,1)
 *   [68] = { 1, LH = { -11.67, -0.333 } } -- points down-left toward (33,0)
 */

'use strict';

/**
 * Cubic bezier presets for common easings.
 * Format: [x1, y1, x2, y2] - control points for cubic-bezier(x1, y1, x2, y2)
 * 
 * These are normalized to the 0-1 range and get scaled to actual frame/value ranges.
 */
const BEZIER_PRESETS = {
  // Linear (no easing - straight line)
  linear: [0, 0, 1, 1],
  
  // Sine
  easeInSine: [0.12, 0, 0.39, 0],
  easeOutSine: [0.61, 1, 0.88, 1],
  easeInOutSine: [0.37, 0, 0.63, 1],
  
  // Quad
  easeInQuad: [0.11, 0, 0.5, 0],
  easeOutQuad: [0.5, 1, 0.89, 1],
  easeInOutQuad: [0.45, 0, 0.55, 1],
  
  // Cubic
  easeInCubic: [0.32, 0, 0.67, 0],
  easeOutCubic: [0.33, 1, 0.68, 1],
  easeInOutCubic: [0.65, 0, 0.35, 1],
  
  // Quart
  easeInQuart: [0.5, 0, 0.75, 0],
  easeOutQuart: [0.25, 1, 0.5, 1],
  easeInOutQuart: [0.76, 0, 0.24, 1],
  
  // Quint
  easeInQuint: [0.64, 0, 0.78, 0],
  easeOutQuint: [0.22, 1, 0.36, 1],
  easeInOutQuint: [0.83, 0, 0.17, 1],
  
  // Expo
  easeInExpo: [0.7, 0, 0.84, 0],
  easeOutExpo: [0.16, 1, 0.3, 1],
  easeInOutExpo: [0.87, 0, 0.13, 1],
  
  // Circ
  easeInCirc: [0.55, 0, 1, 0.45],
  easeOutCirc: [0, 0.55, 0.45, 1],
  easeInOutCirc: [0.85, 0, 0.15, 1],
  
  // Back (overshoot) - note: y values can exceed 0-1 range
  easeInBack: [0.6, -0.28, 0.735, 0.045],
  easeOutBack: [0.265, 0.955, 0.4, 1.275],
  easeInOutBack: [0.68, -0.55, 0.265, 1.55],
};

/**
 * Get bezier control points for an easing type
 * @param {string} easingName - Name of the easing function
 * @returns {number[]|null} [x1, y1, x2, y2] or null if not supported
 */
function getBezierPoints(easingName) {
  return BEZIER_PRESETS[easingName] || null;
}

/**
 * Check if an easing can be represented as a single cubic bezier
 * (Elastic and Bounce cannot - they need multiple segments)
 * @param {string} easingName 
 * @returns {boolean}
 */
function isSingleBezier(easingName) {
  return BEZIER_PRESETS.hasOwnProperty(easingName);
}

/**
 * Calculate Fusion bezier handles for a keyframe pair.
 *
 * Given two keyframes, calculates the RH (right handle) of the first
 * and the LH (left handle) of the second to produce the easing curve.
 *
 * Handles are RELATIVE offsets from their keyframe:
 * - RH: positive X = to the right, positive Y = upward in value
 * - LH: negative X = to the left, negative Y = downward in value
 *
 * @param {string} easingName - Easing function name
 * @param {number} frame1 - First keyframe frame
 * @param {number} value1 - First keyframe value
 * @param {number} frame2 - Second keyframe frame
 * @param {number} value2 - Second keyframe value
 * @returns {{rh1: {x: number, y: number}, lh2: {x: number, y: number}}|null}
 */
function calculateHandles(easingName, frame1, value1, frame2, value2) {
  const bezier = getBezierPoints(easingName);
  if (!bezier) return null;

  const [x1, y1, x2, y2] = bezier;

  const frameDelta = frame2 - frame1;
  const valueDelta = value2 - value1;

  // For linear easing, place handles at 1/3 along the line (as relative offsets)
  if (easingName === 'linear') {
    return {
      rh1: {
        x: frameDelta / 3,       // 1/3 of the way to next keyframe
        y: valueDelta / 3,       // 1/3 of the value change
      },
      lh2: {
        x: -frameDelta / 3,      // 1/3 back from keyframe (negative = left)
        y: -valueDelta / 3,      // 1/3 back in value (negative = toward start)
      },
    };
  }

  // Calculate absolute bezier control points first
  const p1_abs = {
    x: frame1 + frameDelta * x1,
    y: value1 + valueDelta * y1,
  };
  const p2_abs = {
    x: frame1 + frameDelta * x2,
    y: value1 + valueDelta * y2,
  };

  // Convert to RELATIVE offsets from each keyframe
  // RH of first keyframe: offset from (frame1, value1)
  const rh1 = {
    x: p1_abs.x - frame1,
    y: p1_abs.y - value1,
  };

  // LH of second keyframe: offset from (frame2, value2)
  const lh2 = {
    x: p2_abs.x - frame2,
    y: p2_abs.y - value2,
  };

  return { rh1, lh2 };
}

/**
 * Apply easing to a specific keyframe pair only.
 * Other keyframes are preserved unchanged.
 * 
 * @param {Object} existingKeyframes - Fusion keyframe table
 * @param {string} easingName - Easing to apply
 * @param {number} frame1 - First keyframe frame
 * @param {number} frame2 - Second keyframe frame
 * @returns {Object} Modified keyframe table with handles
 */
function applyEasingToKeyframePair(existingKeyframes, easingName, frame1, frame2) {
  const frames = Object.keys(existingKeyframes)
    .map(Number)
    .sort((a, b) => a - b);
  
  if (!frames.includes(frame1) || !frames.includes(frame2)) {
    throw new Error(`Keyframes at ${frame1} and ${frame2} must exist`);
  }
  
  if (frame1 >= frame2) {
    throw new Error('frame1 must be less than frame2');
  }
  
  // Clone all keyframes, preserving existing handles
  const result = {};
  for (const frame of frames) {
    const kf = existingKeyframes[frame];
    let value;
    if (Array.isArray(kf)) {
      value = kf[0];
    } else if (typeof kf === 'object' && kf.value !== undefined) {
      value = kf.value;
    } else if (typeof kf === 'object' && kf[0] !== undefined) {
      value = kf[0];
    } else {
      value = kf;
    }
    
    result[frame] = { value };
    
    // Preserve existing handles for other pairs
    const origKf = existingKeyframes[frame];
    if (origKf && origKf.LH) {
      result[frame].LH = Array.isArray(origKf.LH) ? origKf.LH : [origKf.LH.x, origKf.LH.y];
    }
    if (origKf && origKf.RH) {
      result[frame].RH = Array.isArray(origKf.RH) ? origKf.RH : [origKf.RH.x, origKf.RH.y];
    }
  }
  
  // Calculate and apply handles for the specific pair
  const v1 = result[frame1].value;
  const v2 = result[frame2].value;

  const handles = calculateHandles(easingName, frame1, v1, frame2, v2);

  if (handles) {
    // Set RH on first keyframe (replaces any existing)
    result[frame1].RH = [handles.rh1.x, handles.rh1.y];

    // Set LH on second keyframe (replaces any existing)
    result[frame2].LH = [handles.lh2.x, handles.lh2.y];
  }

  return result;
}

/**
 * Apply easing handles to ALL consecutive keyframe pairs.
 * 
 * Takes existing keyframe data and returns modified keyframes with
 * the appropriate bezier handles for the requested easing.
 * 
 * @param {Object} existingKeyframes - Fusion keyframe table { [frame]: { value, LH?, RH? } }
 * @param {string} easingName - Easing to apply
 * @returns {Object} Modified keyframe table with handles
 */
function applyEasingToKeyframes(existingKeyframes, easingName) {
  const frames = Object.keys(existingKeyframes)
    .map(Number)
    .sort((a, b) => a - b);
  
  if (frames.length < 2) {
    throw new Error('Need at least 2 keyframes to apply easing');
  }
  
  // Clone the keyframes
  const result = {};
  for (const frame of frames) {
    const kf = existingKeyframes[frame];
    // Handle both { value: x } and [x] formats
    // Use explicit check since value could be 0 (falsy)
    let value;
    if (Array.isArray(kf)) {
      value = kf[0];
    } else if (typeof kf === 'object' && kf.value !== undefined) {
      value = kf.value;
    } else if (typeof kf === 'object' && kf[0] !== undefined) {
      value = kf[0];
    } else {
      value = kf; // Direct value
    }
    result[frame] = { value };
  }
  
  // Apply handles between consecutive keyframe pairs
  for (let i = 0; i < frames.length - 1; i++) {
    const f1 = frames[i];
    const f2 = frames[i + 1];
    const v1 = result[f1].value;
    const v2 = result[f2].value;
    
    const handles = calculateHandles(easingName, f1, v1, f2, v2);
    
    if (handles) {
      // Set RH on first keyframe
      result[f1].RH = [handles.rh1.x, handles.rh1.y];
      
      // Set LH on second keyframe
      result[f2].LH = [handles.lh2.x, handles.lh2.y];
    }
  }
  
  return result;
}

/**
 * Convert our keyframe format to Fusion's expected format.
 *
 * EMPIRICAL FINDING: Despite the official docs showing what looks like absolute
 * coordinates, Fusion's SetKeyFrames/GetKeyFrames actually uses RELATIVE offsets:
 * - RH: positive X = frames to the right, positive Y = value increase
 * - LH: negative X = frames to the left, negative Y = value decrease
 *
 * Evidence: GetKeyFrames returns LH with negative X (e.g., -11.67), which only
 * makes sense as a relative offset, not an absolute frame position.
 *
 * @param {Object} keyframes - Our internal format { [frame]: { value, LH?, RH? } }
 * @returns {Object} Fusion-compatible format (also relative)
 */
function toFusionFormat(keyframes) {
  const result = {};

  for (const [frame, data] of Object.entries(keyframes)) {
    const frameNum = Number(frame);
    // Ensure value is a number
    const value = typeof data.value === 'number' ? data.value : Number(data.value) || 0;
    const entry = [value];

    // Pass through relative offsets directly - Fusion uses the same format
    if (data.LH && Array.isArray(data.LH)) {
      entry.LH = [Number(data.LH[0]) || 0, Number(data.LH[1]) || 0];
    }
    if (data.RH && Array.isArray(data.RH)) {
      entry.RH = [Number(data.RH[0]) || 0, Number(data.RH[1]) || 0];
    }

    result[frameNum] = entry;
  }

  return result;
}

/**
 * Parse Fusion's keyframe format to our internal format.
 *
 * EMPIRICAL FINDING: Fusion GetKeyFrames returns RELATIVE offsets, not absolute.
 * Evidence: LH values have negative X (e.g., -11.67), which only makes sense
 * as "11.67 frames to the left", not as an absolute frame position.
 *
 * @param {Object} fusionKeyframes - Fusion keyframe table (relative handle offsets)
 * @returns {Object} Normalized format { [frame]: { value, LH?, RH? } }
 */
function fromFusionFormat(fusionKeyframes) {
  const result = {};

  for (const [frame, data] of Object.entries(fusionKeyframes)) {
    const frameNum = Number(frame);

    // Extract the actual numeric value
    let value;
    if (Array.isArray(data)) {
      value = data[0];
    } else if (typeof data === 'object' && data !== null) {
      // Could be {value: X} or {value: X, LH: ..., RH: ...}
      value = data.value;
    } else {
      value = data;
    }

    // Ensure value is a number
    if (typeof value === 'object' && value !== null && value.value !== undefined) {
      value = value.value; // Unwrap if double-wrapped
    }
    if (typeof value !== 'number') {
      value = Number(value) || 0;
    }

    const entry = { value };

    // Pass through relative offsets directly - Fusion uses the same format
    if (data && data.LH) {
      const lh = Array.isArray(data.LH) ? data.LH : [data.LH.x, data.LH.y];
      entry.LH = [Number(lh[0]) || 0, Number(lh[1]) || 0];
    }
    if (data && data.RH) {
      const rh = Array.isArray(data.RH) ? data.RH : [data.RH.x, data.RH.y];
      entry.RH = [Number(rh[0]) || 0, Number(rh[1]) || 0];
    }

    result[frameNum] = entry;
  }

  return result;
}

/**
 * List easings that support single-bezier representation
 * @returns {string[]}
 */
function listSupportedEasings() {
  return Object.keys(BEZIER_PRESETS);
}

/**
 * Get easings grouped by type (only bezier-compatible ones)
 * @returns {Object}
 */
function getSupportedEasingGroups() {
  return {
    'Basic': ['linear'],
    'Sine': ['easeInSine', 'easeOutSine', 'easeInOutSine'],
    'Quad': ['easeInQuad', 'easeOutQuad', 'easeInOutQuad'],
    'Cubic': ['easeInCubic', 'easeOutCubic', 'easeInOutCubic'],
    'Quart': ['easeInQuart', 'easeOutQuart', 'easeInOutQuart'],
    'Quint': ['easeInQuint', 'easeOutQuint', 'easeInOutQuint'],
    'Expo': ['easeInExpo', 'easeOutExpo', 'easeInOutExpo'],
    'Circ': ['easeInCirc', 'easeOutCirc', 'easeInOutCirc'],
    'Back': ['easeInBack', 'easeOutBack', 'easeInOutBack'],
    // Note: Elastic and Bounce are NOT included - they can't be single beziers
  };
}

module.exports = {
  BEZIER_PRESETS,
  getBezierPoints,
  isSingleBezier,
  calculateHandles,
  applyEasingToKeyframePair,
  applyEasingToKeyframes,
  toFusionFormat,
  fromFusionFormat,
  listSupportedEasings,
  getSupportedEasingGroups,
};
