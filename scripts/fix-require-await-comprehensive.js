#!/usr/bin/env node

/**
 * Comprehensive fix for @typescript-eslint/require-await errors
 * Removes async keyword from functions/methods with no await
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

for (const line of output.split('\n')) {
  if (line.includes('require-await') && line.includes('error')) {
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
  console.log('✅ No require-await errors found')
  process.exit(0)
}

console.log(`Found require-await errors in ${filesToFix.size} files\n`)

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
      
      // Check if function body has await (read ahead up to 50 lines)
      let hasAwait = false
      let braceCount = 0
      let inFunction = false
      let foundOpenBrace = false
      
      // First, find the function start
      for (let i = idx; i < Math.min(idx + 100, lines.length); i++) {
        const checkLine = lines[i]
        
        // Count braces to find function body
        const openBraces = (checkLine.match(/{/g) || []).length
        const closeBraces = (checkLine.match(/}/g) || []).length
        braceCount += openBraces - closeBraces
        
        if (braceCount > 0) {
          inFunction = true
          foundOpenBrace = true
        }
        
        // Check for await
        if (inFunction && checkLine.includes('await')) {
          hasAwait = true
          break
        }
        
        // If we've closed all braces and were in a function, we're done
        if (foundOpenBrace && braceCount === 0) {
          break
        }
      }
      
      // If no await found, remove async
      if (!hasAwait) {
        // Pattern 1: async function name() { ... }
        if (line.match(/async\s+function\s+\w+/)) {
          line = line.replace(/async\s+/, '')
          lines[idx] = line
          modified = true
          console.log(`  Line ${lineNum}: Removed async from function declaration`)
        }
        // Pattern 2: async method() { ... }
        else if (line.match(/async\s+\w+\s*\(/)) {
          line = line.replace(/async\s+/, '')
          lines[idx] = line
          modified = true
          console.log(`  Line ${lineNum}: Removed async from method`)
        }
        // Pattern 3: async () => { ... }
        else if (line.match(/async\s*\([^)]*\)\s*=>/)) {
          line = line.replace(/async\s+/, '')
          lines[idx] = line
          modified = true
          console.log(`  Line ${lineNum}: Removed async from arrow function`)
        }
        // Pattern 4: const name = async () => { ... }
        else if (line.match(/=\s*async\s*\(/)) {
          line = line.replace(/(=\s*)async\s+/, '$1')
          lines[idx] = line
          modified = true
          console.log(`  Line ${lineNum}: Removed async from arrow function assignment`)
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

