#!/usr/bin/env node

/**
 * Identifies potentially unused exports
 * Compares exports with imports to find unused code
 */

const fs = require('fs')
const path = require('path')

const importMapPath = path.join(__dirname, '../what_to_import.md')
const content = fs.readFileSync(importMapPath, 'utf-8')

// Parse files and their renders (exports)
const fileExports = new Map()
const filePattern = /### `([^`]+)`/g
const rendersPattern = /\*\*Renders Components:\*\*([\s\S]*?)(?=\n---|\n###|$)/g

let fileMatch
while ((fileMatch = filePattern.exec(content)) !== null) {
  const fileName = fileMatch[1]
  const fileSection = content.substring(fileMatch.index)
  const rendersMatch = fileSection.match(rendersPattern)
  
  if (rendersMatch) {
    const renders = rendersMatch[0]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*`?([^`]+)`?.*$/, '$1').trim())
      .filter(Boolean)
    
    if (renders.length > 0) {
      fileExports.set(fileName, renders)
    }
  }
}

// Parse imports
const imports = new Set()
const graphSection = content.match(/## Dependency Graph[\s\S]*?```([\s\S]*?)```/)?.[1]
if (graphSection) {
  const lines = graphSection.split('\n').filter(line => line.trim() && line.includes(' -> '))
  lines.forEach(line => {
    const match = line.match(/^[^\s]+\s*->\s*(.+)$/)
    if (match) {
      imports.add(match[1].replace(/\.(ts|tsx|js|jsx)$/, ''))
    }
  })
}

// Find potentially unused exports
const unusedExports = []
fileExports.forEach((exports, file) => {
  exports.forEach(exportName => {
    // Check if this export is imported anywhere
    const isImported = Array.from(imports).some(imp => 
      imp.includes(exportName) || 
      imp.endsWith('/' + exportName) ||
      imp === exportName
    )
    
    if (!isImported) {
      unusedExports.push({ file, export: exportName })
    }
  })
})

console.log('=== POTENTIALLY UNUSED EXPORTS ===\n')

if (unusedExports.length === 0) {
  console.log('✅ No obviously unused exports found!')
  console.log('   (Note: This is a heuristic - some exports may be used dynamically)')
} else {
  console.log(`⚠️  Found ${unusedExports.length} potentially unused export(s):\n`)
  
  const byFile = new Map()
  unusedExports.forEach(({ file, export: exp }) => {
    if (!byFile.has(file)) {
      byFile.set(file, [])
    }
    byFile.get(file).push(exp)
  })
  
  byFile.forEach((exports, file) => {
    console.log(`📄 ${file}`)
    exports.forEach(exp => {
      console.log(`   - ${exp}`)
    })
    console.log()
  })
  
  console.log('\n💡 Recommendation:')
  console.log('   - Review each export to confirm it\'s unused')
  console.log('   - Some may be used dynamically or in tests')
  console.log('   - Remove only after confirming they\'re not needed')
}

