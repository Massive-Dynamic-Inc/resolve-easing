/**
 * Preload Script - Bridge between main and renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Composition
  getComp: () => ipcRenderer.invoke('get-comp'),
  getInputs: (toolName) => ipcRenderer.invoke('get-inputs', toolName),
  getKeyframes: (toolName, inputName) => ipcRenderer.invoke('get-keyframes', toolName, inputName),
  
  // Easing
  applyEasing: (params) => ipcRenderer.invoke('apply-easing', params),
  
  // Utility
  refresh: () => ipcRenderer.invoke('refresh'),
});
