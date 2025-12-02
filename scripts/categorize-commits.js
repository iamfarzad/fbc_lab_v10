#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.join(__dirname, '..')

// Get git status
function getGitStatus() {
  try {
    const output = execSync('git status --short', { cwd: projectRoot, encoding: 'utf-8' })
    return output.trim().split('\n').filter(line => line.trim())
  } catch (error) {
    console.error('Error getting git status:', error.message)
    return []
  }
}

// Categorize files
function categorizeFiles(statusLines) {
  const categories = {
    'chore: update gitignore': [],
    'chore: add duplicate detection script': [],
    'feat: add admin API routes': [],
    'feat: add admin UI components': [],
    'feat: add shadcn/ui component library': [],
    'feat: add context and intelligence system': [],
    'feat: add PDF system': [],
    'feat: add database migrations': [],
    'feat: add hooks system': [],
    'feat: add core services and utilities': [],
    'feat: add types and schemas': [],
    'refactor: enhance admin chat service': [],
    'refactor: update core services': [],
    'refactor: update test files': [],
    'chore: update dependencies and config': [],
    'docs: add comprehensive documentation': [],
    'chore: add analysis and gap reports': []
  }
  
  for (const line of statusLines) {
    const status = line.substring(0, 2).trim()
    const file = line.substring(3).trim()
    
    // Skip deleted files for now (handle separately)
    if (status === 'D') continue
    
    // Skip logs (should be gitignored)
    if (file.startsWith('logs/')) continue
    
    // Gitignore
    if (file === '.gitignore') {
      categories['chore: update gitignore'].push(file)
    }
    // Scripts
    else if (file.startsWith('scripts/') && file.includes('check-duplicate-code')) {
      categories['chore: add duplicate detection script'].push(file)
    }
    // Admin API routes
    else if (file.startsWith('api/admin/')) {
      categories['feat: add admin API routes'].push(file)
    }
    // Admin UI components
    else if (file.startsWith('components/admin/')) {
      categories['feat: add admin UI components'].push(file)
    }
    // shadcn/ui components
    else if (file.startsWith('components/ui/')) {
      categories['feat: add shadcn/ui component library'].push(file)
    }
    // Context and intelligence
    else if (file.startsWith('src/core/context/') || 
             file.startsWith('src/core/intelligence/')) {
      categories['feat: add context and intelligence system'].push(file)
    }
    // PDF system
    else if (file.startsWith('src/core/pdf') || 
             file.includes('pdf-')) {
      categories['feat: add PDF system'].push(file)
    }
    // Migrations
    else if (file.startsWith('supabase/migrations/')) {
      categories['feat: add database migrations'].push(file)
    }
    // Hooks
    else if (file.startsWith('src/hooks/')) {
      categories['feat: add hooks system'].push(file)
    }
    // Core services
    else if (file.startsWith('src/core/admin/') ||
             file.startsWith('src/core/db/') ||
             file.startsWith('src/core/token-usage-logger')) {
      categories['feat: add core services and utilities'].push(file)
    }
    // Types and schemas
    else if (file.startsWith('src/types/') || 
             file.startsWith('src/schemas/') ||
             file.startsWith('src/lib/')) {
      categories['feat: add types and schemas'].push(file)
    }
    // Admin chat service refactor
    else if (file.includes('admin-chat-service')) {
      categories['refactor: enhance admin chat service'].push(file)
    }
    // Core service updates
    else if (file.startsWith('src/core/') && 
             (file.includes('embeddings') || 
              file.includes('tools') || 
              file.includes('queue'))) {
      categories['refactor: update core services'].push(file)
    }
    // Test files
    else if (file.includes('__tests__') || file.includes('.test.')) {
      categories['refactor: update test files'].push(file)
    }
    // Dependencies and config
    else if (file === 'package.json' || 
             file === 'pnpm-lock.yaml' ||
             file === 'vitest.config.ts' ||
             file === 'postcss.config.js' ||
             file === 'tailwind.config.js' ||
             file === 'index.html' ||
             file === 'index.tsx' ||
             file === 'index.css') {
      categories['chore: update dependencies and config'].push(file)
    }
    // Documentation
    else if (file.startsWith('docs/')) {
      categories['docs: add comprehensive documentation'].push(file)
    }
    // Analysis reports
    else if (file.endsWith('_REPORT.md') || 
             file.endsWith('_ANALYSIS.md') ||
             file.includes('ANALYSIS') ||
             file.includes('GAP') ||
             file.includes('COMMIT') ||
             file.includes('VALIDATION')) {
      categories['chore: add analysis and gap reports'].push(file)
    }
    // App and components updates
    else if (file === 'App.tsx' || 
             file.startsWith('components/') ||
             file.startsWith('context/') ||
             file.startsWith('services/') ||
             file.startsWith('api/')) {
      categories['refactor: update core services'].push(file)
    }
    // Everything else
    else {
      categories['chore: update dependencies and config'].push(file)
    }
  }
  
  // Remove empty categories
  const result = {}
  for (const [category, files] of Object.entries(categories)) {
    if (files.length > 0) {
      result[category] = files
    }
  }
  
  return result
}

// Generate commit message
function generateCommitMessage(category, files) {
  const fileCount = files.length
  const fileList = files.slice(0, 10).map(f => `- ${f}`).join('\n')
  const moreFiles = files.length > 10 ? `\n- ... and ${files.length - 10} more files` : ''
  
  return `${category}

${fileCount} file${fileCount !== 1 ? 's' : ''}:
${fileList}${moreFiles}`
}

// Main
const statusLines = getGitStatus()
const categories = categorizeFiles(statusLines)

console.log('📦 Commit Categories:\n')

const commitPlan = []

for (const [category, files] of Object.entries(categories)) {
  console.log(`${category}: ${files.length} files`)
  commitPlan.push({
    category,
    files,
    message: generateCommitMessage(category, files)
  })
}

console.log(`\n📊 Total: ${Object.values(categories).flat().length} files to commit\n`)

// Save commit plan
const planPath = path.join(projectRoot, 'COMMIT_PLAN.json')
fs.writeFileSync(planPath, JSON.stringify(commitPlan, null, 2))
console.log(`💾 Commit plan saved to: ${planPath}\n`)

// Display plan
console.log('📋 Commit Order:\n')
commitPlan.forEach((plan, index) => {
  console.log(`${index + 1}. ${plan.category}`)
  console.log(`   Files: ${plan.files.length}`)
  console.log(`   Example: ${plan.files[0]}`)
  console.log('')
})

console.log('\n✅ Ready to commit! Run: node scripts/execute-commits.js')

