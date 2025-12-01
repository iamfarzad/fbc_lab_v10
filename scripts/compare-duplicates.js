#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read source config
const configPath = path.join(__dirname, '..', '.source-config.json')
let sourceConfig = null

if (fs.existsSync(configPath)) {
  sourceConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
} else {
  console.error('\n❌ Source config not found!\n')
  process.exit(1)
}

const sourcePath = sourceConfig.sourcePath

// Duplicate mappings
const duplicates = {
  // Tools
  'tools/calculate-roi': [
    'api/_lib/core/tools/calculate-roi.ts',
    'src/core/tools/calculate-roi.ts'
  ],
  'tools/draft-follow-up-email': [
    'api/_lib/core/tools/draft-follow-up-email.ts',
    'src/core/tools/draft-follow-up-email.ts'
  ],
  'tools/extract-action-items': [
    'api/_lib/core/tools/extract-action-items.ts',
    'src/core/tools/extract-action-items.ts'
  ],
  'tools/generate-proposal': [
    'api/_lib/core/tools/generate-proposal.ts',
    'src/core/tools/generate-proposal.ts'
  ],
  'tools/generate-summary-preview': [
    'api/_lib/core/tools/generate-summary-preview.ts',
    'src/core/tools/generate-summary-preview.ts'
  ],
  'tools/shared-tool-registry': [
    'api/_lib/core/tools/shared-tool-registry.ts',
    'src/core/tools/shared-tool-registry.ts'
  ],
  'tools/shared-tools': [
    'api/_lib/core/tools/shared-tools.ts',
    'src/core/tools/shared-tools.ts'
  ],
  'tools/tool-executor': [
    'api/_lib/core/tools/tool-executor.ts',
    'src/core/tools/tool-executor.ts'
  ],
  'tools/tool-types': [
    'api/_lib/core/tools/tool-types.ts',
    'src/core/tools/tool-types.ts'
  ],
  'tools/types': [
    'api/_lib/core/tools/types.ts',
    'src/core/tools/types.ts'
  ],
  
  // Context
  'context/multimodal-context': [
    'api/_lib/context/multimodal-context.ts',
    'src/core/context/multimodal-context.ts'
  ],
  'context/context-storage': [
    'api/_lib/context/context-storage.ts',
    'src/core/context/context-storage.ts'
  ],
  
  // Analytics
  'analytics/agent-analytics': [
    'api/_lib/core/analytics/agent-analytics.ts',
    'src/core/analytics/agent-analytics.ts'
  ],
  'analytics/tool-analytics': [
    'api/_lib/core/analytics/tool-analytics.ts',
    'src/core/analytics/tool-analytics.ts'
  ],
  
  // Supabase
  'supabase/client': [
    'api/_lib/supabase/client.ts',
    'src/core/supabase/client.ts'
  ],
  
  // Config
  'config/constants': [
    'api/_lib/config/constants.ts',
    'src/config/constants.ts'
  ],
  'config/env': [
    'api/_lib/config/env.ts',
    'src/config/env.ts'
  ],
}

function readFile(filePath) {
  const fullPath = path.join(sourcePath, filePath)
  try {
    return fs.readFileSync(fullPath, 'utf-8')
  } catch (e) {
    return null
  }
}

function extractExports(content) {
  if (!content) return []
  
  const exports = []
  
  // Named exports
  const namedExportRegex = /export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/g
  let match
  while ((match = namedExportRegex.exec(content)) !== null) {
    exports.push({ name: match[1], type: 'named' })
  }
  
  // Default export
  if (content.includes('export default')) {
    exports.push({ name: 'default', type: 'default' })
  }
  
  // Export from
  const exportFromRegex = /export\s+\{[^}]+\}\s+from\s+['"]([^'"]+)['"]/g
  while ((match = exportFromRegex.exec(content)) !== null) {
    exports.push({ name: `from:${match[1]}`, type: 're-export' })
  }
  
  return exports
}

