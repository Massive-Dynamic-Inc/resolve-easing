# Resolve Easing

Simple, beautiful easing curves for DaVinci Resolve Fusion.

> 🚧 **Early Development** - Building on lessons from [fusion-easing-plugin](https://github.com/Massive-Dynamic-Inc/fusion-easing-plugin)

## Vision

Like [Keyframe Wingman](https://misterhorse.com/keyframe-wingman) for After Effects, but for Resolve:
- **Two controls**: In easing, Out easing (1-100)
- **Visual preview**: See the curve before applying
- **Presets**: Quick access to common curves
- **Beautiful UI**: Clean, minimal, artist-friendly

## Architecture

```
resolve-easing/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.js    # Entry point
│   │   ├── resolve.js  # Resolve API wrapper
│   │   └── bridge.js   # Lua bridge for Fusion access
│   ├── renderer/       # UI
│   │   ├── index.html
│   │   ├── app.js
│   │   └── styles.css
│   └── shared/         # Shared utilities
│       └── easing.js   # Easing functions
├── scripts/
│   └── build.js        # Build & deploy script
└── docs/
    └── API.md          # Resolve API patterns
```

## Development

```bash
npm install
npm run dev     # Development with hot reload
npm run build   # Build for production
npm run deploy  # Deploy to Resolve plugins folder
```

## Requirements

- DaVinci Resolve Studio 18+ (Workflow Integration requires Studio)
- macOS or Windows

## License

MIT

