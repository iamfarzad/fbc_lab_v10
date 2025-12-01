#!/usr/bin/env node

/**
 * Verifies context preservation system is set up correctly
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const requiredFiles = [
  'PROJECT_STATUS.md',
  '.cursorrules',
  '.cursor/START_HERE.md',
  '.cursor/STRICT_RULES.md',
  '.cursor/context-rules.md',
  'docs/CONTEXT_PRESERVATION.md',
]

console.log('🔍 Verifying Context Preservation System...\n')

let allGood = true

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file)
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath)
    console.log(`✅ ${file} (${stats.size} bytes)`)
  } else {
    console.log(`❌ ${file} - MISSING!`)
    allGood = false
  }
})

console.log('\n📋 Checking PROJECT_STATUS.md structure...\n')

const statusPath = path.join(__dirname, '..', 'PROJECT_STATUS.md')
if (fs.existsSync(statusPath)) {
  const content = fs.readFileSync(statusPath, 'utf-8')
  const requiredSections = [
    'Current Objective',
    'Completed',
    'In Progress',
    'Next Steps',
    'Blockers',
    'Progress Tracking',
    'Current Context',
    'Session Notes',
  ]
  
  requiredSections.forEach(section => {
    if (content.includes(section)) {
      console.log(`✅ Section: ${section}`)
    } else {
      console.log(`⚠️  Section: ${section} - Not found`)
    }
  })
  
  // Check last updated
  const lastUpdated = content.match(/\*\*Last Updated:\*\* (.+)/)?.[1]
  if (lastUpdated) {
    console.log(`\n📅 Last Updated: ${lastUpdated}`)
  } else {
    console.log(`\n⚠️  Last Updated: Not found`)
  }
}

console.log('\n📚 Quick Commands:')
console.log('  pnpm status:check  - View status')
console.log('  pnpm status        - Status helper')
console.log('  cat PROJECT_STATUS.md  - Full status')

if (allGood) {
  console.log('\n✅ Context preservation system is set up correctly!')
  console.log('\n🚨 Remember: Always read PROJECT_STATUS.md first in new sessions!')
} else {
  console.log('\n❌ Some files are missing. Please check the setup.')
  process.exit(1)
}

