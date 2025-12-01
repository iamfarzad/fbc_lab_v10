#!/usr/bin/env node

/**
 * Checks for potential secrets in staged files
 * Scans for common patterns of API keys, passwords, tokens, etc.
 */

const { execSync } = require('child_process')

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
  
  secretPatterns.forEach(({ pattern, name }) => {
    const matches = content.match(pattern)
    if (matches) {
      // Get line numbers
      const lines = content.split('\n')
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
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

