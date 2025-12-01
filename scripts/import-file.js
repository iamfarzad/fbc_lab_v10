#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read source config
const configPath = path.join(__dirname, '..', '.source-config.json')
let sourceConfig = null

if (fs.existsSync(configPath)) {
  sourceConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
} else {
  console.error('\n❌ Source config not found!')
  console.error('   Create .source-config.json with:')
  console.error('   {')
  console.error('     "sourceType": "local",')
  console.error('     "sourcePath": "/path/to/original/project"')
  console.error('   }')
  console.error('\n   Or:')
  console.error('   {')
  console.error('     "sourceType": "repository",')
  console.error('     "sourceUrl": "https://github.com/..."')
  console.error('   }\n')
  process.exit(1)
}

// Get file to import
const filePath = process.argv[2]
if (!filePath) {
  console.error('\n❌ Usage: node scripts/import-file.js <file-path> [--validate]\n')
  console.error('   Example: node scripts/import-file.js types.ts')
  console.error('   Example: node scripts/import-file.js src/config/constants.ts --validate\n')
  process.exit(1)
}

const validate = process.argv.includes('--validate')

// Determine source file location
let sourceFilePath = null
let fileContent = null

if (sourceConfig.sourceType === 'local') {
  // Local file access
  const sourcePath = sourceConfig.sourcePath
  if (!sourcePath) {
    console.error('\n❌ sourcePath not configured in .source-config.json\n')
    process.exit(1)
  }
  
  sourceFilePath = path.join(sourcePath, filePath)
  
  if (!fs.existsSync(sourceFilePath)) {
    console.error(`\n❌ File not found: ${sourceFilePath}\n`)
    process.exit(1)
  }
  
  fileContent = fs.readFileSync(sourceFilePath, 'utf-8')
  console.log(`\n✅ Read file from: ${sourceFilePath}`)
  
} else if (sourceConfig.sourceType === 'repository') {
  // Repository access (would need GitHub API or user to provide)
  console.error('\n❌ Repository access not yet implemented')
  console.error('   For now, please provide file contents manually')
  console.error('   Or use local path in .source-config.json\n')
  process.exit(1)
} else {
  console.error(`\n❌ Unknown sourceType: ${sourceConfig.sourceType}\n`)
  process.exit(1)
}

// Determine destination
const destFilePath = path.join(__dirname, '..', filePath)
const destDir = path.dirname(destFilePath)

// Create destination directory if needed
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true })
  console.log(`✅ Created directory: ${destDir}`)
}

// Update import paths (basic - absolute from root)
// This is a simple version - agents will do more sophisticated updates
let updatedContent = fileContent

// Write file
fs.writeFileSync(destFilePath, updatedContent, 'utf-8')
console.log(`✅ Written to: ${destFilePath}`)

// Validate if requested
if (validate) {
  console.log('\n🔍 Running validation...\n')
  
  try {
    execSync('pnpm type-check', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
    console.log('\n✅ Type check: PASSED')
  } catch (e) {
    console.log('\n❌ Type check: FAILED')
    console.log('   Fix errors before proceeding\n')
    process.exit(1)
  }
  
  try {
    execSync('pnpm lint', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
    console.log('\n✅ Lint: PASSED')
  } catch (e) {
    console.log('\n❌ Lint: FAILED')
    console.log('   Fix errors before proceeding\n')
    process.exit(1)
  }
  
  console.log('\n✅ Validation complete\n')
} else {
  console.log('\n💡 Tip: Run with --validate flag to auto-validate')
  console.log('   Example: node scripts/import-file.js types.ts --validate\n')
}

