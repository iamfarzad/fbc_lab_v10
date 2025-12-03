#!/usr/bin/env node

/**
 * Detects circular dependencies in the codebase
 * Analyzes import map to find circular import chains
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const importMapPath = path.join(__dirname, '../what_to_import.md')
const content = fs.readFileSync(importMapPath, 'utf-8')

// Parse imports from dependency graph section
const graphSection = content.match(/## Dependency Graph[\s\S]*?```([\s\S]*?)```/)?.[1]
if (!graphSection) {
  console.log('Could not find dependency graph section')
  process.exit(1)
}

// Build import map
const imports = new Map()
const lines = graphSection.split('\n').filter(line => line.trim() && line.includes(' -> '))

lines.forEach(line => {
  const match = line.match(/^([^\s]+)\s*->\s*(.+)$/)
  if (match) {
    const [_, from, to] = match
    const cleanFrom = from.replace(/\.(ts|tsx|js|jsx)$/, '')
    const cleanTo = to.replace(/\.(ts|tsx|js|jsx)$/, '')
    
    if (!imports.has(cleanFrom)) {
      imports.set(cleanFrom, [])
    }
    imports.get(cleanFrom).push(cleanTo)
  }
})

// DFS to find cycles
function findCycles() {
  const cycles = []
  const visited = new Set()
  const recStack = new Set()
  const path = []

  function dfs(node) {
    visited.add(node)
    recStack.add(node)
    path.push(node)

    const neighbors = imports.get(node) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cyclesFromNeighbor = dfs(neighbor)
        if (cyclesFromNeighbor.length > 0) {
          return cyclesFromNeighbor
        }
      } else if (recStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor)
        const cycle = path.slice(cycleStart).concat(neighbor)
        return cycle
      }
    }

    recStack.delete(node)
    path.pop()
    return []
  }

  for (const node of imports.keys()) {
    if (!visited.has(node)) {
      const cycle = dfs(node)
      if (cycle.length > 0) {
        cycles.push(cycle)
      }
    }
  }

  return cycles
}

// Find cycles
const cycles = findCycles()

console.log('=== CIRCULAR DEPENDENCY DETECTION ===\n')

if (cycles.length === 0) {
  console.log('✅ No circular dependencies detected!')
} else {
  console.log(`⚠️  Found ${cycles.length} circular dependency chain(s):\n`)
  cycles.forEach((cycle, index) => {
    console.log(`Cycle ${index + 1}:`)
    console.log(`  ${cycle.join(' → ')}`)
    console.log()
  })
  
  console.log('\n💡 Recommendation:')
  console.log('   - Extract shared code to a common module')
  console.log('   - Use dependency injection')
  console.log('   - Refactor to break the cycle')
}

