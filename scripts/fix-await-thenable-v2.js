#!/usr/bin/env node

/**
 * Fixes @typescript-eslint/await-thenable errors
 * Removes await from non-Promise values
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
const lines = output.split('\n')

// Parse errors - ESLint format: file path on one line, then error on next
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  if (line.includes('await-thenable') && line.includes('error')) {
    // Try to find file path in previous lines
    let file = null
    let lineNum = null
    let colNum = null
    
    // Look for file path in previous 5 lines
    for (let j = Math.max(0, i - 5); j < i; j++) {
      const prevLine = lines[j]
      // File path pattern: starts with / and ends with .ts or .tsx
      if (prevLine && /^\/.*\.(ts|tsx)$/.test(prevLine.trim())) {
        file = prevLine.trim()
        break
      }
    }
    
    // Extract line:col from error line
    // Format: "  line:col   error ..."
    const match = line.match(/\s+(\d+):(\d+)\s+error/)
    if (match && file) {
      lineNum = parseInt(match[1])
      colNum = parseInt(match[2])
      
      if (!filesToFix.has(file)) {
        filesToFix.set(file, [])
      }
      filesToFix.get(file).push({ lineNum, colNum })
    }
  }
}

if (filesToFix.size === 0) {
  console.log('✅ No await-thenable errors found')
  process.exit(0)
}

console.log(`Found await-thenable errors in ${filesToFix.size} files\n`)

let totalFixed = 0
let totalRemoved = 0

for (const [file, errors] of filesToFix) {
  try {
    let content = readFileSync(file, 'utf8')
    const lines = content.split('\n')
    let modified = false
    
    // Sort errors by line number (descending) to avoid offset issues
    const sortedErrors = [...errors].sort((a, b) => b.lineNum - a.lineNum)
    
    for (const error of sortedErrors) {
      const idx = error.lineNum - 1
      if (idx < 0 || idx >= lines.length) continue
      
      let line = lines[idx]
      const originalLine = line
      
      // Find and remove await keyword
      // Look for "await " pattern (await followed by space)
      // We need to be careful to only remove the await at the right position
      const awaitRegex = /\bawait\s+/g
      let match
      let found = false
      
      while ((match = awaitRegex.exec(line)) !== null) {
        const awaitStart = match.index
        const awaitEnd = match.index + match[0].length
        
        // Check if the error column is within or right after this await
        // Allow some tolerance (within 30 chars after await)
        if (error.colNum >= awaitStart && error.colNum <= awaitEnd + 30) {
          // Remove this await
          const beforeAwait = line.substring(0, awaitStart)
          const afterAwait = line.substring(awaitEnd)
          lines[idx] = beforeAwait + afterAwait
          modified = true
          totalRemoved++
          found = true
          console.log(`  Line ${error.lineNum}: Removed await`)
          break
        }
      }
      
      // If regex didn't find it, try simple string replacement
      // (less precise but catches edge cases)
      if (!found && line.includes('await ')) {
        // Remove first occurrence of "await " (with space)
        lines[idx] = line.replace(/\bawait\s+/, '')
        modified = true
        totalRemoved++
        console.log(`  Line ${error.lineNum}: Removed await (fallback)`)
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

console.log(`\n✅ Fixed ${totalFixed} files, removed ${totalRemoved} await keywords`)

