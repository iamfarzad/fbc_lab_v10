#!/usr/bin/env node

/**
 * Identifies files that:
 * 1. Are not imported by any other file
 * 2. Are test files (should be ignored anyway)
 * 3. Are archived/disabled
 * 4. Have ESLint errors but aren't used
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname, relative } from 'path'
import { execSync } from 'child_process'

// Get all TypeScript files
function getAllTsFiles(dir, fileList = []) {
  const files = readdirSync(dir)
  for (const file of files) {
    const filePath = join(dir, file)
    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        getAllTsFiles(filePath, fileList)
      }
    } else if (['.ts', '.tsx'].includes(extname(file))) {
      fileList.push(filePath)
    }
  }
  return fileList
}

// Get ESLint errors per file
function getEslintErrors() {
  try {
    const output = execSync('pnpm lint 2>&1', { encoding: 'utf8' })
    const errorsByFile = new Map()
    
    for (const line of output.split('\n')) {
      const match = line.match(/^([^:]+):(\d+):(\d+)\s+(error|warning)/)
      if (match) {
        const [, file] = match
        if (!errorsByFile.has(file)) {
          errorsByFile.set(file, [])
        }
        errorsByFile.get(file).push(line.trim())
      }
    }
    
    return errorsByFile
  } catch (error) {
    // ESLint failed, return empty
    return new Map()
  }
}

// Check if file is imported
function isFileImported(filePath, allFiles) {
  const relativePath = relative(process.cwd(), filePath)
  const importPath = relativePath.replace(/\.(ts|tsx)$/, '')
  
  for (const otherFile of allFiles) {
    if (otherFile === filePath) continue
    
    try {
      const content = readFileSync(otherFile, 'utf8')
      // Check for various import patterns
      const patterns = [
        new RegExp(`from ['"]${importPath.replace(/\\/g, '/')}['"]`),
        new RegExp(`from ['"]\\./${importPath.replace(/\\/g, '/')}['"]`),
        new RegExp(`from ['"]\\.\\./${importPath.replace(/\\/g, '/')}['"]`),
        new RegExp(`require\\(['"]${importPath.replace(/\\/g, '/')}['"]\\)`),
      ]
      
      if (patterns.some(pattern => pattern.test(content))) {
        return true
      }
    } catch {
      // Skip if can't read
    }
  }
  
  return false
}

// Main
const allFiles = getAllTsFiles('.')
const eslintErrors = getEslintErrors()

console.log('=== UNUSED FILES WITH ESLINT ERRORS ===\n')

const unusedWithErrors = []

for (const file of allFiles) {
  // Skip test files (should be ignored anyway)
  if (file.includes('__tests__') || 
      file.includes('.test.') || 
      file.includes('.spec.') ||
      file.includes('e2e/') ||
      file.includes('test/')) {
    continue
  }
  
  // Skip archived/disabled
  if (file.includes('_archive') || 
      file.includes('_admin-disabled') ||
      file.includes('_lib')) {
    continue
  }
  
  // Check if has ESLint errors
  const hasErrors = eslintErrors.has(file) && 
    eslintErrors.get(file).some(line => line.includes('error'))
  
  if (hasErrors) {
    // Check if file is imported
    const isImported = isFileImported(file, allFiles)
    
    if (!isImported) {
      unusedWithErrors.push({
        file,
        errors: eslintErrors.get(file).filter(line => line.includes('error')).length
      })
    }
  }
}

if (unusedWithErrors.length > 0) {
  console.log(`Found ${unusedWithErrors.length} unused files with ESLint errors:\n`)
  unusedWithErrors.forEach(({ file, errors }) => {
    console.log(`  ${file} (${errors} errors)`)
  })
  console.log('\n💡 Consider:')
  console.log('  1. Delete if truly unused')
  console.log('  2. Add to .eslintignore if needed for reference')
  console.log('  3. Fix errors if file should be used')
} else {
  console.log('✅ No unused files with ESLint errors found')
}

// Also report test files with errors
console.log('\n=== TEST FILES WITH ERRORS (SHOULD BE IGNORED) ===\n')
const testFilesWithErrors = []
for (const [file, errors] of eslintErrors) {
  if ((file.includes('__tests__') || 
       file.includes('.test.') || 
       file.includes('.spec.') ||
       file.includes('e2e/') ||
       file.includes('test/')) &&
      errors.some(line => line.includes('error'))) {
    testFilesWithErrors.push({ file, errorCount: errors.filter(l => l.includes('error')).length })
  }
}

if (testFilesWithErrors.length > 0) {
  console.log(`Found ${testFilesWithErrors.length} test files with errors (should be in .eslintignore):\n`)
  testFilesWithErrors.forEach(({ file, errorCount }) => {
    console.log(`  ${file} (${errorCount} errors)`)
  })
} else {
  console.log('✅ No test files with errors (or they\'re already ignored)')
}

