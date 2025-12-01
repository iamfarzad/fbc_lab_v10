#!/usr/bin/env node

/**
 * Checks for naming consistency issues
 * Identifies files that don't follow naming conventions
 */

const fs = require('fs')
const path = require('path')

const importMapPath = path.join(__dirname, '../what_to_import.md')
const content = fs.readFileSync(importMapPath, 'utf-8')

// Extract all file paths
const filePattern = /### `([^`]+)`/g
const files = []
let match

while ((match = filePattern.exec(content)) !== null) {
  files.push(match[1])
}

// Analyze naming patterns
const issues = {
  mixedCase: [],
  inconsistentExtension: [],
  specialChars: [],
  inconsistentStructure: []
}

files.forEach(file => {
  const parts = file.split('/')
  const fileName = parts[parts.length - 1]
  const baseName = fileName.replace(/\.(ts|tsx|js|jsx)$/, '')
  const ext = fileName.match(/\.(ts|tsx|js|jsx)$/)?.[1]
  
  // Check for mixed case (should be consistent)
  const hasUpperCase = /[A-Z]/.test(baseName)
  const hasLowerCase = /[a-z]/.test(baseName)
  const hasMixedCase = hasUpperCase && hasLowerCase && baseName[0] !== baseName[0].toUpperCase()
  
  if (hasMixedCase && !baseName.match(/^[A-Z]/)) {
    issues.mixedCase.push(file)
  }
  
  // Check for special characters
  if (/[^a-zA-Z0-9\-_\.]/.test(fileName)) {
    issues.specialChars.push(file)
  }
  
  // Check extension consistency (should be .ts or .tsx for React)
  if (file.includes('components/') && ext !== 'tsx') {
    issues.inconsistentExtension.push(file)
  }
})

console.log('=== NAMING CONSISTENCY CHECK ===\n')

let hasIssues = false

if (issues.mixedCase.length > 0) {
  hasIssues = true
  console.log('⚠️  Mixed case file names (consider camelCase or kebab-case):')
  issues.mixedCase.slice(0, 10).forEach(file => {
    console.log(`   - ${file}`)
  })
  if (issues.mixedCase.length > 10) {
    console.log(`   ... and ${issues.mixedCase.length - 10} more`)
  }
  console.log()
}

if (issues.specialChars.length > 0) {
  hasIssues = true
  console.log('⚠️  Files with special characters:')
  issues.specialChars.forEach(file => {
    console.log(`   - ${file}`)
  })
  console.log()
}

if (issues.inconsistentExtension.length > 0) {
  hasIssues = true
  console.log('⚠️  React components should use .tsx extension:')
  issues.inconsistentExtension.slice(0, 10).forEach(file => {
    console.log(`   - ${file}`)
  })
  if (issues.inconsistentExtension.length > 10) {
    console.log(`   ... and ${issues.inconsistentExtension.length - 10} more`)
  }
  console.log()
}

if (!hasIssues) {
  console.log('✅ Naming appears consistent!')
} else {
  console.log('\n💡 Recommendation:')
  console.log('   - Standardize on camelCase or kebab-case for files')
  console.log('   - Use .tsx for React components')
  console.log('   - Use .ts for non-React TypeScript files')
  console.log('   - Avoid special characters in file names')
}

