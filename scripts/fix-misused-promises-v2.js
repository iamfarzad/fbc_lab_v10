#!/usr/bin/env node

/**
 * Improved misused promises fixer
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

// Parse by looking for file paths followed by no-misused-promises errors
const lines = output.split('\n')
let currentFile = ''
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  // Check if this is a file path
  if (line.match(/^\/[^:]+\.(ts|tsx)$/)) {
    currentFile = line.trim()
  }
  // Check if this is a no-misused-promises error
  if (line.includes('no-misused-promises') && line.includes('error') && currentFile) {
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
      
      // Check if it's a JSX attribute
      const jsxAttrMatch = line.match(/(\w+)=\{([^}]+)\}/)
      if (jsxAttrMatch) {
        const [, attr, func] = jsxAttrMatch
        // Skip if already wrapped in arrow function
        if (func.includes('=>') || func.includes('void')) continue
        
        // Get the function name (remove any method calls)
        const funcName = func.trim().replace(/\(\)$/, '')
        
        // Wrap in arrow function with void
        const oldPattern = attr + '={' + func + '}'
        const newPattern = attr + '={() => { void ' + funcName + '() }}'
        lines[idx] = line.replace(oldPattern, newPattern)
        modified = true
        console.log(`  Line ${lineNum}: Wrapped promise in arrow function`)
      }
      // Pattern: someFunction(asyncFunction) - in function call
      else if (line.match(/\([^)]*\)/)) {
        // This is trickier - might need manual review
        // But we can try to wrap it
        const funcCallMatch = line.match(/(\w+)\(([^)]+)\)/)
        if (funcCallMatch) {
          const [, caller, arg] = funcCallMatch
          // If arg looks like a promise-returning function
          if (arg.match(/^\w+$/) && !arg.includes('=>')) {
            const oldPattern = caller + '(' + arg + ')'
            const newPattern = caller + '(() => { void ' + arg + '() })'
            lines[idx] = line.replace(oldPattern, newPattern)
            modified = true
            console.log(`  Line ${lineNum}: Wrapped promise argument`)
          }
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

