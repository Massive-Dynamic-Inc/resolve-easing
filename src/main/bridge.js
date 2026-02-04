/**
 * Lua Bridge - Execute Fusion Lua code via file-based IPC
 * 
 * The WorkflowIntegration JS API doesn't expose all Fusion methods.
 * This bridge writes Lua code that executes in Fusion, with results
 * written to a temp file that we read back.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Lock to prevent concurrent Lua operations
let bridgeLock = false;
const LOCK_TIMEOUT = 5000;
const RESULT_WAIT_MS = 150;

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clean up temp file
 */
function cleanup(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

/**
 * Execute Lua code in Fusion and return the result
 * @param {Object} comp - Fusion composition object
 * @param {string} luaCode - Lua code to execute (should return a string)
 * @returns {Promise<string|null>} - Result string or null on failure
 */
async function executeLua(comp, luaCode) {
  // Acquire lock with timeout
  const startWait = Date.now();
  while (bridgeLock) {
    if (Date.now() - startWait > LOCK_TIMEOUT) {
      console.error('[Bridge] Lock timeout');
      return null;
    }
    await sleep(50);
  }
  bridgeLock = true;

  // Unique temp file for this operation
  const id = crypto.randomBytes(8).toString('hex');
  const resultFile = path.join(os.tmpdir(), `resolve_easing_${id}.json`);

  try {
    // Wrap Lua code to write result to file
    const wrappedLua = `
      local __result = (function()
        ${luaCode}
      end)()
      local __f = io.open("${resultFile.replace(/\\/g, '/')}", "w")
      if __f then
        __f:write(__result or "")
        __f:close()
      end
    `;

    // Execute (throws but code still runs)
    try {
      await comp.Execute(wrappedLua);
    } catch (e) {
      // Expected - Execute throws but Lua still executes
    }

    // Wait for file to be written
    await sleep(RESULT_WAIT_MS);

    // Read result
    if (fs.existsSync(resultFile)) {
      const content = fs.readFileSync(resultFile, 'utf8');
      cleanup(resultFile);
      return content;
    }

    return null;
  } catch (e) {
    console.error('[Bridge] Error:', e.message);
    return null;
  } finally {
    bridgeLock = false;
    cleanup(resultFile);
  }
}

/**
 * Get all tools in the composition
 */
async function getAllTools(comp) {
  const lua = `
    local tools = comp:GetToolList(false)
    local names = {}
    for i, tool in ipairs(tools) do
      table.insert(names, tool.Name)
    end
    return table.concat(names, ",")
  `;
  const result = await executeLua(comp, lua);
  return result ? result.split(',').filter(Boolean) : [];
}

/**
 * Get selected tools in Fusion
 */
async function getSelectedTools(comp) {
  const lua = `
    local tools = comp:GetToolList(true)
    local names = {}
    for i, tool in ipairs(tools) do
      table.insert(names, tool.Name)
    end
    return table.concat(names, ",")
  `;
  const result = await executeLua(comp, lua);
  return result ? result.split(',').filter(Boolean) : [];
}

/**
 * Get animated inputs for a tool
 */
async function getAnimatedInputs(comp, toolName) {
  const lua = `
    local tool = comp:FindTool("${toolName}")
    if not tool then return "" end
    local inputs = {}
    local inputList = tool:GetInputList()
    for _, inp in pairs(inputList) do
      local kf = inp:GetKeyFrames()
      if kf and type(kf) == "table" then
        local count = 0
        for _ in pairs(kf) do count = count + 1 end
        if count > 0 then
          -- Get the input's ID/Name
          local inputName = inp:GetAttrs().INPS_ID or inp.Name or "Unknown"
          table.insert(inputs, inputName)
        end
      end
    end
    return table.concat(inputs, ",")
  `;
  const result = await executeLua(comp, lua);
  return result ? result.split(',').filter(Boolean) : [];
}

/**
 * Get all inputs for a tool (animated or not)
 */
async function getAllInputs(comp, toolName) {
  const lua = `
    local tool = comp:FindTool("${toolName}")
    if not tool then return "" end
    local inputs = {}
    for name, inp in pairs(tool:GetInputList()) do
      -- Skip internal inputs
      if not name:match("^__") then
        table.insert(inputs, name)
      end
    end
    return table.concat(inputs, ",")
  `;
  const result = await executeLua(comp, lua);
  return result ? result.split(',').filter(Boolean) : [];
}

/**
 * Get keyframes for a specific input
 * Returns array of { frame, value }
 */
async function getKeyframes(comp, toolName, inputName) {
  const lua = `
    local tool = comp:FindTool("${toolName}")
    if not tool then return "[]" end
    local inp = nil
    for _, i in pairs(tool:GetInputList()) do
      local id = i:GetAttrs().INPS_ID or i.Name or ""
      if id == "${inputName}" then inp = i break end
    end
    if not inp then return "[]" end
    local kf = inp:GetKeyFrames()
    if not kf or type(kf) ~= "table" then return "[]" end
    local result = {}
    for _, frame in pairs(kf) do
      local val = inp[frame]
      -- Handle different value types
      local valStr
      if type(val) == "number" then
        valStr = string.format("%.6f", val)
      elseif type(val) == "table" then
        valStr = string.format("%.6f", val[1] or 0)
      else
        valStr = tostring(val or 0)
      end
      table.insert(result, string.format('{"frame":%d,"value":%s}', frame, valStr))
    end
    return "[" .. table.concat(result, ",") .. "]"
  `;
  const result = await executeLua(comp, lua);
  try {
    return JSON.parse(result || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * Check if an input has keyframes
 */
async function hasKeyframes(comp, toolName, inputName) {
  const lua = `
    local tool = comp:FindTool("${toolName}")
    if not tool then return "false" end
    local inp = nil
    for name, i in pairs(tool:GetInputList()) do
      if name == "${inputName}" then inp = i break end
    end
    if not inp then return "false" end
    local kf = inp:GetKeyFrames()
    return (kf and #kf > 0) and "true" or "false"
  `;
  const result = await executeLua(comp, lua);
  return result === 'true';
}

module.exports = {
  executeLua,
  getAllTools,
  getSelectedTools,
  getAnimatedInputs,
  getAllInputs,
  getKeyframes,
  hasKeyframes,
};
