/**
 * Build script - Packages the plugin for deployment
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../src');
const DIST = path.join(__dirname, '../dist/resolve-easing');

// Files to copy
const files = [
  'main/index.js',
  'main/resolve.js',
  'main/bridge.js',
  'main/preload.js',
  'renderer/index.html',
  'renderer/styles.css',
  'renderer/app.js',
  'shared/easing.js',
];

// Clean dist
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true });
}
fs.mkdirSync(DIST, { recursive: true });

// Copy files
files.forEach(file => {
  const src = path.join(SRC, file);
  const dest = path.join(DIST, file);
  
  // Create directory if needed
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${file}`);
  } else {
    console.warn(`Missing: ${file}`);
  }
});

// Copy package.json
fs.copyFileSync(
  path.join(__dirname, '../package.json'),
  path.join(DIST, 'package.json')
);

// Copy manifest.xml (needs to be created)
const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<WorkflowIntegrationPluginManifest>
  <PluginId>com.massive-dynamic.resolve-easing</PluginId>
  <PluginName>Resolve Easing</PluginName>
  <PluginDescription>Simple, beautiful easing curves for Fusion</PluginDescription>
  <PluginVersion>0.1.0</PluginVersion>
</WorkflowIntegrationPluginManifest>`;
fs.writeFileSync(path.join(DIST, 'manifest.xml'), manifest);

console.log('\nBuild complete! Output: dist/resolve-easing/');
console.log('Note: WorkflowIntegration.node must be added manually');
