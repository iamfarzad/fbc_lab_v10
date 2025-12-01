#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read source config
const configPath = path.join(__dirname, '..', '.source-config.json')
if (!fs.existsSync(configPath)) {
  console.error('\n❌ .source-config.json not found!\n')
  process.exit(1)
}

const sourceConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
const sourcePath = sourceConfig.sourcePath

if (!fs.existsSync(sourcePath)) {
  console.error(`\n❌ Source path not found: ${sourcePath}\n`)
  process.exit(1)
}

console.log('\n🔍 Analyzing Original Codebase...\n')
console.log(`Source: ${sourcePath}\n`)

// Read what_to_import.md to get expected files
const importMapPath = path.join(__dirname, '..', 'what_to_import.md')
const importMap = fs.readFileSync(importMapPath, 'utf-8')

// Extract file paths from import map
const filePattern = /### `([^`]+)`/g
const expectedFiles = new Set()
let match
while ((match = filePattern.exec(importMap)) !== null) {
  expectedFiles.add(match[1])
}

console.log(`📋 Expected files from import map: ${expectedFiles.size}\n`)

// Analyze structure
const analysis = {
  rootFiles: [],
  directories: [],
  missingFiles: [],
  unexpectedFiles: [],
  duplicates: {
    tools: [],
    context: [],
    analytics: [],
    supabase: [],
    config: []
  },
  buildConfig: {},
  packageInfo: {}
}

// Check root files
const rootFiles = fs.readdirSync(sourcePath).filter(f => {
  const fullPath = path.join(sourcePath, f)
  return fs.statSync(fullPath).isFile()
})

analysis.rootFiles = rootFiles

// Check directories
const directories = fs.readdirSync(sourcePath).filter(f => {
  const fullPath = path.join(sourcePath, f)
  return fs.statSync(fullPath).isDirectory() && f !== 'node_modules' && f !== '.git'
})

analysis.directories = directories

// Check build tool
const viteConfigPath = path.join(sourcePath, 'vite.config.ts')
const nextConfigPath = path.join(sourcePath, 'next.config.js')
const nextConfigTsPath = path.join(sourcePath, 'next.config.ts')

if (fs.existsSync(viteConfigPath)) {
  analysis.buildConfig.tool = 'Vite'
  analysis.buildConfig.configFile = 'vite.config.ts'
} else if (fs.existsSync(nextConfigPath) || fs.existsSync(nextConfigTsPath)) {
  analysis.buildConfig.tool = 'Next.js'
  analysis.buildConfig.configFile = fs.existsSync(nextConfigPath) ? 'next.config.js' : 'next.config.ts'
} else {
  analysis.buildConfig.tool = 'Unknown'
}

// Check package.json
const packageJsonPath = path.join(sourcePath, 'package.json')
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  analysis.packageInfo.name = pkg.name
  analysis.packageInfo.version = pkg.version
  analysis.packageInfo.scripts = Object.keys(pkg.scripts || {})
  analysis.packageInfo.dependencies = Object.keys(pkg.dependencies || {})
  analysis.packageInfo.devDependencies = Object.keys(pkg.devDependencies || {})
}

// Check for duplicates
const duplicateChecks = [
  {
    name: 'tools',
    paths: [
      'api/_lib/core/tools',
      'src/core/tools'
    ]
  },
  {
    name: 'context',
    paths: [
      'api/_lib/context',
      'src/core/context'
    ]
  },
  {
    name: 'analytics',
    paths: [
      'api/_lib/core/analytics',
      'src/core/analytics'
    ]
  },
  {
    name: 'supabase',
    paths: [
      'api/_lib/supabase',
      'src/core/supabase'
    ]
  },
  {
    name: 'config',
    paths: [
      'api/_lib/config',
      'src/config'
    ]
  }
]

for (const check of duplicateChecks) {
  for (const dirPath of check.paths) {
    const fullPath = path.join(sourcePath, dirPath)
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
      analysis.duplicates[check.name].push({
        path: dirPath,
        files: files
      })
    }
  }
}

// Check for key files
const keyFiles = [
  'types.ts',
  'config.ts',
  'App.tsx',
  'index.tsx',
  'package.json',
  'tsconfig.json',
  'vite.config.ts'
]

console.log('📁 Structure Analysis:\n')
console.log('Root Directories:')
analysis.directories.forEach(dir => {
  const fullPath = path.join(sourcePath, dir)
  const fileCount = fs.readdirSync(fullPath).length
  console.log(`  - ${dir}/ (${fileCount} items)`)
})

console.log('\nRoot Files:')
analysis.rootFiles.forEach(file => {
  console.log(`  - ${file}`)
})

console.log('\n🔧 Build Configuration:')
console.log(`  Tool: ${analysis.buildConfig.tool}`)
if (analysis.buildConfig.configFile) {
  console.log(`  Config: ${analysis.buildConfig.configFile}`)
}

