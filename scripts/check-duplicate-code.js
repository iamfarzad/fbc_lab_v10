#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.join(__dirname, '..')

// File extensions to check
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx']

// Minimum lines to consider for duplicate detection
const MIN_LINES = 5

// Similarity threshold (0-1)
const SIMILARITY_THRESHOLD = 0.8

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  
  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    // Skip node_modules, dist, build, .git
    if (file.startsWith('.') || file === 'node_modules' || file === 'dist' || file === 'build') {
      continue
    }
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList)
    } else if (EXTENSIONS.some(ext => file.endsWith(ext))) {
      fileList.push(filePath)
    }
  }
  
  return fileList
}

function normalizeCode(code) {
  // Remove comments
  code = code.replace(/\/\/.*$/gm, '')
  code = code.replace(/\/\*[\s\S]*?\*\//g, '')
  
  // Remove extra whitespace
  code = code.replace(/\s+/g, ' ').trim()
  
  // Remove string literals (keep structure)
  code = code.replace(/['"`][^'"`]*['"`]/g, '""')
  
  // Remove numbers
  code = code.replace(/\b\d+\b/g, '0')
  
  return code
}

function extractCodeBlocks(content) {
  const blocks = []
  const lines = content.split('\n')
  
  let currentBlock = []
  let inFunction = false
  let braceCount = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Detect function start
    if (/^(export\s+)?(async\s+)?(function|const|let|var)\s+\w+/.test(trimmed) || 
        /^(export\s+)?(async\s+)?\(/.test(trimmed)) {
      if (currentBlock.length >= MIN_LINES) {
        blocks.push({
          lines: currentBlock,
          startLine: i - currentBlock.length,
          endLine: i - 1
        })
      }
      currentBlock = [line]
      inFunction = true
      braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length
    } else if (inFunction) {
      currentBlock.push(line)
      braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length
      
      if (braceCount === 0 && trimmed && !trimmed.startsWith('//')) {
        // Function complete
        if (currentBlock.length >= MIN_LINES) {
          blocks.push({
            lines: currentBlock,
            startLine: i - currentBlock.length + 1,
            endLine: i + 1
          })
        }
        currentBlock = []
        inFunction = false
      }
    } else if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('import') && !trimmed.startsWith('export')) {
      // Collect inline code blocks
      currentBlock.push(line)
      if (currentBlock.length >= MIN_LINES) {
        blocks.push({
          lines: currentBlock,
          startLine: i - currentBlock.length + 1,
          endLine: i + 1
        })
        currentBlock = []
      }
    } else {
      if (currentBlock.length >= MIN_LINES) {
        blocks.push({
          lines: currentBlock,
          startLine: i - currentBlock.length,
          endLine: i - 1
        })
      }
      currentBlock = []
    }
  }
  
  if (currentBlock.length >= MIN_LINES) {
    blocks.push({
      lines: currentBlock,
      startLine: lines.length - currentBlock.length,
      endLine: lines.length
    })
  }
  
  return blocks
}

function calculateSimilarity(str1, str2) {
  const normalized1 = normalizeCode(str1)
  const normalized2 = normalizeCode(str2)
  
  if (normalized1 === normalized2) return 1.0
  
  // Simple similarity: count common tokens
  const tokens1 = new Set(normalized1.split(/\s+/))
  const tokens2 = new Set(normalized2.split(/\s+/))
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)))
  const union = new Set([...tokens1, ...tokens2])
  
  return intersection.size / union.size
}

function findDuplicates() {
  console.log('🔍 Scanning for duplicate code...\n')
  
  const files = getAllFiles(projectRoot)
  console.log(`Found ${files.length} files to check\n`)
  
  const codeBlocks = []
  
  // Extract code blocks from all files
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8')
      const blocks = extractCodeBlocks(content)
      
      for (const block of blocks) {
        const code = block.lines.join('\n')
        if (code.trim().length > 50) { // Minimum meaningful code
          codeBlocks.push({
            file: path.relative(projectRoot, file),
            code,
            startLine: block.startLine,
            endLine: block.endLine
          })
        }
      }
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message)
    }
  }
  
  console.log(`Extracted ${codeBlocks.length} code blocks\n`)
  
  // Find duplicates
  const duplicates = []
  const checked = new Set()
  
  for (let i = 0; i < codeBlocks.length; i++) {
    if (checked.has(i)) continue
    
    const block1 = codeBlocks[i]
    const similar = []
    
    for (let j = i + 1; j < codeBlocks.length; j++) {
      if (checked.has(j)) continue
      if (block1.file === codeBlocks[j].file) continue // Skip same file
      
      const similarity = calculateSimilarity(block1.code, codeBlocks[j].code)
      
      if (similarity >= SIMILARITY_THRESHOLD) {
        similar.push({
          file: codeBlocks[j].file,
          code: codeBlocks[j].code,
          startLine: codeBlocks[j].startLine,
          endLine: codeBlocks[j].endLine,
          similarity
        })
        checked.add(j)
      }
    }
    
    if (similar.length > 0) {
      duplicates.push({
        file: block1.file,
        code: block1.code,
        startLine: block1.startLine,
        endLine: block1.endLine,
        duplicates: similar
      })
      checked.add(i)
    }
  }
  
  return duplicates
}

// Main
const duplicates = findDuplicates()

if (duplicates.length === 0) {
  console.log('✅ No duplicate code found!\n')
  process.exit(0)
}

console.log(`\n⚠️  Found ${duplicates.length} duplicate code patterns:\n`)

let issueCount = 0

for (const dup of duplicates) {
  issueCount++
  console.log(`${issueCount}. ${dup.file}:${dup.startLine}-${dup.endLine}`)
  console.log(`   Code (${dup.code.split('\n').length} lines):`)
  console.log(`   ${dup.code.split('\n').slice(0, 3).join('\n   ')}${dup.code.split('\n').length > 3 ? '...' : ''}`)
  console.log(`\n   Duplicated in:`)
  
  for (const similar of dup.duplicates) {
    console.log(`   - ${similar.file}:${similar.startLine}-${similar.endLine} (${(similar.similarity * 100).toFixed(0)}% similar)`)
  }
  
  console.log('')
}

console.log(`\n⚠️  Total: ${issueCount} duplicate patterns found`)
console.log('\n💡 Recommendation: Extract common code into shared utilities\n')

process.exit(issueCount > 0 ? 1 : 0)

