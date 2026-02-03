#!/usr/bin/env node
/**
 * Deploy script - Copies plugin to Resolve's plugins folder
 * 
 * Usage: node scripts/deploy.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const PLUGIN_NAME = 'resolve-easing';
const DIST_PATH = path.join(__dirname, '../dist', PLUGIN_NAME);
const RESOLVE_PLUGINS_PATH = path.join(
  os.homedir(),
  'Library/Application Support/Blackmagic Design/DaVinci Resolve/Support/Workflow Integration Plugins'
);
const DEPLOY_PATH = path.join(RESOLVE_PLUGINS_PATH, PLUGIN_NAME);

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`  Copied: ${entry.name}`);
    }
  }
}

function main() {
  console.log('=== Resolve Easing Plugin Deploy ===\n');
  
  // Check dist exists
  if (!fs.existsSync(DIST_PATH)) {
    console.error('Error: dist/ not found. Run `npm run build` first.');
    process.exit(1);
  }
  
  // Check Resolve plugins folder exists
  if (!fs.existsSync(RESOLVE_PLUGINS_PATH)) {
    console.error('Error: Resolve plugins folder not found.');
    console.error(`Expected: ${RESOLVE_PLUGINS_PATH}`);
    console.error('Is DaVinci Resolve installed?');
    process.exit(1);
  }
  
  // Remove existing deployment
  if (fs.existsSync(DEPLOY_PATH)) {
    console.log(`Removing existing deployment...`);
    fs.rmSync(DEPLOY_PATH, { recursive: true });
  }
  
  // Copy files
  console.log(`\nDeploying to: ${DEPLOY_PATH}\n`);
  copyDir(DIST_PATH, DEPLOY_PATH);
  
  console.log('\n✅ Deployed successfully!');
  console.log('\nNext steps:');
  console.log('1. Restart Resolve (or close/reopen project)');
  console.log('2. Workspace → Workflow Integration → Resolve Easing');
}

main();
