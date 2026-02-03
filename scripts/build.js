/**
 * Build script - Packages the plugin for deployment
 * 
 * Creates FLAT structure required by Resolve (no subdirectories):
 * - main.js (entry point, requires FilePath in manifest)
 * - preload.js
 * - index.html
 * - renderer.js
 * - styles.css
 * - easing.js
 * - WorkflowIntegration.node
 * - manifest.xml
 * - package.json
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../src');
const DIST = path.join(__dirname, '../dist/resolve-easing');

// File mappings: src -> dest (flat)
const fileMappings = [
  { src: 'main/index.js', dest: 'main.js' },
  { src: 'main/resolve.js', dest: 'resolve.js' },
  { src: 'main/bridge.js', dest: 'bridge.js' },
  { src: 'main/preload.js', dest: 'preload.js' },
  { src: 'renderer/index.html', dest: 'index.html' },
  { src: 'renderer/styles.css', dest: 'styles.css' },
  { src: 'renderer/app.js', dest: 'app.js' },
  { src: 'shared/easing.js', dest: 'easing.js' },
];

// Clean dist
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true });
}
fs.mkdirSync(DIST, { recursive: true });

// Copy and flatten files
fileMappings.forEach(({ src, dest }) => {
  const srcPath = path.join(SRC, src);
  const destPath = path.join(DIST, dest);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied: ${src} -> ${dest}`);
  } else {
    console.warn(`Missing: ${src}`);
  }
});

// Copy package.json
fs.copyFileSync(
  path.join(__dirname, '../package.json'),
  path.join(DIST, 'package.json')
);
console.log('Copied: package.json');

// Generate manifest.xml (BMD format)
const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<BlackmagicDesign>
    <Plugin>
        <Id>com.massive-dynamic.resolve-easing</Id>
        <Name>Resolve Easing</Name>
        <Version>0.1.0</Version>
        <Description>Simple, beautiful easing curves for Fusion</Description>
        <FilePath>main.js</FilePath>
    </Plugin>
</BlackmagicDesign>`;
fs.writeFileSync(path.join(DIST, 'manifest.xml'), manifest);
console.log('Generated: manifest.xml');

// Copy WorkflowIntegration.node from Resolve SDK
const workflowNode = '/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Workflow Integrations/Examples/SamplePlugin/WorkflowIntegration.node';
if (fs.existsSync(workflowNode)) {
  fs.copyFileSync(workflowNode, path.join(DIST, 'WorkflowIntegration.node'));
  console.log('Copied: WorkflowIntegration.node from Resolve SDK');
} else {
  console.warn('⚠️  WorkflowIntegration.node not found - copy manually from Resolve SDK');
}

console.log('\n✅ Build complete! Output: dist/resolve-easing/');
console.log('\nStructure:');
fs.readdirSync(DIST).forEach(f => console.log(`  ${f}`));