console.log('\n📦 Package Info:')
if (analysis.packageInfo.name) {
  console.log(`  Name: ${analysis.packageInfo.name}`)
  console.log(`  Version: ${analysis.packageInfo.version || 'N/A'}`)
  console.log(`  Scripts: ${analysis.packageInfo.scripts.length}`)
  console.log(`  Dependencies: ${analysis.packageInfo.dependencies.length}`)
  console.log(`  Dev Dependencies: ${analysis.packageInfo.devDependencies.length}`)
}

console.log('\n🔄 Duplicate Analysis:\n')
for (const [category, locations] of Object.entries(analysis.duplicates)) {
  if (locations.length > 0) {
    console.log(`${category}:`)
    locations.forEach(loc => {
      console.log(`  - ${loc.path} (${loc.files.length} files)`)
      if (loc.files.length > 0 && loc.files.length <= 5) {
        loc.files.forEach(f => console.log(`    • ${f}`))
      }
    })
  }
}

// Check for server directory
const serverPath = path.join(sourcePath, 'server')
if (fs.existsSync(serverPath)) {
  const serverFiles = fs.readdirSync(serverPath).filter(f => {
    const fullPath = path.join(serverPath, f)
    return fs.statSync(fullPath).isFile() && (f.endsWith('.ts') || f.endsWith('.js'))
  })
  console.log(`\n🖥️  Server Directory: ${serverFiles.length} files`)
  
  // Check for server package.json
  const serverPkgPath = path.join(serverPath, 'package.json')
  if (fs.existsSync(serverPkgPath)) {
    const serverPkg = JSON.parse(fs.readFileSync(serverPkgPath, 'utf-8'))
    console.log(`  Server has own package.json: ✅`)
    console.log(`  Server dependencies: ${Object.keys(serverPkg.dependencies || {}).length}`)
  }
}

// Check for API directory
const apiPath = path.join(sourcePath, 'api')
if (fs.existsSync(apiPath)) {
  const apiDirs = fs.readdirSync(apiPath).filter(f => {
    const fullPath = path.join(apiPath, f)
    return fs.statSync(fullPath).isDirectory()
  })
  console.log(`\n🌐 API Directory: ${apiDirs.length} subdirectories`)
  apiDirs.forEach(dir => {
    if (dir !== 'node_modules' && dir !== '_archive' && dir !== '_admin-disabled') {
      console.log(`  - ${dir}/`)
    }
  })
}

// Check for src directory
const srcPath = path.join(sourcePath, 'src')
if (fs.existsSync(srcPath)) {
  const srcDirs = fs.readdirSync(srcPath).filter(f => {
    const fullPath = path.join(srcPath, f)
    return fs.statSync(fullPath).isDirectory()
  })
  console.log(`\n📂 src/ Directory: ${srcDirs.length} subdirectories`)
  srcDirs.forEach(dir => {
    console.log(`  - ${dir}/`)
  })
}

// Verify key files exist
console.log('\n✅ Key Files Check:')
keyFiles.forEach(file => {
  const fullPath = path.join(sourcePath, file)
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${file}`)
  } else {
    console.log(`  ❌ ${file} (MISSING)`)
    analysis.missingFiles.push(file)
  }
})

// Summary
console.log('\n' + '='.repeat(60))
console.log('📊 Analysis Summary')
console.log('='.repeat(60))
console.log(`Build Tool: ${analysis.buildConfig.tool}`)
console.log(`Root Directories: ${analysis.directories.length}`)
console.log(`Root Files: ${analysis.rootFiles.length}`)
console.log(`Missing Key Files: ${analysis.missingFiles.length}`)

// Check for potential issues
const issues = []

if (analysis.buildConfig.tool !== 'Vite') {
  issues.push(`⚠️  Build tool is ${analysis.buildConfig.tool}, expected Vite`)
}

if (analysis.missingFiles.length > 0) {
  issues.push(`⚠️  Missing key files: ${analysis.missingFiles.join(', ')}`)
}

// Check for duplicate locations
const hasDuplicates = Object.values(analysis.duplicates).some(locs => locs.length > 1)
if (hasDuplicates) {
  console.log('\n⚠️  Duplicates Found (need comparison):')
  for (const [category, locations] of Object.entries(analysis.duplicates)) {
    if (locations.length > 1) {
      console.log(`  - ${category}: ${locations.length} locations`)
    }
  }
} else {
  console.log('\n✅ No duplicates detected (or structure differs)')
}

if (issues.length > 0) {
  console.log('\n⚠️  Potential Issues:')
  issues.forEach(issue => console.log(`  ${issue}`))
} else {
  console.log('\n✅ No major issues detected')
}

console.log('\n')

