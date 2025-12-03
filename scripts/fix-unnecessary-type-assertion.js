#!/usr/bin/env node

/**
 * Fixes @typescript-eslint/no-unnecessary-type-assertion errors
 * Removes unnecessary type assertions like `as Type` when TypeScript can infer the type
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

// Parse by looking for file paths followed by no-unnecessary-type-assertion errors
const lines = output.split('\n')
let currentFile = ''
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  // Check if this is a file path
  if (line.match(/^\/[^:]+\.(ts|tsx)$/)) {
    currentFile = line.trim()
  }
  // Check if this is a no-unnecessary-type-assertion error
  if (line.includes('no-unnecessary-type-assertion') && line.includes('error') && currentFile) {
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
  console.log('✅ No unnecessary type assertion errors found')
  process.exit(0)
}

console.log(`Found unnecessary type assertion errors in ${filesToFix.size} files\n`)

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
      
      // Common patterns:
      // - value as Type
      // - (value as Type)
      // - value as unknown as Type (double assertion)
      
      // Remove simple type assertions: " as Type"
      // But be careful not to remove necessary ones
      // Pattern: something as Type
      const simpleAssertion = /(\w+(?:\.\w+)*)\s+as\s+(\w+(?:<[^>]+>)?)/g
      let match
      let newLine = line
      
      // Try to remove type assertions
      // Match: identifier as Type
      const assertionMatch = newLine.match(/(\w+(?:\.\w+)*(?:\s*\([^)]*\))?)\s+as\s+(\w+(?:<[^>]+>)?(?:\[\])?)/)
      if (assertionMatch) {
        const [, value, type] = assertionMatch
        // Remove the " as Type" part
        newLine = newLine.replace(assertionMatch[0], value.trim())
        modified = true
        totalRemoved++
        console.log(`  Line ${error.lineNum}: Removed type assertion "${type}"`)
      }
      
      // Also handle parentheses: (value as Type)
      const parenAssertionMatch = newLine.match(/\(([^)]+)\s+as\s+(\w+(?:<[^>]+>)?(?:\[\])?)\)/)
      if (parenAssertionMatch && !modified) {
        const [, value, type] = parenAssertionMatch
        // Remove parentheses and type assertion
        newLine = newLine.replace(parenAssertionMatch[0], value.trim())
        modified = true
        totalRemoved++
        console.log(`  Line ${error.lineNum}: Removed type assertion "${type}" from parentheses`)
      }
      
      if (modified) {
        lines[idx] = newLine
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

console.log(`\n✅ Fixed ${totalFixed} files, removed ${totalRemoved} type assertions`)

