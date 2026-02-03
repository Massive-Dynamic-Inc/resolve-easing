/**
 * Easing Functions
 * Standard easing curves for animation
 */

// Core easing functions - t is normalized time [0, 1]
export const easings = {
  // Linear
  linear: t => t,

  // Quadratic
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  // Cubic
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // Quartic
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => 1 - (--t) * t * t * t,
  easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

  // Sine
  easeInSine: t => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: t => Math.sin((t * Math.PI) / 2),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,

  // Exponential
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: t => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 
    ? Math.pow(2, 20 * t - 10) / 2 
    : (2 - Math.pow(2, -20 * t + 10)) / 2,

  // Circular
  easeInCirc: t => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: t => Math.sqrt(1 - (--t) * t),
  easeInOutCirc: t => t < 0.5 
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,

  // Back (overshoot)
  easeInBack: t => 2.70158 * t * t * t - 1.70158 * t * t,
  easeOutBack: t => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  easeInOutBack: t => {
    const c = 1.70158 * 1.525;
    return t < 0.5 
      ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2 
      : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
  },

  // Elastic
  easeInElastic: t => t === 0 ? 0 : t === 1 ? 1 
    : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI) / 3),
  easeOutElastic: t => t === 0 ? 0 : t === 1 ? 1 
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
  easeInOutElastic: t => t === 0 ? 0 : t === 1 ? 1 : t < 0.5
    ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5)) / 2
    : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5)) / 2 + 1,

  // Bounce
  easeOutBounce: t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeInBounce: t => 1 - easings.easeOutBounce(1 - t),
  easeInOutBounce: t => t < 0.5
    ? (1 - easings.easeOutBounce(1 - 2 * t)) / 2
    : (1 + easings.easeOutBounce(2 * t - 1)) / 2,
};

/**
 * Generate easing curve from simple in/out values (1-100)
 * Like Keyframe Wingman's interface
 */
export function generateCurve(inValue, outValue, steps = 100) {
  // Convert 1-100 to influence (0 = linear, 100 = extreme)
  const inInfluence = inValue / 100;
  const outInfluence = outValue / 100;
  
  // Generate points
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Custom bezier-like interpolation based on in/out values
    const y = customEase(t, inInfluence, outInfluence);
    points.push({ x: t, y });
  }
  return points;
}

/**
 * Custom easing based on in/out influence values
 */
function customEase(t, inInfluence, outInfluence) {
  // Blend between linear and curved based on influence
  const linear = t;
  
  // In influence affects the start of the curve
  const inCurve = Math.pow(t, 1 + inInfluence * 2);
  
  // Out influence affects the end of the curve  
  const outCurve = 1 - Math.pow(1 - t, 1 + outInfluence * 2);
  
  // Blend in and out influences
  // At t=0, use in curve. At t=1, use out curve.
  const blend = t;
  return inCurve * (1 - blend) + outCurve * blend;
}

/**
 * Get bezier control points for an easing function
 * Used for Fusion's spline system
 */
export function getControlPoints(easingName) {
  // Common bezier approximations for standard easings
  const presets = {
    linear: { p1: { x: 0.25, y: 0.25 }, p2: { x: 0.75, y: 0.75 } },
    easeInQuad: { p1: { x: 0.55, y: 0.085 }, p2: { x: 0.68, y: 0.53 } },
    easeOutQuad: { p1: { x: 0.25, y: 0.46 }, p2: { x: 0.45, y: 0.94 } },
    easeInOutQuad: { p1: { x: 0.455, y: 0.03 }, p2: { x: 0.515, y: 0.955 } },
    easeInCubic: { p1: { x: 0.55, y: 0.055 }, p2: { x: 0.675, y: 0.19 } },
    easeOutCubic: { p1: { x: 0.215, y: 0.61 }, p2: { x: 0.355, y: 1 } },
    easeInOutCubic: { p1: { x: 0.645, y: 0.045 }, p2: { x: 0.355, y: 1 } },
    // Add more as needed
  };
  
  return presets[easingName] || presets.linear;
}

export default easings;
