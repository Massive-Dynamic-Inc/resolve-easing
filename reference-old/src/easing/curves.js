/**
 * Easing functions for animation curves.
 * All functions take t (0-1) and return the eased value (0-1).
 * 
 * These are pure math - testable without DaVinci Resolve.
 */

// Linear (no easing)
const linear = (t) => t;

// Quadratic
const easeInQuad = (t) => t * t;
const easeOutQuad = (t) => t * (2 - t);
const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

// Cubic
const easeInCubic = (t) => t * t * t;
const easeOutCubic = (t) => (--t) * t * t + 1;
const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

// Quartic
const easeInQuart = (t) => t * t * t * t;
const easeOutQuart = (t) => 1 - (--t) * t * t * t;
const easeInOutQuart = (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;

// Quintic
const easeInQuint = (t) => t * t * t * t * t;
const easeOutQuint = (t) => 1 + (--t) * t * t * t * t;
const easeInOutQuint = (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t;

// Sine
const easeInSine = (t) => 1 - Math.cos((t * Math.PI) / 2);
const easeOutSine = (t) => Math.sin((t * Math.PI) / 2);
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

// Exponential
const easeInExpo = (t) => t === 0 ? 0 : Math.pow(2, 10 * t - 10);
const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
const easeInOutExpo = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
};

// Circular
const easeInCirc = (t) => 1 - Math.sqrt(1 - t * t);
const easeOutCirc = (t) => Math.sqrt(1 - (--t) * t);
const easeInOutCirc = (t) => t < 0.5
  ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
  : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;

// Back (overshoot)
const easeInBack = (t, overshoot = 1.70158) => t * t * ((overshoot + 1) * t - overshoot);
const easeOutBack = (t, overshoot = 1.70158) => {
  t = t - 1;
  return t * t * ((overshoot + 1) * t + overshoot) + 1;
};
const easeInOutBack = (t, overshoot = 1.70158) => {
  const c = overshoot * 1.525;
  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
};

// Elastic
const easeInElastic = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
};
const easeOutElastic = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};
const easeInOutElastic = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const c = (2 * Math.PI) / 4.5;
  return t < 0.5
    ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c)) / 2
    : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c)) / 2 + 1;
};

// Bounce
const easeOutBounce = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};
const easeInBounce = (t) => 1 - easeOutBounce(1 - t);
const easeInOutBounce = (t) => t < 0.5
  ? (1 - easeOutBounce(1 - 2 * t)) / 2
  : (1 + easeOutBounce(2 * t - 1)) / 2;

// Registry of all easing functions
const easings = {
  linear,
  // Quad
  easeInQuad, easeOutQuad, easeInOutQuad,
  // Cubic
  easeInCubic, easeOutCubic, easeInOutCubic,
  // Quart
  easeInQuart, easeOutQuart, easeInOutQuart,
  // Quint
  easeInQuint, easeOutQuint, easeInOutQuint,
  // Sine
  easeInSine, easeOutSine, easeInOutSine,
  // Expo
  easeInExpo, easeOutExpo, easeInOutExpo,
  // Circ
  easeInCirc, easeOutCirc, easeInOutCirc,
  // Back
  easeInBack, easeOutBack, easeInOutBack,
  // Elastic
  easeInElastic, easeOutElastic, easeInOutElastic,
  // Bounce
  easeInBounce, easeOutBounce, easeInOutBounce,
};

/**
 * Get easing function by name
 * @param {string} name - Easing function name
 * @returns {Function} Easing function
 */
function getEasing(name) {
  if (!easings[name]) {
    throw new Error(`Unknown easing: ${name}`);
  }
  return easings[name];
}

/**
 * Apply easing to transform a value between start and end
 * @param {string} easingName - Name of easing function
 * @param {number} t - Progress (0-1)
 * @param {number} start - Start value
 * @param {number} end - End value
 * @returns {number} Eased value
 */
function applyEasing(easingName, t, start, end) {
  const easing = getEasing(easingName);
  const easedT = easing(Math.max(0, Math.min(1, t)));
  return start + (end - start) * easedT;
}

/**
 * Generate keyframe values with easing
 * @param {string} easingName - Name of easing function
 * @param {number} startFrame - Start frame
 * @param {number} endFrame - End frame
 * @param {number} startValue - Value at start
 * @param {number} endValue - Value at end
 * @param {number} [step=1] - Frame step
 * @returns {Array<{frame: number, value: number}>} Keyframes
 */
function generateKeyframes(easingName, startFrame, endFrame, startValue, endValue, step = 1) {
  const keyframes = [];
  const duration = endFrame - startFrame;
  
  for (let frame = startFrame; frame <= endFrame; frame += step) {
    const t = (frame - startFrame) / duration;
    const value = applyEasing(easingName, t, startValue, endValue);
    keyframes.push({ frame, value });
  }
  
  return keyframes;
}

/**
 * List all available easing names
 * @returns {string[]} Easing names
 */
function listEasings() {
  return Object.keys(easings);
}

/**
 * Group easings by type for UI
 * @returns {Object} Grouped easings
 */
function getEasingGroups() {
  return {
    'Basic': ['linear'],
    'Quad': ['easeInQuad', 'easeOutQuad', 'easeInOutQuad'],
    'Cubic': ['easeInCubic', 'easeOutCubic', 'easeInOutCubic'],
    'Quart': ['easeInQuart', 'easeOutQuart', 'easeInOutQuart'],
    'Quint': ['easeInQuint', 'easeOutQuint', 'easeInOutQuint'],
    'Sine': ['easeInSine', 'easeOutSine', 'easeInOutSine'],
    'Expo': ['easeInExpo', 'easeOutExpo', 'easeInOutExpo'],
    'Circ': ['easeInCirc', 'easeOutCirc', 'easeInOutCirc'],
    'Back': ['easeInBack', 'easeOutBack', 'easeInOutBack'],
    'Elastic': ['easeInElastic', 'easeOutElastic', 'easeInOutElastic'],
    'Bounce': ['easeInBounce', 'easeOutBounce', 'easeInOutBounce'],
  };
}

module.exports = {
  easings,
  getEasing,
  applyEasing,
  generateKeyframes,
  listEasings,
  getEasingGroups,
};
