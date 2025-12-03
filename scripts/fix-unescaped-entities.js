#!/usr/bin/env node

/**
 * Fixes react/no-unescaped-entities errors
 * Escapes quotes and apostrophes in JSX
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
  if (line.includes('no-unescaped-entities') && line.includes('error')) {
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
  console.log('✅ No unescaped entities errors found')
  process.exit(0)
}

console.log(`Found unescaped entities errors in ${filesToFix.size} files\n`)

let totalFixed = 0

for (const [file, lineNumbers] of filesToFix) {
  try {
    let content = readFileSync(file, 'utf8')
    const originalContent = content
    const lines = content.split('\n')
    
    // Fix apostrophes in JSX
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Check if we're in JSX (between < and >)
      let inJSX = false
      let lastOpen = -1
      let lastClose = -1
      
      for (let j = 0; j < line.length; j++) {
        if (line[j] === '<' && (j === 0 || line[j-1] !== '/')) {
          lastOpen = j
        } else if (line[j] === '>') {
          lastClose = j
        }
      }
      
      if (lastOpen > lastClose) {
        // We're in JSX
        // Replace apostrophes in JSX content (not in strings)
        lines[i] = line.replace(/'/g, (match, offset) => {
          // Check if we're inside a string
          const before = line.substring(0, offset)
          const stringQuotes = (before.match(/['"]/g) || []).length
          // If odd number of quotes, we're inside a string
          if (stringQuotes % 2 === 1) {
            return match
          }
          return '&apos;'
        })
      }
    }
    
    // Fix quotes in JSX attributes (simpler approach)
    content = lines.join('\n')
    // Replace quotes in JSX attributes (between < and >, not in string values)
    content = content.replace(/<([^>]+)>/g, (match, attrs) => {
      // Replace quotes in attribute values, but keep the quotes around values
      return '<' + attrs.replace(/"([^"]*)"/g, '&quot;$1&quot;') + '>'
    })
    
    if (content !== originalContent) {
      writeFileSync(file, content, 'utf8')
      totalFixed++
      console.log(`✅ Fixed: ${file}`)
    }
  } catch (error) {
    console.error(`❌ Error fixing ${file}: ${error.message}`)
  }
}

console.log(`\n✅ Fixed ${totalFixed} files`)

