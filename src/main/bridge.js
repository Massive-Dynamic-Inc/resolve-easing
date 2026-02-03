/**
 * Lua Bridge - Execute Fusion Lua code via file-based IPC
 * 
 * The WorkflowIntegration JS API doesn't expose all Fusion methods.
 * This bridge writes Lua code that executes in Fusion, with results
 * written to a temp file that we read back.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Lock to prevent concurrent Lua operations
let bridgeLock = false;
const LOCK_TIMEOUT = 5000;

/**
 * Execute Lua code in Fusion and return the result
 * @param {Object} comp - Fusion composition object
 * @param {string} luaCode - Lua code to execute (should return a string)
 * @returns {Promise<string|null>} - Result string or null on failure
 */
async function executeLua(comp, luaCode) {
  // Acquire lock
  const startWait = Date.now();
  while (bridgeLock) {
    if (Date.now() - startWait > LOCK_TIMEOUT) {
      console.error('[LuaBridge] Lock timeout');
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

    // Wait for file
    await sleep(150);

    // Read result
    if (fs.existsSync(resultFile)) {
      const content = fs.readFileSync(resultFile, 'utf8');
      cleanup(resultFile);
      return content;
    }

    return null;
  } catch (e) {
    console.error('[LuaBridge] Error:', e.message);
    return null;
  } finally {
    bridgeLock = false;
    cleanup(resultFile);
  }
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
    for name, inp in pairs(tool:GetInputList()) do
      if inp:GetExpression() or inp:GetConnectedOutput() then
        -- Skip expressions and connections
      elseif inp:GetKeyFrames() then
        local kf = inp:GetKeyFrames()
        if kf and #kf > 0 then
          table.insert(inputs, name)
        end
      end
    end
    return table.concat(inputs, ",")
  `;
  const result = await executeLua(comp, lua);
  return result ? result.split(',').filter(Boolean) : [];
}

/**
 * Get keyframes for a specific input
 */
async function getKeyframes(comp, toolName, inputName) {
  const lua = `
    local tool = comp:FindTool("${toolName}")
    if not tool then return "[]" end
    local inp = tool:FindMainInput(1)
    for name, i in pairs(tool:GetInputList()) do
      if name == "${inputName}" then inp = i break end
    end
    if not inp then return "[]" end
    local kf = inp:GetKeyFrames()
    if not kf then return "[]" end
    local result = {}
    for i, frame in ipairs(kf) do
      local val = inp[frame]
      table.insert(result, string.format('{"frame":%d,"value":%s}', frame, tostring(val or 0)))
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
 * Set keyframe value with easing
 */
async function setKeyframe(comp, toolName, inputName, frame, value, leftHandle, rightHandle) {
  const lua = `
    local tool = comp:FindTool("${toolName}")
    if not tool then return "error: tool not found" end
    local inp = nil
    for name, i in pairs(tool:GetInputList()) do
      if name == "${inputName}" then inp = i break end
    end
    if not inp then return "error: input not found" end
    
    comp:Lock()
    inp[${frame}] = ${value}
    -- TODO: Set bezier handles for easing
    comp:Unlock()
    
    return "ok"
  `;
  return await executeLua(comp, lua);
}

// Helpers
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanup(file) {
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch (e) { /* ignore */ }
}

module.exports = {
  executeLua,
  getSelectedTools,
  getAnimatedInputs,
  getKeyframes,
  setKeyframe,
};
