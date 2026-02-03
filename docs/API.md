# DaVinci Resolve API Patterns

Documented patterns for interacting with Resolve's Workflow Integration API.

## Composition Access

```javascript
// Get current composition via timeline
const pm = await resolve.GetProjectManager();
const project = await pm.GetCurrentProject();
const timeline = await project.GetCurrentTimeline();
const item = await timeline.GetCurrentVideoItem();
const comp = await item.LoadFusionCompByName(compNames[0]);
```

## Lua Bridge

The JS API doesn't expose all Fusion methods. Use the Lua bridge for:

- Getting selected tools: `comp:GetToolList(true)`
- Getting animated inputs: `tool:GetInputList()`, `inp:GetKeyFrames()`
- Modifying keyframes: `inp[frame] = value`

Pattern:
1. Write Lua code that writes result to temp file
2. Execute via `comp.Execute(lua)`
3. Read result from temp file

## Known Limitations

- `comp.Execute()` always throws, but code still runs
- No direct access to bezier handles via JS API
- Must use Lua for keyframe spline manipulation
- File-based IPC adds ~150ms latency

## Testing Requirements

- DaVinci Resolve Studio (not free version)
- Project with timeline and Fusion clip
- At least 2 keyframes on a property
- Playhead over the clip
- On Fusion page
