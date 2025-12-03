#!/usr/bin/env node

/**
 * Improved floating promises fixer
 * Adds void operator to unhandled promises
 */

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

let output
try {
  output = execSync('pnpm lint 2>&1', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
} catch (error) {
  output = error.stdout || error.output?.[1] || ''
}

const filesToFix = new Map()

// Parse by looking for file paths followed by no-floating-promises errors
const lines = output.split('\n')
let currentFile = ''
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  // Check if this is a file path
  if (line.match(/^\/[^:]+\.(ts|tsx)$/)) {
    currentFile = line.trim()
  }
  // Check if this is a no-floating-promises error
  if (line.includes('no-floating-promises') && line.includes('error') && currentFile) {
    const match = line.match(/^\s+(\d+):(\d+)\s+error/)
    if (match) {
      const [, lineNum] = match
      if (!filesToFix.has(currentFile)) {
        filesToFix.set(currentFile, [])
      }
      filesToFix.get(currentFile).push(parseInt(lineNum))
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
      
      // Find the indent
      const indentMatch = line.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[1] : ''
      
      // Pattern: somePromiseCall(); at end of line
      const trimmed = line.trim()
      
      if (trimmed.endsWith(';')) {
        // Remove semicolon, add void
        const call = trimmed.slice(0, -1)
        lines[idx] = `${indent}void ${call};`
        modified = true
        console.log(`  Line ${lineNum}: Added void operator`)
      } else if (trimmed.endsWith(')')) {
        // Promise call without semicolon (maybe in expression)
        // Add void at the start if it's a standalone call
        if (!line.includes('=') && !line.includes('return') && !line.includes('if') && !line.includes('while')) {
          lines[idx] = line.replace(/^(\s*)(.+)$/, `$1void $2`)
          modified = true
          console.log(`  Line ${lineNum}: Added void operator`)
        }
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

