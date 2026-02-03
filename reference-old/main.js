/**
 * Fusion Easing Plugin - Main Process (Electron)
 * Based on official SamplePlugin pattern
 */

'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const WorkflowIntegration = require('./WorkflowIntegration.node');
const Logger = require('./src/api/logger');
const { setMainWindow } = require('./src/api/logger');

const config = require('./src/config');
const { DEBUG, PLUGIN_ID } = config;

// Cached objects (lazy initialized)
let resolveObj = null;
let mainWindow = null;

// Lock to prevent concurrent Lua operations
let luaBridgeLock = false;
const LOCK_TIMEOUT = 5000;

/**
 * Initialize Resolve interface (lazy, on first API call)
 */
async function getResolve() {
  if (!resolveObj) {
    const isSuccess = await WorkflowIntegration.Initialize(PLUGIN_ID);
    if (!isSuccess) {
      console.error('Failed to initialize Resolve interface');
      return null;
    }

    resolveObj = await WorkflowIntegration.GetResolve();
    if (!resolveObj) {
      console.error('Failed to get Resolve object');
      return null;
    }
  }
  return resolveObj;
}

/**
 * Execute Lua code and get the result via file bridge.
 * Uses unique temp files to avoid race conditions.
 */
async function executeLuaWithBridge(comp, luaCode) {
  // Wait for lock with timeout
  const startWait = Date.now();
  while (luaBridgeLock) {
    if (Date.now() - startWait > LOCK_TIMEOUT) {
      console.error('[executeLuaWithBridge] Lua bridge lock timeout');
      return null;
    }
    await new Promise(r => setTimeout(r, 50));
  }

  luaBridgeLock = true;

  // Generate unique temp file for this operation
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const bridgeFile = path.join(os.tmpdir(), `fusion_easing_${uniqueId}.json`);

  try {
    // Build Lua code that writes to our unique file
    const wrappedLua = `
      local __result = (function()
        ${luaCode}
      end)()
      local __f = io.open("${bridgeFile.replace(/\\/g, '/')}", "w")
      if __f then
        __f:write(__result or "")
        __f:close()
      end
    `;

    // Execute Lua (will throw but code still runs)
    try {
      await comp.Execute(wrappedLua);
    } catch (e) {
      // Expected - Execute throws but Lua still runs
    }

    // Wait for file to be written
    await new Promise(r => setTimeout(r, 150));

    // Read result from file
    if (fs.existsSync(bridgeFile)) {
      const content = fs.readFileSync(bridgeFile, 'utf8');
      try { fs.unlinkSync(bridgeFile); } catch (e) { /* ignore */ }
      return content;
    }

    // Only log errors for non-polling operations
    return null;
  } catch (e) {
    console.error('[executeLuaWithBridge] failed', e);
    return null;
  } finally {
    luaBridgeLock = false;
    try { if (fs.existsSync(bridgeFile)) fs.unlinkSync(bridgeFile); } catch (e) { /* ignore */ }
  }
}

/**
 * Get Fusion composition from current timeline item
 */
async function getFusionComp() {
  const logger = new Logger('getFusionComp');

  try {
    const resolve = await getResolve();
    if (!resolve) return { error: 'No resolve object' };

    const projectManager = await resolve.GetProjectManager();
    if (!projectManager) return { error: 'No project manager' };

    const project = await projectManager.GetCurrentProject();
    if (!project) return { error: 'No current project' };

    const timeline = await project.GetCurrentTimeline();
    if (!timeline) return { error: 'No current timeline' };

    const currentItem = await timeline.GetCurrentVideoItem();
    if (!currentItem) return { error: 'No video item under playhead' };

    const compCount = await currentItem.GetFusionCompCount();
    if (!compCount || compCount < 1) return { error: 'No Fusion comp on this clip' };

    const compNames = await currentItem.GetFusionCompNameList();
    if (!compNames || compNames.length < 1) return { error: 'No Fusion comp names' };

    const comp = await currentItem.LoadFusionCompByName(compNames[0]);
    if (!comp) return { error: 'Failed to load Fusion comp' };

    return comp;
  } catch (e) {
    logger.error('Exception in getFusionComp', e);
    return { error: `getFusionComp exception: ${e.message}` };
  }
}

