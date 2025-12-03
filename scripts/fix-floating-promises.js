#!/usr/bin/env node

/**
 * Fixes @typescript-eslint/no-floating-promises errors
 * Adds void operator to promise calls that aren't awaited
 */

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

// Get all files with floating promise errors
let output
try {
  output = execSync('pnpm lint 2>&1', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
} catch (error) {
  output = error.stdout || error.output?.[1] || ''
}
const filesToFix = new Map()

for (const line of output.split('\n')) {
  if (line.includes('no-floating-promises') && line.includes('error')) {
    const match = line.match(/^([^:]+):(\d+):/)
    if (match) {
      const [, file, lineNum] = match
      if (!filesToFix.has(file)) {
        filesToFix.set(file, [])
      }
      filesToFix.get(file).push(parseInt(lineNum))
    }
  }
}

if (filesToFix.size === 0) {
  console.log('✅ No floating promise errors found')
  process.exit(0)
}

console.log(`Found floating promise errors in ${filesToFix.size} files\n`)

let totalFixed = 0

for (const [file, lineNumbers] of filesToFix) {
  try {
    let content = readFileSync(file, 'utf8')
    const lines = content.split('\n')
    let modified = false
    
    for (const lineNum of lineNumbers) {
      const idx = lineNum - 1
      if (idx < 0 || idx >= lines.length) continue
      
      let line = lines[idx]
      const originalLine = line
      
      // Skip if already has await, catch, then, or void
      if (line.match(/(await|\.catch|\.then|void)\s+/)) continue
      
      // Pattern: somePromiseCall(); at end of line
      // Find promise-returning calls
      const trimmed = line.trim()
      
      // Check if it's a promise-returning call (heuristic)
      const hasPromiseKeywords = line.match(/(fetch|axios|\.get|\.post|\.put|\.delete|connect|send|disconnect|\.then|\.catch)/i)
      
      if (hasPromiseKeywords && trimmed.endsWith(';')) {
        // Find the indent
        const indent = line.match(/^(\s*)/)[1]
        // Remove semicolon, add void
        const call = trimmed.slice(0, -1)
        lines[idx] = `${indent}void ${call};`
        modified = true
        console.log(`  Line ${lineNum}: Added void operator`)
      }
    }
    
    if (modified) {
      writeFileSync(file, lines.join('\n'), 'utf8')
      totalFixed++
      console.log(`✅ Fixed: ${file}`)
    }
  } catch (error) {
    console.error(`❌ Error fixing ${file}: ${error.message}`)
  }
}

console.log(`\n✅ Fixed ${totalFixed} files`)

