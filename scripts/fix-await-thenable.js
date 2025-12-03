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

// Parse errors
for (const line of output.split('\n')) {
  if (line.includes('await-thenable') && line.includes('error')) {
    // Match format: "  line:col  error  ... @typescript-eslint/await-thenable"
    const match = line.match(/^\s+(\d+):(\d+)\s+error.*await-thenable/)
    if (match) {
      // Need to get the file path from the previous line
      continue
    }
    // Also try matching with file path: "/path/to/file.ts\n  line:col  error..."
    const fileMatch = line.match(/^([^:]+):(\d+):(\d+)/)
    if (fileMatch) {
      const [, file, lineNum, colNum] = fileMatch
      if (!filesToFix.has(file)) {
        filesToFix.set(file, [])
      }
      filesToFix.get(file).push({ lineNum: parseInt(lineNum), colNum: parseInt(colNum) })
    }
  }
}

// Also parse by looking for file paths followed by await-thenable errors
const lines = output.split('\n')
let currentFile = ''
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  // Check if this is a file path
  if (line.match(/^\/[^:]+\.(ts|tsx)$/)) {
    currentFile = line.trim()
  }
  // Check if this is an await-thenable error
  if (line.includes('await-thenable') && line.includes('error') && currentFile) {
    const match = line.match(/^\s+(\d+):(\d+)\s+error/)
    if (match) {
      const [, lineNum, colNum] = match
      if (!filesToFix.has(currentFile)) {
        filesToFix.set(currentFile, [])
      }
      filesToFix.get(currentFile).push({ lineNum: parseInt(lineNum), colNum: parseInt(colNum) })
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
      
      // Find the await at the specified column
      // We need to find the await keyword that's being used incorrectly
      // Common patterns:
      // - await someVariable
      // - await someFunction()
      // - await someObject.property
      // - const x = await something
      // - return await something
      
      // Try to find and remove await at the column position
      const colIdx = error.colNum - 1
      
      // Check if there's an await at or before this column
      // Look backwards from the column to find the await keyword
      const beforeCol = line.substring(0, colIdx)
      const afterCol = line.substring(colIdx)
      
      // Find the last "await" before the column
      const awaitMatch = beforeCol.match(/\bawait\s+$/m)
      if (awaitMatch) {
        // Remove await and the following space
        const awaitIndex = beforeCol.lastIndexOf('await')
        const beforeAwait = line.substring(0, awaitIndex)
        const afterAwait = line.substring(awaitIndex + 5) // 5 = length of "await"
        // Remove leading whitespace after await
        const trimmedAfter = afterAwait.replace(/^\s+/, '')
        lines[idx] = beforeAwait + trimmedAfter
        modified = true
        totalRemoved++
        console.log(`  Line ${error.lineNum}: Removed await`)
      } else {
        // Try a more aggressive approach - find any await on this line
        // and check if it's at the right position (within a few characters)
        const awaitRegex = /\bawait\s+/g
        let match
        while ((match = awaitRegex.exec(line)) !== null) {
          const awaitStart = match.index
          const awaitEnd = match.index + match[0].length
          // If the error column is within or right after this await
          if (colIdx >= awaitStart && colIdx <= awaitEnd + 20) {
            // Remove this await
            const beforeAwait = line.substring(0, awaitStart)
            const afterAwait = line.substring(awaitEnd)
            lines[idx] = beforeAwait + afterAwait
            modified = true
            totalRemoved++
            console.log(`  Line ${error.lineNum}: Removed await`)
            break
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

console.log(`\n✅ Fixed ${totalFixed} files, removed ${totalRemoved} await keywords`)

