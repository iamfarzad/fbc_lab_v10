#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const phase = process.argv[2] || 'phase-1'

console.log(`\n🔍 Monitoring Phase ${phase} Progress\n`)

// Check validation status
console.log('📊 Validation Status:\n')

let typeCheckPassed = false
let lintPassed = false

try {
  execSync('pnpm type-check', { stdio: 'pipe' })
  console.log('✅ Type check: PASSED')
  typeCheckPassed = true
} catch (e) {
  console.log('❌ Type check: FAILED')
  console.log('   Run: pnpm type-check (see errors above)')
}

try {
  execSync('pnpm lint', { stdio: 'pipe' })
  console.log('✅ Lint: PASSED')
  lintPassed = true
} catch (e) {
  console.log('❌ Lint: FAILED')
  console.log('   Run: pnpm lint (see errors above)')
}

// Check PROJECT_STATUS.md
console.log('\n📝 Project Status:')
if (fs.existsSync('PROJECT_STATUS.md')) {
  const status = fs.readFileSync('PROJECT_STATUS.md', 'utf-8')
  const importedCount = (status.match(/\[x\]/g) || []).length
  const totalCount = (status.match(/\[[ x]\]/g) || []).length
  console.log(`   Progress: ${importedCount}/${totalCount} items completed`)
  
  // Check for recent updates
  const stats = fs.statSync('PROJECT_STATUS.md')
  const lastModified = new Date(stats.mtime)
  const minutesAgo = Math.floor((Date.now() - lastModified.getTime()) / 60000)
  console.log(`   Last updated: ${minutesAgo} minutes ago`)
} else {
  console.log('   ⚠️  PROJECT_STATUS.md not found')
}

// Check for generated prompts
console.log('\n📋 Agent Prompts:')
const promptsDir = path.join(__dirname, 'agent-prompts')
if (fs.existsSync(promptsDir)) {
  const prompts = fs.readdirSync(promptsDir)
    .filter(f => f.startsWith(phase))
    .sort()
  
  if (prompts.length > 0) {
    console.log(`   Found ${prompts.length} prompts for ${phase}:`)
    prompts.forEach(p => console.log(`   - ${p}`))
  } else {
    console.log(`   ⚠️  No prompts found for ${phase}`)
    console.log(`   Run: node scripts/generate-agent-prompts.js ${phase}`)
  }
} else {
  console.log('   ⚠️  Prompts directory not found')
  console.log('   Run: node scripts/generate-agent-prompts.js phase-1')
}

// Summary
console.log('\n📊 Summary:')
if (typeCheckPassed && lintPassed) {
  console.log('   ✅ All validations passing')
  console.log('   ✅ Ready to proceed or merge changes')
} else {
  console.log('   ⚠️  Some validations failing')
  console.log('   ⚠️  Fix issues before proceeding')
}

console.log('\n')

