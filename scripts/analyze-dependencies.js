#!/usr/bin/env node

/**
 * Analyzes the import map to determine import order
 * Identifies files with no dependencies (foundational files)
 */

const fs = require('fs');
const path = require('path');

const importMapPath = path.join(__dirname, 'what_to_import.md');
const content = fs.readFileSync(importMapPath, 'utf-8');

// Parse the import map
const files = {};
const filePattern = /### `([^`]+)`/g;
const importPattern = /- `([^`]+)`/g;

let currentFile = null;
let inImports = false;
let inRenders = false;

const lines = content.split('\n');

lines.forEach((line, index) => {
  // Detect file header
  const fileMatch = line.match(/^### `([^`]+)`/);
  if (fileMatch) {
    currentFile = fileMatch[1];
    files[currentFile] = {
      imports: [],
      renders: [],
      hasNoImports: false,
      level: null
    };
    inImports = false;
    inRenders = false;
    return;
  }

  // Detect sections
  if (line.includes('**Imports:**')) {
    inImports = true;
    inRenders = false;
    return;
  }
  if (line.includes('**Renders Components:**') || line.includes('**Renders:**')) {
    inImports = false;
    inRenders = true;
    return;
  }
  if (line.includes('*No imports or renders*')) {
    if (currentFile) {
      files[currentFile].hasNoImports = true;
    }
    inImports = false;
    inRenders = false;
    return;
  }

  // Parse imports
  if (inImports && currentFile) {
    const importMatch = line.match(/- `([^`]+)`/);
    if (importMatch) {
      files[currentFile].imports.push(importMatch[1]);
    }
  }

  // Parse renders (less important for dependency analysis)
  if (inRenders && currentFile) {
    const renderMatch = line.match(/- `([^`]+)`/);
    if (renderMatch) {
      files[currentFile].renders.push(renderMatch[1]);
    }
  }
});

// Calculate dependency levels
function calculateLevels() {
  const levels = {};
  let currentLevel = 0;
  let remaining = Object.keys(files);
  
  while (remaining.length > 0 && currentLevel < 20) { // safety limit
    const levelFiles = [];
    
    remaining.forEach(file => {
      const fileData = files[file];
      const allDepsResolved = fileData.imports.every(imp => {
        // Check if dependency is in a lower level or has no imports
        const depFile = Object.keys(files).find(f => f.includes(imp.split('/').pop()));
        if (!depFile) return true; // External dependency
        return levels[depFile] !== undefined && levels[depFile] < currentLevel;
      });
      
      if (allDepsResolved || fileData.hasNoImports) {
        levelFiles.push(file);
        levels[file] = currentLevel;
      }
    });
    
    if (levelFiles.length === 0) {
      // Circular dependency or missing files - assign remaining to next level
      remaining.forEach(file => {
        if (!levels[file]) {
          levels[file] = currentLevel;
        }
      });
      break;
    }
    
    remaining = remaining.filter(f => !levelFiles.includes(f));
    currentLevel++;
  }
  
  return levels;
}

const levels = calculateLevels();

// Group by level
const byLevel = {};
Object.entries(levels).forEach(([file, level]) => {
  if (!byLevel[level]) byLevel[level] = [];
  byLevel[level].push(file);
});

// Filter out files we want to skip
const skipPatterns = [
  /api\/_admin-disabled/,
  /api\/_archive/,
  /api\/_lib\//,  // Skip api/_lib, using src/ instead
  /server\/src\/config/,  // Duplicate
];

function shouldSkip(file) {
  return skipPatterns.some(pattern => pattern.test(file));
}

// Print results
console.log('=== FOUNDATION FILES (Level 0 - No Dependencies) ===\n');
const level0 = (byLevel[0] || []).filter(f => !shouldSkip(f));
level0.forEach(file => {
  const fileData = files[file];
  if (fileData.hasNoImports || fileData.imports.length === 0) {
    console.log(`✓ ${file}`);
  }
});

console.log('\n=== IMPORT ORDER BY LEVEL ===\n');
Object.keys(byLevel).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
  const levelFiles = byLevel[level].filter(f => !shouldSkip(f));
  if (levelFiles.length > 0) {
    console.log(`\nLevel ${level} (${levelFiles.length} files):`);
    levelFiles.slice(0, 10).forEach(file => {
      const fileData = files[file];
      const deps = fileData.imports.length;
      console.log(`  - ${file} (${deps} deps)`);
    });
    if (levelFiles.length > 10) {
      console.log(`  ... and ${levelFiles.length - 10} more`);
    }
  }
});

// Statistics
const totalFiles = Object.keys(files).filter(f => !shouldSkip(f)).length;
const noImportFiles = Object.keys(files).filter(f => 
  !shouldSkip(f) && (files[f].hasNoImports || files[f].imports.length === 0)
).length;

console.log('\n=== STATISTICS ===');
console.log(`Total files to import: ${totalFiles}`);
console.log(`Files with no imports: ${noImportFiles}`);
console.log(`Files to skip: ${Object.keys(files).filter(shouldSkip).length}`);

// Export for use
const foundationFiles = level0.filter(f => 
  files[f].hasNoImports || files[f].imports.length === 0
);

console.log('\n=== RECOMMENDED STARTING FILES ===');
foundationFiles.slice(0, 20).forEach(file => {
  console.log(`  ${file}`);
});

