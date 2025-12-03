#!/usr/bin/env node

/**
 * Fixes @typescript-eslint/no-misused-promises errors
 * Wraps promise-returning functions in arrow functions for event handlers
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
  if (line.includes('no-misused-promises') && line.includes('error')) {
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
  console.log('✅ No misused promises errors found')
  process.exit(0)
}

console.log(`Found misused promises errors in ${filesToFix.size} files\n`)

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
      
      // Pattern: onClick={asyncFunction} or onClick={somePromise}
      // Fix: onClick={() => { void asyncFunction() }}
      const match = line.match(/(\w+)=\{([^}]+)\}/)
      if (match) {
        const [, attr, func] = match
        // Skip if already wrapped in arrow function
        if (func.includes('=>') || func.includes('void')) continue
        
        // Wrap in arrow function with void
        const indent = line.match(/^(\s*)/)[1]
        const funcName = func.trim()
        const oldPattern = attr + '={' + func + '}'
        const newPattern = attr + '={() => { void ' + funcName + '() }}'
        lines[idx] = line.replace(oldPattern, newPattern)
        modified = true
        console.log(`  Line ${lineNum}: Wrapped promise in arrow function`)
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

