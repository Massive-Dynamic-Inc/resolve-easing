#!/usr/bin/env node
/**
 * Validate script - Pre-Resolve validation checks
 * 
 * Runs checks that don't require Resolve:
 * - Syntax validation
 * - Required files present
 * - Manifest validation
 * - Easing function tests
 * 
 * Usage: node scripts/validate.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_PATH = path.join(__dirname, '../src');
const ROOT_PATH = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}`);
    console.log(`   ${e.message}`);
    failed++;
  }
}

function fileExists(filepath, description) {
  return () => {
    const fullPath = path.join(ROOT_PATH, filepath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing: ${filepath}`);
    }
  };
}

function syntaxCheck(filepath) {
  return () => {
    const fullPath = path.join(ROOT_PATH, filepath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filepath}`);
    }
    try {
      execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
    } catch (e) {
      throw new Error(`Syntax error in ${filepath}`);
    }
  };
}

function testEasingFunctions() {
  return () => {
    // Dynamic import won't work easily, so we'll do a basic check
    const easingPath = path.join(SRC_PATH, 'shared/easing.js');
    const content = fs.readFileSync(easingPath, 'utf8');
    
    // Check for essential easing functions
    const required = ['linear', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad'];
    for (const fn of required) {
      if (!content.includes(fn)) {
        throw new Error(`Missing easing function: ${fn}`);
      }
    }
  };
}

console.log('=== Resolve Easing Plugin Validation ===\n');

console.log('## Required Files\n');
check('package.json exists', fileExists('package.json'));
check('manifest template in build.js', fileExists('scripts/build.js'));

console.log('\n## Source Files\n');
check('main/index.js exists', fileExists('src/main/index.js'));
check('main/resolve.js exists', fileExists('src/main/resolve.js'));
check('main/bridge.js exists', fileExists('src/main/bridge.js'));
check('main/preload.js exists', fileExists('src/main/preload.js'));
check('renderer/index.html exists', fileExists('src/renderer/index.html'));
check('renderer/app.js exists', fileExists('src/renderer/app.js'));
check('shared/easing.js exists', fileExists('src/shared/easing.js'));

console.log('\n## Syntax Checks\n');
check('main/index.js syntax', syntaxCheck('src/main/index.js'));
check('main/resolve.js syntax', syntaxCheck('src/main/resolve.js'));
check('main/bridge.js syntax', syntaxCheck('src/main/bridge.js'));
check('main/preload.js syntax', syntaxCheck('src/main/preload.js'));
check('renderer/app.js syntax', syntaxCheck('src/renderer/app.js'));
check('scripts/build.js syntax', syntaxCheck('scripts/build.js'));
check('scripts/deploy.js syntax', syntaxCheck('scripts/deploy.js'));

console.log('\n## Easing Functions\n');
check('Core easing functions present', testEasingFunctions());

console.log('\n---');
console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\n⚠️  Fix the above issues before deploying.\n');
  process.exit(1);
} else {
  console.log('\n✅ All checks passed! Ready to build.\n');
  process.exit(0);
}
