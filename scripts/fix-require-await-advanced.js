#!/usr/bin/env node

/**
 * Advanced fix for @typescript-eslint/require-await errors
 * Removes async keyword from functions with no await
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
      
      // Check if it's an async arrow function (simple case)
      if (line.match(/async\s+\([^)]*\)\s*=>/)) {
        // Remove async keyword
        line = line.replace(/async\s+/, '')
        lines[idx] = line
        modified = true
        console.log(`  Line ${lineNum}: Removed async from arrow function`)
      }
      // For async function declarations
      else if (line.match(/async\s+function/)) {
        // Check if function body has await (read ahead)
        let hasAwait = false
        let braceCount = 0
        let inFunction = false
        
        for (let i = idx; i < Math.min(idx + 50, lines.length); i++) {
          const checkLine = lines[i]
          if (checkLine.includes('{')) {
            braceCount++
            inFunction = true
          }
          if (checkLine.includes('}')) {
            braceCount--
            if (braceCount === 0 && inFunction) break
          }
          if (inFunction && checkLine.includes('await')) {
            hasAwait = true
            break
          }
        }
        
        if (!hasAwait) {
          line = line.replace(/async\s+/, '')
          lines[idx] = line
          modified = true
          console.log(`  Line ${lineNum}: Removed async from function declaration`)
        }
      }
      // For async methods
      else if (line.match(/async\s+\w+\s*\(/)) {
        // Similar check for method body
        let hasAwait = false
        let braceCount = 0
        let inMethod = false
        
        for (let i = idx; i < Math.min(idx + 50, lines.length); i++) {
          const checkLine = lines[i]
          if (checkLine.includes('{')) {
            braceCount++
            inMethod = true
          }
          if (checkLine.includes('}')) {
            braceCount--
            if (braceCount === 0 && inMethod) break
          }
          if (inMethod && checkLine.includes('await')) {
            hasAwait = true
            break
          }
        }
        
        if (!hasAwait) {
          line = line.replace(/async\s+/, '')
          lines[idx] = line
          modified = true
          console.log(`  Line ${lineNum}: Removed async from method`)
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

