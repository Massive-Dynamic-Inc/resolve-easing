/**
 * Simple structured logger for API calls
 * Sends logs to renderer DevTools console via IPC
 */

const { DEBUG } = require('../config');

// Get mainWindow reference for sending logs to renderer
let mainWindow = null;

function setMainWindow(win) {
  mainWindow = win;
}

function sendToRenderer(...args) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('debug:log', ...args);
  }
}

class Logger {
  constructor(context) {
    this.context = context;
  }

  debug(message, data = null) {
    if (DEBUG) {
      const logMsg = `[${this.context}] ${message}`;
      if (data !== null) {
        sendToRenderer(logMsg, data);
      } else {
        sendToRenderer(logMsg);
      }
    }
  }

  error(message, error = null) {
    const logMsg = `[${this.context}] ERROR: ${message}`;
    if (error !== null) {
      sendToRenderer(logMsg, error);
    } else {
      sendToRenderer(logMsg);
    }
  }

  apiCall(method, args = null) {
    if (DEBUG) {
      const argsStr = args ? JSON.stringify(args).slice(0, 100) : '';
      this.debug(`→ ${method}(${argsStr})`);
    }
  }

  apiResult(method, result) {
    if (DEBUG) {
      const summary = result === null ? 'null' :
                     result === undefined ? 'undefined' :
                     typeof result === 'object' ? `{${Object.keys(result).length} keys}` :
                     String(result).slice(0, 50);
      this.debug(`← ${method}: ${summary}`);
    }
  }
}

module.exports = Logger;
module.exports.setMainWindow = setMainWindow;
