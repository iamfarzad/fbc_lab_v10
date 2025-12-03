#!/usr/bin/env node

/**
 * Replaces console.log with logger.debug
 * Uses existing logger utilities
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { existsSync } from 'fs'

function getAllTsFiles(dir, fileList = []) {
  const files = readdirSync(dir)
  for (const file of files) {
    const filePath = join(dir, file)
    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.git', 'coverage'].includes(file)) {
        getAllTsFiles(filePath, fileList)
      }
    } else if (extname(file) === '.ts' || extname(file) === '.tsx') {
      fileList.push(filePath)
    }
  }
  return fileList
}

const files = getAllTsFiles('.')
let fixed = 0

const loggerPath = 'src/lib/logger.ts'
const loggerClientPath = 'src/lib/logger-client.ts'
const hasLogger = existsSync(loggerPath)
const hasClientLogger = existsSync(loggerClientPath)

console.log('Replacing console.log with logger...\n')

for (const filePath of files) {
  try {
    let content = readFileSync(filePath, 'utf8')
    const original = content
    
    // Skip if no console.log
    if (!content.includes('console.log')) continue
    
    // Determine logger
    const isClient = filePath.includes('components/') || 
                    filePath.includes('App.tsx') || 
                    extname(filePath) === '.tsx' ||
                    filePath.includes('context/')
    
    const loggerImport = isClient && hasClientLogger
      ? "import { logger } from 'src/lib/logger-client'"
      : hasLogger
      ? "import { logger } from 'src/lib/logger'"
      : null
    
    // Add import if needed
    if (loggerImport && !content.includes(loggerImport)) {
      const importMatch = content.match(/^import\s+.*$/m)
      if (importMatch) {
        const imports = content.match(/^import\s+.*$/gm) || []
        if (imports.length > 0) {
          const lastImport = imports[imports.length - 1]
          const lastImportIndex = content.lastIndexOf(lastImport)
          content = content.slice(0, lastImportIndex + lastImport.length) + 
                    '\n' + loggerImport + 
                    content.slice(lastImportIndex + lastImport.length)
        }
      } else {
        content = loggerImport + '\n\n' + content
      }
    }
    
    // Replace console.log with logger.debug
    if (loggerImport) {
      content = content.replace(/console\.log\(/g, 'logger.debug(')
    } else {
      // No logger available, comment out
      content = content.replace(/console\.log\(/g, '// console.log(')
    }
    
    if (content !== original) {
      writeFileSync(filePath, content, 'utf8')
      fixed++
      console.log(`✅ Fixed: ${filePath}`)
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}: ${error.message}`)
  }
}

console.log(`\n✅ Fixed ${fixed} files`)

