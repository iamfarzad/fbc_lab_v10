#!/usr/bin/env node

/**
 * Checks for potential secrets in staged files
 * Scans for common patterns of API keys, passwords, tokens, etc.
 */

import { execSync } from 'child_process'

// Patterns to detect secrets
const secretPatterns = [
  // API Keys
  { pattern: /api[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}/i, name: 'API Key' },
  { pattern: /apikey\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}/i, name: 'API Key' },
  { pattern: /google[_-]?api[_-]?key/i, name: 'Google API Key' },
  { pattern: /openai[_-]?api[_-]?key/i, name: 'OpenAI API Key' },
  { pattern: /gemini[_-]?api[_-]?key/i, name: 'Gemini API Key' },
  
  // Tokens
  { pattern: /token\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}/i, name: 'Token' },
  { pattern: /access[_-]?token/i, name: 'Access Token' },
  { pattern: /refresh[_-]?token/i, name: 'Refresh Token' },
  { pattern: /bearer\s+[a-zA-Z0-9_-]{20,}/i, name: 'Bearer Token' },
  
  // Passwords
  { pattern: /password\s*[:=]\s*['"]?[^'"]{8,}/i, name: 'Password' },
  { pattern: /pwd\s*[:=]\s*['"]?[^'"]{8,}/i, name: 'Password' },
  { pattern: /pass\s*[:=]\s*['"]?[^'"]{8,}/i, name: 'Password' },
  
  // Secrets
  { pattern: /secret\s*[:=]\s*['"]?[a-zA-Z0-9_-]{16,}/i, name: 'Secret' },
  { pattern: /secret[_-]?key/i, name: 'Secret Key' },
  { pattern: /jwt[_-]?secret/i, name: 'JWT Secret' },
  { pattern: /private[_-]?key/i, name: 'Private Key' },
  
  // Credentials
  { pattern: /credential/i, name: 'Credential' },
  { pattern: /auth[_-]?token/i, name: 'Auth Token' },
  
  // Connection strings with passwords
  { pattern: /(postgres|mysql|mongodb):\/\/[^:]+:[^@]+@/i, name: 'Database Connection String' },
  
  // Service account keys
  { pattern: /"type"\s*:\s*"service_account"/i, name: 'Service Account Key' },
  { pattern: /"private_key"/i, name: 'Private Key (JSON)' },
  
  // Environment files with real values
  { pattern: /\.env$/i, name: '.env file' },
  { pattern: /\.env\.(local|production|development)$/i, name: 'Environment file' },
  
  // Deployment configs (may contain secrets)
  { pattern: /fly\.toml$/i, name: 'fly.toml (check for secrets)' },
  { pattern: /vercel\.json$/i, name: 'vercel.json (check for secrets)' },
  { pattern: /supabase\/config\.toml$/i, name: 'supabase/config.toml (check for secrets)' },
]

// Get staged files
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
    return output.split('\n').filter(Boolean)
  } catch (e) {
    return []
  }
}

// Get file content
function getFileContent(filePath) {
  try {
    return execSync(`git show :${filePath}`, { encoding: 'utf-8' })
  } catch (e) {
    try {
      return require('fs').readFileSync(filePath, 'utf-8')
    } catch (e2) {
      return ''
    }
  }
}

// Check file for secrets
function checkFile(filePath) {
  const content = getFileContent(filePath)
  const issues = []
  
  // Skip false positive files
  if (filePath.includes('.gitignore') || 
      filePath.includes('check-secrets.js') ||
      filePath.includes('duplicate-comparison-results.json') ||
      (filePath.includes('docs/') && filePath.endsWith('.json'))) {
    return []
  }
  
  // Skip files that only reference env vars (not actual keys)
  // Code like `process.env.GEMINI_API_KEY` is safe - it's reading from env, not hardcoding
  const isEnvVarReference = (line) => {
    return line.includes('process.env.') && 
           !line.match(/['"][a-zA-Z0-9_-]{32,}['"]/) && // No actual long keys
           !line.match(/=\s*['"][a-zA-Z0-9_-]{20,}['"]/) // No assignment of long strings
  }
  
  secretPatterns.forEach(({ pattern, name }) => {
    // Skip credential/private-key patterns for code files (too many false positives)
    if ((name === 'Credential' || name === 'Private Key' || name === 'Private Key (JSON)') &&
        (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js'))) {
      // Only flag if it looks like actual credential data, not just the word
      if (!content.match(/["'](type|private_key|credential)["']\s*[:=]/)) {
        return
      }
    }
    
    // Skip API key patterns that are just env var references or error messages
    if (name.includes('API Key') && filePath.endsWith('.ts')) {
      // Skip error messages that mention API keys but don't contain actual keys
      if (content.match(/error.*api.*key.*not.*configure/i) ||
          content.match(/api.*key.*not.*configure/i) ||
          content.match(/please.*set.*api.*key/i) ||
          content.match(/api.*key.*environment.*variable/i)) {
        return
      }
      // Only flag if there's an actual long string that looks like a key
      if (!content.match(/['"][a-zA-Z0-9_-]{32,}['"]/)) {
        return
      }
    }
    
    const matches = content.match(pattern)
    if (matches) {
      // Get line numbers
      const lines = content.split('\n')
      lines.forEach((line, index) => {
        // Skip env var references
        if (isEnvVarReference(line)) {
          return
        }
        
        if (pattern.test(line)) {
          // Additional check: skip if it's just a comment or documentation
          if (line.trim().startsWith('//') || 
              line.trim().startsWith('*') ||
              line.trim().startsWith('#')) {
            return
          }
          
          // Skip function names that contain password-related words (false positives)
          if (name === 'Password' && (
              line.match(/^(const|let|var|function)\s+\w*[Pp]assword/i) ||
              line.match(/handle\w*[Pp]ass/i) ||
              line.match(/on\w*[Pp]ass/i) ||
              line.match(/^\s*[a-zA-Z_]\w*\s*[:=]\s*\(/))) {
            return
          }
          
          // Skip documentation files that mention API keys/env vars in examples
          if ((name.includes('API Key') || name.includes('Secret')) && (
              filePath.endsWith('.md') ||
              filePath.includes('DEPLOY') ||
              filePath.includes('docs/'))) {
            // Skip if it's just mentioning an env var name (backticks, brackets, etc.)
            if (line.match(/[`\[\]]\s*[A-Z_]+[A-Z_0-9]*\s*[`\[\]]/) ||
                line.match(/process\.env\./) ||
                line.match(/^\s*[-*]\s*\[/)) { // Checklist items
              return
            }
            // Only flag if it looks like an actual key (long string)
            if (!line.match(/['"][a-zA-Z0-9_-]{32,}['"]/)) {
              return
            }
          }
          
          issues.push({
            type: name,
            line: index + 1,
            preview: line.trim().substring(0, 80)
          })
        }
      })
    }
  })
  
  return issues
}

// Main
const stagedFiles = getStagedFiles()

if (stagedFiles.length === 0) {
  console.log('✅ No staged files to check')
  process.exit(0)
}

console.log('🔍 Checking for secrets in staged files...\n')

let foundSecrets = false
const allIssues = []

stagedFiles.forEach(file => {
  // Skip binary files and node_modules
  if (file.includes('node_modules') || 
      file.match(/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf)$/i)) {
    return
  }
  
  // Skip .example files (these are safe to commit)
  if (file.endsWith('.example') || file.includes('.example.')) {
    return
  }
  
  const issues = checkFile(file)
  if (issues.length > 0) {
    foundSecrets = true
    allIssues.push({ file, issues })
  }
})

if (foundSecrets) {
  console.log('❌ POTENTIAL SECRETS DETECTED!\n')
  console.log('⚠️  DO NOT COMMIT THESE FILES!\n')
  
  allIssues.forEach(({ file, issues }) => {
    console.log(`📄 ${file}`)
    issues.forEach(({ type, line, preview }) => {
      console.log(`   Line ${line}: ${type}`)
      console.log(`   ${preview}...`)
    })
    console.log()
  })
  
  console.log('💡 Recommendations:')
  console.log('   1. Remove secrets from code')
  console.log('   2. Use environment variables instead')
  console.log('   3. Add to .env file (which is gitignored)')
  console.log('   4. Use .env.example for documentation')
  console.log('   5. If already committed, rotate the secrets immediately!')
  console.log()
  console.log('❌ Commit blocked to prevent secret exposure')
  process.exit(1)
} else {
  console.log('✅ No obvious secrets detected in staged files')
  console.log('   (Always review manually - this is a heuristic check)')
}

