/**
 * Fusion Easing Plugin - Preload Script
 * Secure bridge between renderer and main process
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Listen for debug logs from main process
ipcRenderer.on('debug:log', (event, ...args) => {
  console.log('[main]', ...args);
});

contextBridge.exposeInMainWorld('fusionEasing', {
  // Composition info
  getCompInfo: () => ipcRenderer.invoke('fusion:getCompInfo'),

  // Page control
  openFusionPage: () => ipcRenderer.invoke('fusion:openFusionPage'),

  // Tool/input queries
  getSelectedTools: () => ipcRenderer.invoke('fusion:getSelectedTools'),
  getAnimatedInputs: (toolName) => ipcRenderer.invoke('fusion:getAnimatedInputs', toolName),
  getKeyframes: (toolName, inputName) => ipcRenderer.invoke('fusion:getKeyframes', toolName, inputName),

  // Apply easing
  applyEasing: (params) => ipcRenderer.invoke('fusion:applyEasing', params),

  // Debug/diagnostics
  debugLuaBridge: () => ipcRenderer.invoke('fusion:debugLuaBridge'),

  // Window control
  setWindowSize: (width, height) => ipcRenderer.invoke('window:setSize', width, height),
});
