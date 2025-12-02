#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.join(__dirname, '..')

// Load commit plan
const planPath = path.join(projectRoot, 'COMMIT_PLAN.json')
if (!fs.existsSync(planPath)) {
  console.error('❌ COMMIT_PLAN.json not found. Run: node scripts/categorize-commits.js')
  process.exit(1)
}

const commitPlan = JSON.parse(fs.readFileSync(planPath, 'utf-8'))

// Fix file paths (handle .gitignore and directories)
function fixFilePath(file) {
  if (file === 'gitignore') return '.gitignore'
  return file
}

// Check if file exists or is a directory
function fileExists(file) {
  const fullPath = path.join(projectRoot, fixFilePath(file))
  return fs.existsSync(fullPath)
}

// Get all files in a directory recursively
function getAllFilesInDir(dir) {
  const fullPath = path.join(projectRoot, fixFilePath(dir))
  if (!fs.existsSync(fullPath)) return []
  
  const files = []
  const entries = fs.readdirSync(fullPath, { withFileTypes: true })
  
  for (const entry of entries) {
    const entryPath = path.join(fullPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllFilesInDir(path.relative(projectRoot, entryPath)))
    } else {
      files.push(path.relative(projectRoot, entryPath))
    }
  }
  
  return files
}

// Expand directories to files
function expandFiles(files) {
  const expanded = []
  
  for (const file of files) {
    const fixed = fixFilePath(file)
    const fullPath = path.join(projectRoot, fixed)
    
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        expanded.push(...getAllFilesInDir(fixed))
      } else {
        expanded.push(fixed)
      }
    }
  }
  
  return expanded.filter(f => {
    // Skip logs
    if (f.startsWith('logs/')) return false
    // Skip node_modules
    if (f.includes('node_modules')) return false
    // Skip dist/build
    if (f.startsWith('dist/') || f.startsWith('build/')) return false
    return true
  })
}

// Execute commit
function executeCommit(plan, dryRun = false) {
  const { category, files, message } = plan
  
  console.log(`\n📦 ${category}`)
  console.log(`   Files: ${files.length}`)
  
  const expandedFiles = expandFiles(files)
  console.log(`   Expanded: ${expandedFiles.length} files`)
  
  if (expandedFiles.length === 0) {
    console.log('   ⚠️  No files to commit, skipping')
    return false
  }
  
  if (dryRun) {
    console.log(`   Would commit: ${expandedFiles.slice(0, 5).join(', ')}${expandedFiles.length > 5 ? '...' : ''}`)
    return true
  }
  
  try {
    // Stage files
    for (const file of expandedFiles) {
      try {
        execSync(`git add "${file}"`, { 
          cwd: projectRoot, 
          stdio: 'ignore' 
        })
      } catch (error) {
        console.log(`   ⚠️  Could not stage ${file}: ${error.message}`)
      }
    }
    
    // Commit
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
      cwd: projectRoot,
      stdio: 'inherit'
    })
    
    console.log(`   ✅ Committed ${expandedFiles.length} files`)
    return true
  } catch (error) {
    console.error(`   ❌ Error committing: ${error.message}`)
    return false
  }
}

// Main
const dryRun = process.argv.includes('--dry-run')
const startFrom = process.argv.find(arg => arg.startsWith('--from='))
const startIndex = startFrom ? parseInt(startFrom.split('=')[1]) - 1 : 0

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No commits will be made\n')
}

console.log(`📋 Executing ${commitPlan.length} commits${startIndex > 0 ? ` (starting from ${startIndex + 1})` : ''}\n`)

let successCount = 0
let failCount = 0

for (let i = startIndex; i < commitPlan.length; i++) {
  const plan = commitPlan[i]
  const success = executeCommit(plan, dryRun)
  
  if (success) {
    successCount++
  } else {
    failCount++
  }
  
  // Small delay between commits
  if (!dryRun && i < commitPlan.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

console.log(`\n📊 Summary:`)
console.log(`   ✅ Successful: ${successCount}`)
console.log(`   ❌ Failed: ${failCount}`)

if (!dryRun && successCount > 0) {
  console.log(`\n💡 Next step: git push origin main`)
}