function extractFunctions(content) {
  if (!content) return []
  
  const functions = []
  
  // Function declarations
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g
  let match
  while ((match = funcRegex.exec(content)) !== null) {
    functions.push(match[1])
  }
  
  // Arrow functions
  const arrowRegex = /(?:export\s+)?(?:const|let)\s+(\w+)\s*[:=]\s*(?:async\s+)?\(/g
  while ((match = arrowRegex.exec(content)) !== null) {
    functions.push(match[1])
  }
  
  return [...new Set(functions)]
}

function extractClasses(content) {
  if (!content) return []
  
  const classes = []
  const classRegex = /(?:export\s+)?class\s+(\w+)/g
  let match
  while ((match = classRegex.exec(content)) !== null) {
    classes.push(match[1])
  }
  
  return classes
}

function extractInterfaces(content) {
  if (!content) return []
  
  const interfaces = []
  const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g
  let match
  while ((match = interfaceRegex.exec(content)) !== null) {
    interfaces.push(match[1])
  }
  
  return interfaces
}

function extractTypes(content) {
  if (!content) return []
  
  const types = []
  const typeRegex = /(?:export\s+)?type\s+(\w+)/g
  let match
  while ((match = typeRegex.exec(content)) !== null) {
    types.push(match[1])
  }
  
  return types
}

function compareFiles(file1, file2) {
  const content1 = readFile(file1)
  const content2 = readFile(file2)
  
  if (!content1 && !content2) {
    return { status: 'both_missing', differences: [] }
  }
  
  if (!content1) {
    return { status: 'file1_missing', differences: ['File 1 does not exist'] }
  }
  
  if (!content2) {
    return { status: 'file2_missing', differences: ['File 2 does not exist'] }
  }
  
  const differences = []
  
  // Compare exports
  const exports1 = extractExports(content1)
  const exports2 = extractExports(content2)
  const exports1Names = exports1.map(e => e.name).sort()
  const exports2Names = exports2.map(e => e.name).sort()
  
  if (JSON.stringify(exports1Names) !== JSON.stringify(exports2Names)) {
    const onlyIn1 = exports1Names.filter(e => !exports2Names.includes(e))
    const onlyIn2 = exports2Names.filter(e => !exports1Names.includes(e))
    
    if (onlyIn1.length > 0) {
      differences.push(`Exports only in source: ${onlyIn1.join(', ')}`)
    }
    if (onlyIn2.length > 0) {
      differences.push(`Exports only in target: ${onlyIn2.join(', ')}`)
    }
  }
  
  // Compare functions
  const funcs1 = extractFunctions(content1)
  const funcs2 = extractFunctions(content2)
  const onlyFuncs1 = funcs1.filter(f => !funcs2.includes(f))
  const onlyFuncs2 = funcs2.filter(f => !funcs1.includes(f))
  
  if (onlyFuncs1.length > 0) {
    differences.push(`Functions only in source: ${onlyFuncs1.join(', ')}`)
  }
  if (onlyFuncs2.length > 0) {
    differences.push(`Functions only in target: ${onlyFuncs2.join(', ')}`)
  }
  
  // Compare classes
  const classes1 = extractClasses(content1)
  const classes2 = extractClasses(content2)
  const onlyClasses1 = classes1.filter(c => !classes2.includes(c))
  const onlyClasses2 = classes2.filter(c => !classes1.includes(c))
  
  if (onlyClasses1.length > 0) {
    differences.push(`Classes only in source: ${onlyClasses1.join(', ')}`)
  }
  if (onlyClasses2.length > 0) {
    differences.push(`Classes only in target: ${onlyClasses2.join(', ')}`)
  }
  
  // Compare interfaces
  const interfaces1 = extractInterfaces(content1)
  const interfaces2 = extractInterfaces(content2)
  const onlyInterfaces1 = interfaces1.filter(i => !interfaces2.includes(i))
  const onlyInterfaces2 = interfaces2.filter(i => !interfaces1.includes(i))
  
  if (onlyInterfaces1.length > 0) {
    differences.push(`Interfaces only in source: ${onlyInterfaces1.join(', ')}`)
  }
  if (onlyInterfaces2.length > 0) {
    differences.push(`Interfaces only in target: ${onlyInterfaces2.join(', ')}`)
  }
  
  // Compare types
  const types1 = extractTypes(content1)
  const types2 = extractTypes(content2)
  const onlyTypes1 = types1.filter(t => !types2.includes(t))
  const onlyTypes2 = types2.filter(t => !types1.includes(t))
  
  if (onlyTypes1.length > 0) {
    differences.push(`Types only in source: ${onlyTypes1.join(', ')}`)
  }
  if (onlyTypes2.length > 0) {
    differences.push(`Types only in target: ${onlyTypes2.join(', ')}`)
  }
  
  // Line count comparison
  const lines1 = content1.split('\n').length
  const lines2 = content2.split('\n').length
  if (Math.abs(lines1 - lines2) > 10) {
    differences.push(`Significant line count difference: ${lines1} vs ${lines2} lines`)
  }
  
  return {
    status: differences.length === 0 ? 'identical' : 'different',
    differences,
    stats: {
      source: { lines: lines1, exports: exports1.length, functions: funcs1.length, classes: classes1.length },
      target: { lines: lines2, exports: exports2.length, functions: funcs2.length, classes: classes2.length }
    },
    content1,
    content2
  }
}

// Main
const category = process.argv[2] || 'all'

console.log('=== DUPLICATE FILE COMPARISON ===\n')
console.log(`Source: ${sourcePath}\n`)

const categories = {
  tools: Object.keys(duplicates).filter(k => k.startsWith('tools/')),
  context: Object.keys(duplicates).filter(k => k.startsWith('context/')),
  analytics: Object.keys(duplicates).filter(k => k.startsWith('analytics/')),
  supabase: Object.keys(duplicates).filter(k => k.startsWith('supabase/')),
  config: Object.keys(duplicates).filter(k => k.startsWith('config/')),
  all: Object.keys(duplicates)
}

const filesToCompare = categories[category] || categories.all

const results = {}

filesToCompare.forEach(name => {
  const files = duplicates[name]
  console.log(`\n📁 ${name}`)
  console.log(`   Source: ${files[0]}`)
  console.log(`   Target: ${files[1]}`)
  
  const comparison = compareFiles(files[0], files[1])
  results[name] = comparison
  
  if (comparison.status === 'both_missing') {
    console.log('   ⚠️  Both files missing')
  } else if (comparison.status === 'file1_missing') {
    console.log('   ⚠️  Source file missing')
  } else if (comparison.status === 'file2_missing') {
    console.log('   ⚠️  Target file missing')
  } else if (comparison.status === 'identical') {
    console.log('   ✅ Files appear identical')
  } else {
    console.log(`   ⚠️  Files differ:`)
    comparison.differences.forEach(diff => {
      console.log(`      - ${diff}`)
    })
    console.log(`   Stats: Source(${comparison.stats.source.lines} lines, ${comparison.stats.source.functions} funcs) vs Target(${comparison.stats.target.lines} lines, ${comparison.stats.target.functions} funcs)`)
  }
})

// Save results
const resultsPath = path.join(__dirname, '..', 'docs', 'duplicate-comparison-results.json')
fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2))
console.log(`\n✅ Results saved to: ${resultsPath}`)

console.log('\n\n=== SUMMARY ===')
const identical = Object.values(results).filter(r => r.status === 'identical').length
const different = Object.values(results).filter(r => r.status === 'different').length
const missing = Object.values(results).filter(r => r.status.includes('missing')).length

console.log(`Identical: ${identical}`)
console.log(`Different: ${different}`)
console.log(`Missing: ${missing}`)
