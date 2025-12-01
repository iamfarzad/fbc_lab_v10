#!/usr/bin/env node

/**
 * Monitor error fixing progress
 * Shows current error count and breakdown by file/category
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();

function getErrorCount() {
  try {
    const output = execSync('pnpm type-check 2>&1', { encoding: 'utf8', cwd: PROJECT_ROOT });
    const errors = output.match(/error TS\d+/g) || [];
    return errors.length;
  } catch (error) {
    const output = error.stdout || error.output?.join('') || '';
    const errors = output.match(/error TS\d+/g) || [];
    return errors.length;
  }
}

function getErrorsByFile() {
  let output;
  try {
    output = execSync('pnpm type-check 2>&1', { encoding: 'utf8', cwd: PROJECT_ROOT });
  } catch (error) {
    output = error.stdout || error.output?.join('') || '';
  }
  
  const lines = output.split('\n');
  const errorsByFile = new Map();
  
  for (const line of lines) {
    const fileMatch = line.match(/^([^(]+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s*(.+)$/);
    if (fileMatch) {
      const [, file] = fileMatch;
      errorsByFile.set(file, (errorsByFile.get(file) || 0) + 1);
    }
  }
  
  return errorsByFile;
}

function categorizeFile(file) {
  if (file.startsWith('api/admin/')) return 'admin';
  if (file.startsWith('api/')) return 'api';
  if (file.startsWith('components/')) return 'components';
  if (file.startsWith('services/')) return 'services';
  if (file.startsWith('server/')) return 'server';
  if (file.startsWith('src/core/')) return 'core';
  if (file.startsWith('utils/')) return 'utils';
  return 'root';
}

function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║        ERROR FIXING PROGRESS MONITOR                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const totalErrors = getErrorCount();
  const errorsByFile = getErrorsByFile();
  
  console.log(`📊 Total Errors: ${totalErrors}\n`);
  
  // Group by category
  const byCategory = {
    admin: 0,
    api: 0,
    components: 0,
    services: 0,
    server: 0,
    core: 0,
    utils: 0,
    root: 0,
  };
  
  for (const [file, count] of errorsByFile.entries()) {
    const category = categorizeFile(file);
    byCategory[category] = (byCategory[category] || 0) + count;
  }
  
  console.log('📋 Errors by Category:');
  for (const [category, count] of Object.entries(byCategory)) {
    if (count > 0) {
      const bar = '█'.repeat(Math.floor(count / 5));
      console.log(`   ${category.padEnd(12)} ${count.toString().padStart(3)} ${bar}`);
    }
  }
  
  console.log('\n📁 Top 10 Files with Most Errors:');
  const sorted = Array.from(errorsByFile.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  for (const [file, count] of sorted) {
    console.log(`   ${count.toString().padStart(3)} ${file}`);
  }
  
  console.log('\n✅ Progress:');
  const initialErrors = 208;
  const fixed = initialErrors - totalErrors;
  const percentage = ((fixed / initialErrors) * 100).toFixed(1);
  console.log(`   Fixed: ${fixed}/${initialErrors} (${percentage}%)`);
  console.log(`   Remaining: ${totalErrors}`);
  
  console.log('\n');
}

main();