/**
 * Create the browser window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 600, // Initial size, will auto-resize
    useContentSize: true,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.on('close', () => app.quit());
  mainWindow.loadFile('index.html');

  // Set mainWindow for logger to send debug messages to renderer
  setMainWindow(mainWindow);

  // Auto-open DevTools in debug mode
  if (DEBUG) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// ============ IPC Handlers ============

ipcMain.handle('fusion:getCompInfo', async () => {
  try {
    const resolve = await getResolve();
    if (!resolve) return { error: 'Cannot connect to Resolve' };

    const currentPage = await resolve.GetCurrentPage();

    const projectManager = await resolve.GetProjectManager();
    const project = projectManager ? await projectManager.GetCurrentProject() : null;
    const timeline = project ? await project.GetCurrentTimeline() : null;

    if (!timeline) {
      return {
        error: 'No timeline open',
        page: currentPage,
        hint: 'Open a timeline first'
      };
    }

    const currentItem = await timeline.GetCurrentVideoItem();
    if (!currentItem) {
      return {
        error: 'No clip under playhead',
        page: currentPage,
        hint: 'Move playhead over a clip'
      };
    }

    const compCount = await currentItem.GetFusionCompCount();
    if (!compCount || compCount < 1) {
      return {
        error: 'No Fusion comp on this clip',
        page: currentPage,
        hint: 'Add a Fusion composition to this clip'
      };
    }

    if (currentPage !== 'fusion') {
      return {
        error: `Open Fusion page (currently on ${currentPage || 'unknown'})`,
        page: currentPage,
        hint: 'Switch to Fusion page to edit keyframes',
        canSwitch: true
      };
    }

    const compNames = await currentItem.GetFusionCompNameList();

    return {
      name: compNames[0] || 'Fusion Comp',
      page: currentPage,
      connected: true,
    };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('fusion:openFusionPage', async () => {
  try {
    const resolve = await getResolve();
    if (!resolve) return { error: 'Cannot connect to Resolve' };

    const success = await resolve.OpenPage('fusion');
    return { success };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('fusion:getSelectedTools', async () => {
  // Note: This is polled frequently, so we minimize logging here
  try {
    const resolve = await getResolve();
    if (!resolve) return { error: 'No Resolve connection' };

    const currentPage = await resolve.GetCurrentPage();
    if (currentPage !== 'fusion') {
      return { error: 'Switch to Fusion page first', canSwitch: true };
    }

    const comp = await getFusionComp();
    if (comp.error) return comp;

    // Use Lua bridge to get SELECTED tools only
    const luaCode = `
      local tools = comp:GetToolList(true)
      local items = {}
      for i, tool in ipairs(tools) do
        local attrs = tool:GetAttrs()
        local name = (attrs.TOOLS_Name or ""):gsub('"', '\\\\"')
        local regid = (attrs.TOOLS_RegID or "Unknown"):gsub('"', '\\\\"')
        items[i] = '{"id":"' .. name .. '","name":"' .. name .. '","type":"' .. regid .. '"}'
      end
      return "[" .. table.concat(items, ",") .. "]"
    `;

    const result = await executeLuaWithBridge(comp, luaCode);
    if (!result) {
      return { error: 'Failed to get tools via Lua bridge' };
    }

    try {
      const tools = JSON.parse(result);
      return tools;
    } catch (e) {
      return { error: 'Failed to parse tool data' };
    }
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('fusion:getAnimatedInputs', async (event, toolName) => {
  const logger = new Logger('getAnimatedInputs');

  try {
    const comp = await getFusionComp();
    if (comp.error) {
      logger.error('getFusionComp failed:', comp.error);
      return comp;
    }

    const escapedToolName = toolName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    // Test that Lua execution works
    const testLua = `return "lua_ok"`;
    const testResult = await executeLuaWithBridge(comp, testLua);
    if (!testResult) {
      return { error: 'Lua bridge not working - test failed' };
    }

    // Find the tool
    const findToolLua = `
      if not comp then return "no_comp" end
      local tool = comp:FindTool("${escapedToolName}")
      if not tool then return "tool_not_found" end
      return "tool_found"
    `;
    const findResult = await executeLuaWithBridge(comp, findToolLua);
    if (findResult === 'no_comp') {
      return { error: 'Lua: comp not available' };
    }
    if (findResult === 'tool_not_found') {
      return { error: `Tool not found: ${toolName}` };
    }

    // Now get animated inputs
    const luaCode = `
      local tool = comp:FindTool("${escapedToolName}")
      local inputs = tool:GetInputList()
      local items = {}
      local inputCount = 0

      for idx, input in pairs(inputs) do
        inputCount = inputCount + 1

        -- Get the actual input ID from the input's attributes
        local inputAttrs = input:GetAttrs()
        local inputID = inputAttrs and inputAttrs.INPS_ID or tostring(idx)
        local inputName = inputAttrs and inputAttrs.INPS_Name or inputID

        local ok, splineOutput = pcall(function() return input:GetConnectedOutput() end)
        if ok and splineOutput then
          local ok2, spline = pcall(function() return splineOutput:GetTool() end)
          if ok2 and spline then
            -- Check the tool type - we only want BezierSpline modifiers or Path tools
            -- NOTE: All tools have GetKeyFrames(), but only BezierSpline returns actual keyframe data
            -- Other tools return their valid frame extent (start/end), which is NOT animation data
            local splineAttrs = spline:GetAttrs()
            local splineType = splineAttrs and splineAttrs.TOOLS_RegID or "unknown"

            -- Skip if not a BezierSpline or Path tool
            if splineType ~= "BezierSpline" and splineType ~= "PolyPath" and splineType ~= "BezierPath" then
              -- Not an animation modifier, skip this input
            else
              -- Handle Path tools (for Point inputs like Center)
              if splineType == "PolyPath" or splineType == "BezierPath" then
                local pathInputs = spline:GetInputList()
                local foundSpline = false
                for pname, pinput in pairs(pathInputs) do
                  local pout = pinput:GetConnectedOutput()
                  if pout then
                    local ptool = pout:GetTool()
                    if ptool then
                      local ptoolAttrs = ptool:GetAttrs()
                      local ptoolType = ptoolAttrs and ptoolAttrs.TOOLS_RegID or ""
                      if ptoolType == "BezierSpline" then
                        spline = ptool
                        foundSpline = true
                        break
                      end
                    end
                  end
                end
                if not foundSpline then
                  spline = nil -- No BezierSpline found on this Path
                end
              end

              if spline then
                local ok3, keyframes = pcall(function() return spline:GetKeyFrames() end)
                if ok3 and keyframes then
                  local frameCount = 0
                  local minFrame, maxFrame = nil, nil

                  -- BezierSpline:GetKeyFrames() returns { [frame] = {value, LH, RH}, ... }
                  -- Keys are frame times, values are keyframe data
                  for frame, data in pairs(keyframes) do
                    frameCount = frameCount + 1
                    local f = tonumber(frame)
                    if f then
                      if not minFrame or f < minFrame then minFrame = f end
                      if not maxFrame or f > maxFrame then maxFrame = f end
                    end
                  end

                  if frameCount >= 2 then
                    -- Use inputID for lookups, inputName for display
                    local id = tostring(inputID):gsub('"', '\\\\"')
                    local display = tostring(inputName):gsub('"', '\\\\"')
                    table.insert(items, '{"id":"' .. id ..
                      '","name":"' .. display ..
                      '","keyframeCount":' .. frameCount ..
                      ',"startFrame":' .. (minFrame or 0) ..
                      ',"endFrame":' .. (maxFrame or 0) .. '}')
                  end
                end
              end
            end
          end
        end
      end

      return '{"animatedInputs":[' .. table.concat(items, ",") .. '],"inputCount":' .. inputCount .. '}'
    `;

    const result = await executeLuaWithBridge(comp, luaCode);
    if (!result) {
      return { error: 'Failed to get animated inputs (Lua returned null)' };
    }

    try {
      const parsed = JSON.parse(result);
      if (parsed.error) return parsed;
      return parsed;
    } catch (e) {
      logger.error('Parse error:', e, 'Raw:', result.substring(0, 200));
      return { error: 'Failed to parse input data' };
    }
  } catch (e) {
    logger.error('getAnimatedInputs failed', e);
    return { error: e.message };
  }
});

ipcMain.handle('fusion:getKeyframes', async (event, toolName, inputName) => {
  const logger = new Logger('getKeyframes');

  try {
    const comp = await getFusionComp();
    if (comp.error) return comp;

    const escapedToolName = toolName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const escapedInputName = inputName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    const luaCode = `
      local function toJSON(obj)
        local t = type(obj)
        if t == "nil" then return "null"
        elseif t == "boolean" then return obj and "true" or "false"
        elseif t == "number" then
          if obj ~= obj then return "null" end
          return tostring(obj)
        elseif t == "string" then return '"' .. obj:gsub('"', '\\\\"') .. '"'
        elseif t == "table" then
          local isArray = true
          local maxIndex = 0
          for k, v in pairs(obj) do
            if type(k) == "number" and k > 0 and math.floor(k) == k then
              maxIndex = math.max(maxIndex, k)
            else
              isArray = false
              break
            end
          end
          if isArray and maxIndex > 0 then
            local items = {}
            for i = 1, maxIndex do items[i] = toJSON(obj[i]) end
            return "[" .. table.concat(items, ",") .. "]"
          else
            local items = {}
            for k, v in pairs(obj) do
              local key = type(k) == "string" and k or tostring(k)
              table.insert(items, '"' .. key:gsub('"', '\\\\"') .. '":' .. toJSON(v))
            end
            return "{" .. table.concat(items, ",") .. "}"
          end
        else
          return '"[' .. t .. ']"'
        end
      end

      local tool = comp:FindTool("${escapedToolName}")
      if not tool then return '{"error":"Tool not found"}' end

      -- Find input by iterating and matching INPS_ID
      local inputs = tool:GetInputList()
      local input = nil
      for idx, inp in pairs(inputs) do
        local attrs = inp:GetAttrs()
        if attrs and attrs.INPS_ID == "${escapedInputName}" then
          input = inp
          break
        end
      end

      if not input then return '{"error":"Input not found: ${escapedInputName}"}' end

      local splineOutput = input:GetConnectedOutput()
      if not splineOutput then return '{"error":"Input not animated"}' end

      local spline = splineOutput:GetTool()
      if not spline then return '{"error":"No spline found"}' end

      -- Check if this is a Path tool (for Point inputs like Center)
      -- Path tools return frame times as a list, not full keyframe data
      -- We need to find the actual BezierSpline connected to the Path's inputs
      local splineAttrs = spline:GetAttrs()
      local splineType = splineAttrs and splineAttrs.TOOLS_RegID or "unknown"

      if splineType == "PolyPath" or splineType == "BezierPath" then
        -- Find the BezierSpline connected to the Path's inputs (e.g., Displacement)
        local pathInputs = spline:GetInputList()
        local foundSpline = nil
        for pname, pinput in pairs(pathInputs) do
          local pout = pinput:GetConnectedOutput()
          if pout then
            local ptool = pout:GetTool()
            if ptool then
              local ptoolAttrs = ptool:GetAttrs()
              local ptoolType = ptoolAttrs and ptoolAttrs.TOOLS_RegID or ""
              if ptoolType == "BezierSpline" then
                foundSpline = ptool
                break
              end
            end
          end
        end
        if foundSpline then
          spline = foundSpline
        else
          return '{"error":"Path has no BezierSpline modifier"}'
        end
      end

      -- BezierSpline:GetKeyFrames() returns a table with frame times as KEYS:
      -- { [0.0] = { value, LH={x,y}, RH={x,y} }, [38.0] = {...}, ... }
      local keyframes = spline:GetKeyFrames()
      if not keyframes then return '{"keyframes":[]}' end

      local items = {}
      for frame, data in pairs(keyframes) do
        local kf = '{"frame":' .. tostring(frame)
        if type(data) == "table" then
          -- Value is first element of the subtable
          if data[1] ~= nil then
            kf = kf .. ',"value":' .. toJSON(data[1])
          end
          if data.LH then
            kf = kf .. ',"LH":' .. toJSON(data.LH)
          end
          if data.RH then
            kf = kf .. ',"RH":' .. toJSON(data.RH)
          end
        else
          kf = kf .. ',"value":' .. toJSON(data)
        end
        kf = kf .. '}'
        table.insert(items, kf)
      end

      return '{"keyframes":[' .. table.concat(items, ",") .. ']}'
    `;

    const result = await executeLuaWithBridge(comp, luaCode);
    if (!result) {
      return { error: 'Failed to get keyframes' };
    }

    try {
      const parsed = JSON.parse(result);
      if (parsed.error) return parsed;

      if (parsed.keyframes) {
        parsed.keyframes = parsed.keyframes
          .map(kf => ({
            frame: kf.frame,
            value: kf.value,
            hasLH: !!kf.LH,
            hasRH: !!kf.RH,
            LH: kf.LH,
            RH: kf.RH,
          }))
          .sort((a, b) => a.frame - b.frame);
      }

      return parsed;
    } catch (e) {
      return { error: 'Failed to parse keyframe data' };
    }
  } catch (e) {
    logger.error('getKeyframes failed', e);
    return { error: e.message };
  }
});

ipcMain.handle('fusion:applyEasing', async (event, params) => {
  const logger = new Logger('applyEasing');
  const { toolName, inputName, easingType, frames, frame1, frame2 } = params;

  try {
    const comp = await getFusionComp();
    if (comp.error) return comp;

    const escapedToolName = toolName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const escapedInputName = inputName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    // Step 1: Get existing keyframes via Lua
    const getKeyframesLua = `
      local function toJSON(obj)
        local t = type(obj)
        if t == "nil" then return "null"
        elseif t == "boolean" then return obj and "true" or "false"
        elseif t == "number" then
          if obj ~= obj then return "null" end
          return tostring(obj)
        elseif t == "string" then return '"' .. obj:gsub('"', '\\\\"') .. '"'
        elseif t == "table" then
          local isArray = true
          local maxIndex = 0
          for k, v in pairs(obj) do
            if type(k) == "number" and k > 0 and math.floor(k) == k then
              maxIndex = math.max(maxIndex, k)
            else
              isArray = false
              break
            end
          end
          if isArray and maxIndex > 0 then
            local items = {}
            for i = 1, maxIndex do items[i] = toJSON(obj[i]) end
            return "[" .. table.concat(items, ",") .. "]"
          else
            local items = {}
            for k, v in pairs(obj) do
              local key = type(k) == "string" and k or tostring(k)
              table.insert(items, '"' .. key:gsub('"', '\\\\"') .. '":' .. toJSON(v))
            end
            return "{" .. table.concat(items, ",") .. "}"
          end
        else
          return '"[' .. t .. ']"'
        end
      end

      local tool = comp:FindTool("${escapedToolName}")
      if not tool then return '{"error":"Tool not found"}' end

      -- Find input by iterating and matching INPS_ID
      local inputs = tool:GetInputList()
      local input = nil
      for idx, inp in pairs(inputs) do
        local attrs = inp:GetAttrs()
        if attrs and attrs.INPS_ID == "${escapedInputName}" then
          input = inp
          break
        end
      end
      if not input then return '{"error":"Input not found"}' end

      local splineOutput = input:GetConnectedOutput()
      if not splineOutput then return '{"error":"Input not animated"}' end

      local spline = splineOutput:GetTool()
      if not spline then return '{"error":"No spline found"}' end

      -- Check if this is a Path tool (for Point inputs like Center)
      local splineAttrs = spline:GetAttrs()
      local splineType = splineAttrs and splineAttrs.TOOLS_RegID or "unknown"

      if splineType == "PolyPath" or splineType == "BezierPath" then
        local pathInputs = spline:GetInputList()
        local foundSpline = nil
        for pname, pinput in pairs(pathInputs) do
          local pout = pinput:GetConnectedOutput()
          if pout then
            local ptool = pout:GetTool()
            if ptool then
              local ptoolAttrs = ptool:GetAttrs()
              local ptoolType = ptoolAttrs and ptoolAttrs.TOOLS_RegID or ""
              if ptoolType == "BezierSpline" then
                foundSpline = ptool
                break
              end
            end
          end
        end
        if foundSpline then
          spline = foundSpline
        else
          return '{"error":"Path has no BezierSpline modifier"}'
        end
      end

      -- BezierSpline:GetKeyFrames() returns { [frame] = {value, LH, RH}, ... }
      local keyframes = spline:GetKeyFrames()
      if not keyframes then return '{"keyframes":{}}' end

      local items = {}
      for frame, data in pairs(keyframes) do
        local kf = ""
        if type(data) == "table" then
          local parts = {}
          if data[1] ~= nil then
            table.insert(parts, '"value":' .. toJSON(data[1]))
          end
          if data.LH then
            table.insert(parts, '"LH":' .. toJSON(data.LH))
          end
          if data.RH then
            table.insert(parts, '"RH":' .. toJSON(data.RH))
          end
          kf = "{" .. table.concat(parts, ",") .. "}"
        else
          kf = '{"value":' .. toJSON(data) .. '}'
        end
        table.insert(items, '"' .. tostring(frame) .. '":' .. kf)
      end

      return '{"keyframes":{' .. table.concat(items, ",") .. '}}'
    `;

    const keyframeResult = await executeLuaWithBridge(comp, getKeyframesLua);
    if (!keyframeResult) {
      return { error: 'Failed to get keyframes' };
    }

    let keyframeData;
    try {
      keyframeData = JSON.parse(keyframeResult);
    } catch (e) {
      logger.error('Failed to parse keyframe result:', keyframeResult);
      return { error: 'Failed to parse keyframe data' };
    }

    if (keyframeData.error) return keyframeData;

    const existingKeyframes = keyframeData.keyframes || {};
    logger.debug('Existing keyframes from Lua:', JSON.stringify(existingKeyframes));

    if (Object.keys(existingKeyframes).length < 2) {
      return { error: 'Need at least 2 keyframes to apply easing' };
    }

    // Step 2: Apply easing in JavaScript
    const {
      applyEasingToKeyframePair,
      applyEasingToKeyframes,
      toFusionFormat,
      fromFusionFormat,
      isSingleBezier
    } = require('./src/easing/bezier-handles.js');

    if (!isSingleBezier(easingType)) {
      return { error: `${easingType} cannot be represented as a single bezier curve.` };
    }

    const parsed = fromFusionFormat(existingKeyframes);
    logger.debug('Parsed keyframes:', JSON.stringify(parsed));

    let eased, message;

    // Support for multi-frame selection: apply easing to each consecutive pair
    if (frames && Array.isArray(frames) && frames.length >= 2) {
      // Sort frames to ensure correct order
      const sortedFrames = [...frames].sort((a, b) => a - b);

      // Apply easing to each consecutive pair
      eased = parsed;
      for (let i = 0; i < sortedFrames.length - 1; i++) {
        const f1 = sortedFrames[i];
        const f2 = sortedFrames[i + 1];
        eased = applyEasingToKeyframePair(eased, easingType, f1, f2);
      }

      const pairCount = sortedFrames.length - 1;
      message = `Applied ${easingType} to ${pairCount} keyframe pair${pairCount > 1 ? 's' : ''} (frames ${sortedFrames[0]}-${sortedFrames[sortedFrames.length - 1]})`;
    } else if (frame1 !== undefined && frame2 !== undefined) {
      // Legacy support: single pair via frame1/frame2
      eased = applyEasingToKeyframePair(parsed, easingType, frame1, frame2);
      message = `Applied ${easingType} between frames ${frame1}-${frame2}`;
    } else {
      // No frames specified: apply to all keyframes
      eased = applyEasingToKeyframes(parsed, easingType);
      message = `Applied ${easingType} to ${toolName}.${inputName}`;
    }
    logger.debug('Eased keyframes:', JSON.stringify(eased));

    const fusionFormat = toFusionFormat(eased);
    logger.debug('Fusion format:', JSON.stringify(fusionFormat));

    // Step 3: Build Lua table for keyframes
    // fusionFormat should now have clean numbers from toFusionFormat
    const keyframeLuaEntries = [];
    for (const [frame, data] of Object.entries(fusionFormat)) {
      const parts = [];

      // Value is first element of array
      const value = Array.isArray(data) ? data[0] : 0;
      parts.push(value);

      // Add handles if present
      if (data.LH) {
        parts.push(`LH = {${data.LH[0]}, ${data.LH[1]}}`);
      }
      if (data.RH) {
        parts.push(`RH = {${data.RH[0]}, ${data.RH[1]}}`);
      }

      keyframeLuaEntries.push(`[${frame}] = {${parts.join(', ')}}`);
    }

    const keyframesLuaTable = '{' + keyframeLuaEntries.join(', ') + '}';
    logger.debug('Lua table:', keyframesLuaTable);

    // Step 4: Set keyframes via Lua
    const setKeyframesLua = `
      local tool = comp:FindTool("${escapedToolName}")
      if not tool then return '{"error":"Tool not found"}' end

      -- Find input by iterating and matching INPS_ID
      local inputs = tool:GetInputList()
      local input = nil
      for idx, inp in pairs(inputs) do
        local attrs = inp:GetAttrs()
        if attrs and attrs.INPS_ID == "${escapedInputName}" then
          input = inp
          break
        end
      end
      if not input then return '{"error":"Input not found"}' end

      local splineOutput = input:GetConnectedOutput()
      if not splineOutput then return '{"error":"Input not animated"}' end

      local spline = splineOutput:GetTool()
      if not spline then return '{"error":"No spline found"}' end

      -- Check the spline type
      local splineAttrs = spline:GetAttrs()
      local splineType = splineAttrs and splineAttrs.TOOLS_RegID or "unknown"

      -- If it's a Path, we need to find the actual BezierSpline
      -- connected to one of its inputs (like Displacement)
      if splineType == "PolyPath" or splineType == "BezierPath" then
        -- This is a Path tool, not a spline. Find the animated input on the Path.
        local pathInputs = spline:GetInputList()
        local foundSpline = nil
        for pname, pinput in pairs(pathInputs) do
          local pattrs = pinput:GetAttrs()
          local pid = pattrs and pattrs.INPS_ID or ""
          local pout = pinput:GetConnectedOutput()
          if pout then
            local ptool = pout:GetTool()
            if ptool and ptool.GetKeyFrames then
              local pkf = ptool:GetKeyFrames()
              if pkf then
                foundSpline = ptool
                break
              end
            end
          end
        end
        if foundSpline then
          spline = foundSpline
        else
          return '{"error":"Path found but no BezierSpline on it. Type: ' .. splineType .. '"}'
        end
      end

      local keyframes = ${keyframesLuaTable}

      comp:Lock()
      local success, err = pcall(function()
        -- WORKAROUND: Call SetKeyFrames twice to ensure handles are properly applied.
        --
        -- Bug observed: When SetKeyFrames is called once with replace=true, the handle
        -- values (LH/RH) are not correctly stored. Reading back immediately shows
        -- different values than what was set. However, calling SetKeyFrames a second
        -- time with the same data works correctly.
        --
        -- Theory: Fusion's first call with replace=true recreates the keyframe structure,
        -- and handle values get normalized/reset during initialization. The second call
        -- finds a stable structure and applies handles correctly.
        --
        -- Side effect: Creates two undo history entries, so Ctrl+Z shows intermediate state.
        -- TODO: Find root cause to eliminate double-call and double undo entry.
        spline:SetKeyFrames(keyframes, true)
        spline:SetKeyFrames(keyframes, true)
      end)
      comp:Unlock()

      if success then
        return '{"success":true}'
      else
        return '{"error":"SetKeyFrames failed: ' .. tostring(err):gsub('"', '\\\\"') .. '"}'
      end
    `;

    logger.debug('Keyframes Lua table:', keyframesLuaTable.substring(0, 500));

    const setResult = await executeLuaWithBridge(comp, setKeyframesLua);
    logger.debug('Set keyframes result:', setResult);

    if (!setResult) {
      // Try a simpler test to see if we can set anything
      const testLua = `return "set_test_ok"`;
      const testResult = await executeLuaWithBridge(comp, testLua);
      logger.debug('Test after set failure:', testResult);
      return { error: 'Failed to set keyframes (Lua bridge returned null)' };
    }

    let setData;
    try {
      setData = JSON.parse(setResult);
    } catch (e) {
      logger.error('Failed to parse set result:', setResult);
      return { error: `Failed to parse set result: ${setResult.substring(0, 100)}` };
    }

    if (setData.error) {
      logger.error('SetKeyFrames error:', setData.error);
      return setData;
    }

    return {
      success: true,
      keyframeCount: Object.keys(fusionFormat).length,
      message
    };
  } catch (e) {
    logger.error('applyEasing failed', e);
    return { error: e.message };
  }
});

ipcMain.handle('fusion:debugLuaBridge', async () => {
  const logger = new Logger('debugAPI');
  const results = [];

  try {
    const resolve = await getResolve();
    if (!resolve) return { error: 'No Resolve connection', results };
    results.push({ test: 'getResolve', status: 'ok' });

    const page = await resolve.GetCurrentPage();
    results.push({ test: 'GetCurrentPage', status: 'ok', value: page });

    if (page !== 'fusion') {
      return { error: `Not on Fusion page (currently: ${page})`, results };
    }

    const comp = await getFusionComp();
    if (comp.error) {
      return { error: comp.error, results };
    }
    results.push({ test: 'getFusionComp', status: 'ok' });

    // Test Lua bridge
    const luaCode = `
      local tools = comp:GetToolList(true)
      local count = 0
      for _ in pairs(tools) do count = count + 1 end
      return tostring(count) .. " selected tools"
    `;

    const result = await executeLuaWithBridge(comp, luaCode);
    results.push({ test: 'Lua bridge', status: result ? 'ok' : 'fail', value: result });

    return { success: true, results };
  } catch (e) {
    return { error: e.message, results };
  }
});

// ============ Window Control ============

ipcMain.handle('window:setSize', async (event, width, height) => {
  if (mainWindow) {
    mainWindow.setSize(Math.round(width), Math.round(height));
    return { success: true };
  }
  return { error: 'No window' };
});

// ============ App Lifecycle ============

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
