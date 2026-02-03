# Deployment & Testing Guide

## Quick Deploy

```bash
cd ~/projects/resolve-easing
npm run ship
```

This will:
1. ✅ Validate code (syntax checks, required files)
2. 📦 Build to `dist/resolve-easing/`
3. 🚀 Deploy to Resolve plugins folder
4. ⚠️  **Manual step required:** Restart Resolve

## Resolve Plugins Folder

**macOS:**
```
~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Support/Workflow Integration Plugins/resolve-easing/
```

**Windows:**
```
%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\resolve-easing\
```

## Opening the Plugin

After Resolve restarts:
1. **Workspace** menu (top bar)
2. **Workflow Integration**
3. **Resolve Easing**

A floating window will appear.

## Testing Checklist

### ✅ Connection Test
- [ ] Plugin shows "Connected" with green dot
- [ ] Comp name and page displayed

### ✅ No Comp Test
- [ ] Move playhead to empty space
- [ ] Error: "No clip under playhead"

### ✅ No Fusion Comp Test
- [ ] Move playhead to clip without Fusion
- [ ] Error: "No Fusion comp on this clip"

### ✅ No Tools Selected
- [ ] Have Fusion comp but no tools selected
- [ ] Shows: "No tools selected in Fusion"

### ✅ Tool Selection
- [ ] Select a Transform node in Fusion
- [ ] Tool appears in list with type (Transform)
- [ ] Click to select

### ✅ No Animated Inputs
- [ ] Select tool with no keyframes
- [ ] Error: "No animated inputs. Create keyframes first."

### ✅ Animated Inputs
- [ ] Create 2+ keyframes on Center X
- [ ] Input appears in dropdown: "Center X (N keyframes)"
- [ ] Select input
- [ ] Keyframes displayed with frame numbers and values

### ✅ Real-time Updates
- [ ] Add a keyframe while plugin is open
- [ ] Updates within 1 second
- [ ] Change tool selection in Fusion
- [ ] Plugin updates tool list

### ✅ Multiple Tools
- [ ] Select multiple tools in Fusion (Shift+click)
- [ ] All appear in plugin tool list
- [ ] Click each to see its inputs

## Troubleshooting

### "Not connected to Resolve"
- Is Resolve Studio running? (Free version doesn't support plugins)
- Try restarting Resolve
- Check Console (View → Console) for errors

### "No tools selected"
- Must be in Fusion page
- Select a node in Fusion (click it)
- Plugin polls every 500ms, wait a moment

### "No animated inputs"
- Create at least 2 keyframes on an input
- Right-click input → Animate
- Set keyframes at different frames

### Plugin doesn't appear in Workspace menu
- Restart Resolve completely (not just close project)
- Check plugins folder has `manifest.xml` and files
- Check Console for plugin load errors

### Old version still showing
- Resolve caches plugins
- Must fully quit and restart Resolve
- `npm run deploy` replaces files but Resolve won't reload until restart

## Development Workflow

### Edit → Test Cycle

```bash
# 1. Make code changes in src/

# 2. Quick validation
npm run validate

# 3. Full deploy
npm run ship

# 4. Restart Resolve

# 5. Test
```

### Faster Iteration (Advanced)

Skip full restart by testing without Resolve:
```bash
npm run dev
```

This opens the plugin in standalone Electron (no Resolve API, but you can test UI).

### Logs

Check Resolve Console:
- View → Console
- Shows plugin initialization and IPC calls
- Errors appear here

## Files in Deployment

```
~/Library/.../Workflow Integration Plugins/resolve-easing/
├── manifest.xml              # Plugin metadata
├── package.json
├── main/
│   ├── index.js              # Main process
│   ├── resolve.js
│   ├── bridge.js
│   ├── preload.js
│   └── WorkflowIntegration.node  # SDK binary
├── renderer/
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── shared/
    └── easing.js
```

## Success Criteria ✅

You've successfully deployed Milestone 1 when:
1. Plugin shows "Connected" status
2. Can see selected tools from Fusion
3. Can see animated inputs for a tool
4. Can see keyframes (frame number + value)
5. Updates in real-time when you change selection

Ready for Milestone 2!
