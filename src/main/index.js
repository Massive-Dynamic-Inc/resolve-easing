/**
 * Resolve Easing - Main Process
 * Electron-based Workflow Integration Plugin
 */

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
    width: 400,
    height: 600,
    minWidth: 320,
    minHeight: 400,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    // Workflow Integration plugins are frameless
    frame: false,
    titleBarStyle: 'hidden',
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers

/**
 * Get current composition info
 */
ipcMain.handle('get-comp', async () => {
  const result = await resolve.getCurrentComp();
  if (result.error) {
    return { error: result.error };
  }
  
  // Get selected tools
  const tools = await bridge.getSelectedTools(result.comp);
  
  return {
    name: result.name,
    timeline: result.timeline,
    tools,
  };
});

/**
 * Get animated inputs for a tool
 */
ipcMain.handle('get-inputs', async (event, toolName) => {
  const result = await resolve.getCurrentComp();
  if (result.error) return { error: result.error };
  
  const inputs = await bridge.getAnimatedInputs(result.comp, toolName);
  return { inputs };
});

/**
 * Get keyframes for an input
 */
ipcMain.handle('get-keyframes', async (event, toolName, inputName) => {
  const result = await resolve.getCurrentComp();
  if (result.error) return { error: result.error };
  
  const keyframes = await bridge.getKeyframes(result.comp, toolName, inputName);
  return { keyframes };
});

/**
 * Apply easing to keyframes
 */
ipcMain.handle('apply-easing', async (event, { toolName, inputName, inValue, outValue }) => {
  const result = await resolve.getCurrentComp();
  if (result.error) return { error: result.error };
  
  // Get current keyframes
  const keyframes = await bridge.getKeyframes(result.comp, toolName, inputName);
  if (keyframes.length < 2) {
    return { error: 'Need at least 2 keyframes' };
  }
  
  // TODO: Apply easing curve to keyframes
  // This will modify the bezier handles between keyframes
  
  return { success: true, modified: keyframes.length };
});

/**
 * Refresh/reconnect to Resolve
 */
ipcMain.handle('refresh', async () => {
  return await resolve.initialize();
});
