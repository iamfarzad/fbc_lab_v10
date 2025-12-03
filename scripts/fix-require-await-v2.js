#!/usr/bin/env node

/**
 * Improved require-await fixer
 * Uses AST-like parsing to detect async functions with no await
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
      
      // Check if function body has await
      let hasAwait = false
      let braceCount = 0
      let foundFunctionStart = false
      let inFunction = false
      
      // Look ahead to find function body
      for (let i = idx; i < Math.min(idx + 200, lines.length); i++) {
        const checkLine = lines[i]
        
        // Count braces
        const openBraces = (checkLine.match(/{/g) || []).length
        const closeBraces = (checkLine.match(/}/g) || []).length
        braceCount += openBraces - closeBraces
        
        if (braceCount > 0) {
          inFunction = true
        }
        
        // Check for await (but not in comments)
        if (inFunction && checkLine.includes('await') && !checkLine.trim().startsWith('//')) {
          hasAwait = true
          break
        }
        
        // If we've closed all braces, we're done
        if (foundFunctionStart && braceCount <= 0 && inFunction) {
          break
        }
        
        if (braceCount > 0) {
          foundFunctionStart = true
        }
      }
      
      // If no await found, remove async
      if (!hasAwait) {
        // Pattern 1: async function name() {
        if (line.match(/^\s*async\s+function\s+\w+/)) {
          line = line.replace(/async\s+/, '')
          lines[idx] = line
          modified = true
          console.log(`  Line ${lineNum}: Removed async from function declaration`)
        }
        // Pattern 2: async method() {
        else if (line.match(/^\s*async\s+\w+\s*\(/)) {
          line = line.replace(/async\s+/, '')
          lines[idx] = line
          modified = true
          console.log(`  Line ${lineNum}: Removed async from method`)
        }
        // Pattern 3: async () => {
        else if (line.match(/async\s*\([^)]*\)\s*=>/)) {
          line = line.replace(/async\s+/, '')
          lines[idx] = line
          modified = true
          console.log(`  Line ${lineNum}: Removed async from arrow function`)
        }
        // Pattern 4: const name = async () => {
        else if (line.match(/=\s*async\s*\(/)) {
          line = line.replace(/(=\s*)async\s+/, '$1')
          lines[idx] = line
          modified = true
          console.log(`  Line ${lineNum}: Removed async from arrow function assignment`)
        }
        // Pattern 5: export async function
        else if (line.match(/export\s+async\s+function/)) {
          line = line.replace(/async\s+/, '')
          lines[idx] = line
          modified = true
          console.log(`  Line ${lineNum}: Removed async from exported function`)
        }
        // Pattern 6: export const name = async () => {
        else if (line.match(/export\s+const\s+\w+\s*=\s*async/)) {
          line = line.replace(/(=\s*)async\s+/, '$1')
          lines[idx] = line
          modified = true
          console.log(`  Line ${lineNum}: Removed async from exported arrow function`)
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

