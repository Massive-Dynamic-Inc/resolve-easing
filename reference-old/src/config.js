/**
 * Centralized configuration for the Fusion Easing Plugin
 */

'use strict';

module.exports = {
  // Set to true during development, false for production
  DEBUG: true,

  // Plugin identifier
  PLUGIN_ID: 'com.massive-dynamic.fusion-easing',

  // Polling intervals (ms)
  POLL_FOCUSED: 200,      // Responsive when user is active
  POLL_UNFOCUSED: 200,   // Save resources when backgrounded

  // Lua bridge settings
  LUA_BRIDGE_TIMEOUT: 5000,
  LUA_BRIDGE_WAIT: 150,
};
