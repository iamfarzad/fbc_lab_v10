#!/usr/bin/env node

/**
 * Comprehensive script to fix all automatable ESLint errors
 * Reads actual files and fixes based on patterns
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

function getAllTsFiles(dir, fileList = []) {
  const files = readdirSync(dir)
  for (const file of files) {
    const filePath = join(dir, file)
    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.git', 'coverage'].includes(file)) {
        getAllTsFiles(filePath, fileList)
      }
    } else if (['.ts', '.tsx'].includes(extname(file))) {
      fileList.push(filePath)
    }
  }
  return fileList
}

const files = getAllTsFiles('.')
let totalFixed = 0
let fixes = {
  banTsComment: 0,
  requireAwait: 0,
}

console.log(`Scanning ${files.length} files...\n`)

for (const filePath of files) {
  try {
    let content = readFileSync(filePath, 'utf8')
    const original = content
    
    // Fix 1: Replace @ts-ignore with @ts-expect-error
    if (content.includes('@ts-ignore')) {
      content = content.replace(/@ts-ignore/g, '@ts-expect-error')
      fixes.banTsComment += (original.match(/@ts-ignore/g) || []).length
    }
    
    // Fix 2: Remove async from simple arrow functions with no await
    // Pattern: const name = async () => { ... } where body has no await
    const asyncArrowFunctionRegex = /const\s+(\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*{([^}]*)}/g
    let match
    while ((match = asyncArrowFunctionRegex.exec(content)) !== null) {
      const body = match[2]
      if (!body.includes('await')) {
        const fullMatch = match[0]
        const replacement = fullMatch.replace(/\s*async\s+/, ' ')
        content = content.replace(fullMatch, replacement)
        fixes.requireAwait++
      }
    }
    
    // Fix 3: Remove async from function declarations with no await (simple cases)
    // This is more complex, so we'll do a simple heuristic
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Simple case: async function name() { return something; }
      if (line.match(/^\s*async\s+function\s+\w+\s*\([^)]*\)\s*{/) && 
          i + 1 < lines.length && 
          lines[i + 1].match(/^\s*return\s+[^;]+;?\s*$/) &&
          !lines[i + 1].includes('await')) {
        lines[i] = line.replace(/async\s+/, '')
        fixes.requireAwait++
      }
    }
    content = lines.join('\n')
    
    if (content !== original) {
      writeFileSync(filePath, content, 'utf8')
      totalFixed++
      console.log(`✅ Fixed: ${filePath}`)
    }
  } catch (error) {
    // Skip files we can't read
  }
}

console.log(`\n✅ Summary:`)
console.log(`   Files modified: ${totalFixed}`)
console.log(`   @ts-ignore → @ts-expect-error: ${fixes.banTsComment}`)
console.log(`   Removed async (no await): ${fixes.requireAwait}`)

