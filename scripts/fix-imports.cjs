#!/usr/bin/env node
/**
 * Fix all src/ imports to use relative paths with .js extensions
 * This is required for Vercel ESM runtime
 */

const fs = require('fs');
const path = require('path');

// Find all .ts files in src/
function findTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '__tests__' && item !== '.git') {
        findTsFiles(fullPath, files);
      }
    } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Convert src/path/to/file to relative path with .js
function convertSrcImport(fromFile, srcImport) {
  const fromDir = path.dirname(fromFile);
  const targetPath = srcImport; // e.g., 'src/lib/logger'
  
  // Calculate relative path from file to target
  let relativePath = path.relative(fromDir, targetPath);
  
  // Ensure it starts with ./ or ../
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  // Add .js extension if not present
  if (!relativePath.endsWith('.js')) {
    relativePath += '.js';
  }
  
  return relativePath;
}

// Fix imports in a file
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Match: from 'src/...'
  const srcImportRegex = /from\s+['"]src\/([^'"]+)['"]/g;
  
  content = content.replace(srcImportRegex, (match, importPath) => {
    const targetPath = 'src/' + importPath;
    const relativePath = convertSrcImport(filePath, targetPath);
    modified = true;
    return `from '${relativePath}'`;
  });
  
  // Also fix relative imports missing .js extension
  // Match: from './something' or from '../something' without .js
  const relativeImportRegex = /from\s+['"](\.[^'"]+)['"](?=\s*[;\n])/g;
  
  content = content.replace(relativeImportRegex, (match, importPath) => {
    // Skip if already has .js or .json extension
    if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
      return match;
    }
    // Skip if it's a directory index import (ends with /)
    if (importPath.endsWith('/')) {
      return match;
    }
    modified = true;
    return `from '${importPath}.js'`;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Main
const srcDir = path.join(__dirname, '..', 'src');
const files = findTsFiles(srcDir);

console.log(`Found ${files.length} TypeScript files`);

let fixedCount = 0;
for (const file of files) {
  if (fixFile(file)) {
    console.log('Fixed:', path.relative(process.cwd(), file));
    fixedCount++;
  }
}

console.log(`\nFixed ${fixedCount} files`);

