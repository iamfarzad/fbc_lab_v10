#!/usr/bin/env node

/**
 * Reports unsafe argument errors for manual fixing
 * These need type assertions or proper types
 */

import { execSync } from 'child_process'

let output
try {
  output = execSync('pnpm lint 2>&1', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
} catch (error) {
  output = error.stdout || error.output?.[1] || ''
}

const errors = []

for (const line of output.split('\n')) {
  if (line.includes('no-unsafe-argument') && line.includes('error')) {
    errors.push(line.trim())
  }
}

if (errors.length === 0) {
  console.log('✅ No unsafe argument errors found')
  process.exit(0)
}

console.log(`Found ${errors.length} unsafe argument errors:\n`)
errors.forEach((err, idx) => {
  console.log(`${idx + 1}. ${err}`)
})

console.log('\n💡 Fix by adding type assertions: value as Type')
console.log('   Or create proper type definitions for the values')

