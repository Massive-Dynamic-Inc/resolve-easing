/**
 * Preload Script - Context bridge between main and renderer
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Connection & Composition
  getCompInfo: () => ipcRenderer.invoke('get-comp-info'),
  
  // Tools
  getAllTools: () => ipcRenderer.invoke('get-all-tools'),
  getSelectedTools: () => ipcRenderer.invoke('get-selected-tools'),
  
  // Inputs
  getAnimatedInputs: (toolName) => ipcRenderer.invoke('get-animated-inputs', toolName),
  getAllInputs: (toolName) => ipcRenderer.invoke('get-all-inputs', toolName),
  
  // Keyframes
  getKeyframes: (toolName, inputName) => ipcRenderer.invoke('get-keyframes', toolName, inputName),
  
  // Utility
  refresh: () => ipcRenderer.invoke('refresh'),
});
