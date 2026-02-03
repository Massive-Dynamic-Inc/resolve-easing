/**
 * Resolve Easing - Main Process
 * Electron-based Workflow Integration Plugin
 * 
 * Milestone 1: Connection & Detection
 */

'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const resolve = require('./resolve');
const bridge = require('./bridge');

let mainWindow = null;

/**
 * Create the main window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 500,
    minWidth: 300,
    minHeight: 400,
    useContentSize: true,
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ============ IPC Handlers ============

/**
 * Get composition info
 */
ipcMain.handle('get-comp-info', async () => {
  const result = await resolve.getCurrentComp();
  
  if (result.error) {
    return {
      connected: false,
      error: result.error,
      hint: result.hint || null,
    };
  }

  return {
    connected: true,
    name: result.name,
    timeline: result.timeline,
  };
});

/**
 * Get all tools in comp
 */
ipcMain.handle('get-all-tools', async () => {
  const result = await resolve.getCurrentComp();
  if (result.error) return { error: result.error, tools: [] };

  const tools = await bridge.getAllTools(result.comp);
  return { tools };
});

/**
 * Get selected tools
 */
ipcMain.handle('get-selected-tools', async () => {
  const result = await resolve.getCurrentComp();
  if (result.error) return { error: result.error, tools: [] };

  const tools = await bridge.getSelectedTools(result.comp);
  return { tools };
});

/**
 * Get animated inputs for a tool
 */
ipcMain.handle('get-animated-inputs', async (event, toolName) => {
  const result = await resolve.getCurrentComp();
  if (result.error) return { error: result.error, inputs: [] };

  const inputs = await bridge.getAnimatedInputs(result.comp, toolName);
  return { inputs };
});

/**
 * Get all inputs for a tool
 */
ipcMain.handle('get-all-inputs', async (event, toolName) => {
  const result = await resolve.getCurrentComp();
  if (result.error) return { error: result.error, inputs: [] };

  const inputs = await bridge.getAllInputs(result.comp, toolName);
  return { inputs };
});

/**
 * Get keyframes for an input
 */
ipcMain.handle('get-keyframes', async (event, toolName, inputName) => {
  const result = await resolve.getCurrentComp();
  if (result.error) return { error: result.error, keyframes: [] };

  const keyframes = await bridge.getKeyframes(result.comp, toolName, inputName);
  return { keyframes };
});

/**
 * Refresh connection
 */
ipcMain.handle('refresh', async () => {
  return await resolve.initialize();
});
