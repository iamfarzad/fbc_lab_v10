#!/usr/bin/env node

/**
 * Analyzes import patterns from the import map
 * Determines: relative paths vs absolute paths vs @ aliases
 */

const fs = require('fs');
const path = require('path');

const importMapPath = path.join(__dirname, 'what_to_import.md');
const content = fs.readFileSync(importMapPath, 'utf-8');

// Extract all import paths
const importPattern = /- `([^`]+)`/g;
const imports = new Set();
let match;

while ((match = importPattern.exec(content)) !== null) {
  const importPath = match[1];
  // Skip file extensions for analysis
  const cleanPath = importPath.replace(/\.(ts|tsx|js|jsx)$/, '');
  imports.add(cleanPath);
}

// Categorize imports
const patterns = {
  relativeUp: [],      // ../something
  relativeSame: [],    // ./something
  absoluteRoot: [],   // components/something (no ./ or ../)
  aliasAt: [],         // @/something
  srcPath: [],         // src/something
  apiPath: [],         // api/something
  serverPath: [],      // server/something
  utilsPath: [],       // utils/something
  servicesPath: [],    // services/something
  componentsPath: [],  // components/something
  contextPath: [],     // context/something
  typesPath: [],       // types.ts (root)
  configPath: [],      // config.ts (root)
  other: []
};

imports.forEach(imp => {
  if (imp.startsWith('../')) {
    patterns.relativeUp.push(imp);
  } else if (imp.startsWith('./')) {
    patterns.relativeSame.push(imp);
  } else if (imp.startsWith('@/')) {
    patterns.aliasAt.push(imp);
  } else if (imp.startsWith('src/')) {
    patterns.srcPath.push(imp);
  } else if (imp.startsWith('api/')) {
    patterns.apiPath.push(imp);
  } else if (imp.startsWith('server/')) {
    patterns.serverPath.push(imp);
  } else if (imp.startsWith('utils/')) {
    patterns.utilsPath.push(imp);
  } else if (imp.startsWith('services/')) {
    patterns.servicesPath.push(imp);
  } else if (imp.startsWith('components/')) {
    patterns.componentsPath.push(imp);
  } else if (imp.startsWith('context/')) {
    patterns.contextPath.push(imp);
  } else if (imp === 'types' || imp.endsWith('/types')) {
    patterns.typesPath.push(imp);
  } else if (imp === 'config' || imp.endsWith('/config')) {
    patterns.configPath.push(imp);
  } else {
    patterns.other.push(imp);
  }
});

console.log('=== IMPORT PATTERN ANALYSIS ===\n');

console.log(`Total unique imports: ${imports.size}\n`);

console.log('📊 Pattern Distribution:');
console.log(`  Relative (../):     ${patterns.relativeUp.length}`);
console.log(`  Relative (./):      ${patterns.relativeSame.length}`);
console.log(`  @ alias:            ${patterns.aliasAt.length}`);
console.log(`  Absolute (src/):   ${patterns.srcPath.length}`);
console.log(`  Absolute (api/):    ${patterns.apiPath.length}`);
console.log(`  Absolute (server/): ${patterns.serverPath.length}`);
console.log(`  Absolute (utils/):  ${patterns.utilsPath.length}`);
console.log(`  Absolute (services/): ${patterns.servicesPath.length}`);
console.log(`  Absolute (components/): ${patterns.componentsPath.length}`);
console.log(`  Absolute (context/): ${patterns.contextPath.length}`);
console.log(`  Root files:        ${patterns.typesPath.length + patterns.configPath.length}`);
console.log(`  Other:             ${patterns.other.length}`);

console.log('\n=== KEY FINDINGS ===\n');

if (patterns.aliasAt.length > 0) {
  console.log('✅ @ alias IS being used');
  console.log(`   Examples: ${patterns.aliasAt.slice(0, 5).join(', ')}`);
} else {
  console.log('❌ @ alias NOT being used');
}

if (patterns.relativeUp.length > 0) {
  console.log(`\n✅ Relative paths (../) are used: ${patterns.relativeUp.length} times`);
  console.log(`   Examples: ${patterns.relativeUp.slice(0, 5).join(', ')}`);
}

if (patterns.absoluteRoot.length === 0 && patterns.componentsPath.length > 0) {
  console.log('\n✅ Absolute paths from root are used (no ./ or ../)');
  console.log(`   Examples: ${patterns.componentsPath.slice(0, 3).join(', ')}`);
  console.log(`            ${patterns.servicesPath.slice(0, 3).join(', ')}`);
  console.log(`            ${patterns.srcPath.slice(0, 3).join(', ')}`);
}

console.log('\n=== PROJECT STRUCTURE INFERENCE ===\n');

console.log('Based on import patterns, the project structure appears to be:');
console.log(`
  /
  ├── components/          (${patterns.componentsPath.length} imports)
  ├── services/            (${patterns.servicesPath.length} imports)
  ├── utils/              (${patterns.utilsPath.length} imports)
  ├── context/             (${patterns.contextPath.length} imports)
  ├── api/                 (${patterns.apiPath.length} imports)
  ├── server/              (${patterns.serverPath.length} imports)
  ├── src/                 (${patterns.srcPath.length} imports)
  ├── types.ts             (root level)
  └── config.ts            (root level)
`);

console.log('\n=== RECOMMENDATION ===\n');

if (patterns.aliasAt.length > 0) {
  console.log('🔧 Project uses @ alias - configure in vite.config.ts:');
  console.log(`
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // or '@': path.resolve(__dirname, '.'),
      }
    }
  `);
} else if (patterns.absoluteRoot.length === 0 && patterns.componentsPath.length > 0) {
  console.log('🔧 Project uses absolute imports from root (no alias needed)');
  console.log('   Imports like: components/X, services/Y, src/Z');
  console.log('   This works with Vite by default if files are at root level');
} else {
  console.log('🔧 Project uses relative imports (../)');
  console.log('   Standard relative path imports');
}

console.log('\n=== SAMPLE IMPORTS ===\n');
console.log('Components:', patterns.componentsPath.slice(0, 3).join(', '));
console.log('Services:', patterns.servicesPath.slice(0, 3).join(', '));
console.log('Src:', patterns.srcPath.slice(0, 3).join(', '));
console.log('Utils:', patterns.utilsPath.slice(0, 3).join(', '));

