#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Phase 2 Continuation: Missing Dependencies
const phase2Continuation = {
  'agent-1': {
    name: 'Context Types & Core',
    files: [
      'api/_lib/context/context-types.ts',  // Import to src/core/context/context-types.ts
    ],
    description: 'Import context-types.ts which is required by context-storage, context-summarizer, and multimodal-context'
  },
  'agent-2': {
    name: 'Security System',
    files: [
      'api/_lib/core/security/pii-detector.ts',  // Import to src/core/security/pii-detector.ts
      'api/_lib/core/security/audit-logger.ts',   // Import to src/core/security/audit-logger.ts
    ],
    description: 'Import security files required by multimodal-context'
  },
  'agent-3': {
    name: 'Embeddings System',
    files: [
      'api/_lib/core/embeddings/gemini.ts',  // Import to src/core/embeddings/gemini.ts
      'api/_lib/core/embeddings/query.ts',   // Import to src/core/embeddings/query.ts
    ],
    description: 'Import embeddings files required by multimodal-context'
  },
  'agent-4': {
    name: 'Fix Import Paths & Validation',
    files: [],
    description: 'Fix remaining import paths and validate Phase 2 completion',
    tasks: [
      'Fix json-guards.ts import path (src/supabase/database.types → src/core/database.types)',
      'Verify all Phase 2 files can be imported',
      'Run type-check and fix any remaining errors',
      'Run lint and fix any issues',
      'Update PROJECT_STATUS.md'
    ]
  }
}

function generatePrompt(agentId, agentConfig) {
  const filesSection = agentConfig.files.length > 0 ? `
Files to import (in this order):
${agentConfig.files.map((f, i) => {
  // Map api/_lib paths to correct src paths
  let targetPath = f.replace('api/_lib/', 'src/')
  // Ensure context files go to src/core/context
  if (f.includes('context/')) {
    targetPath = f.replace('api/_lib/context/', 'src/core/context/')
  }
  // Ensure core files go to src/core
  if (f.includes('core/')) {
    targetPath = f.replace('api/_lib/core/', 'src/core/')
  }
  return `${i + 1}. ${f} → ${targetPath}`
}).join('\n')}
` : ''

  const tasksSection = agentConfig.tasks ? `
Tasks to complete:
${agentConfig.tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}
` : ''

  return `You are Agent ${agentId.split('-')[1]}: ${agentConfig.name}

TASK: ${agentConfig.description}

${filesSection}${tasksSection}
REQUIREMENTS:
1. Read PROJECT_STATUS.md to understand current state
2. Read docs/PHASE_2_COMPLETE.md for Phase 2 status
3. Access source files from original project:
   - Check .source-config.json for source location (${process.env.SOURCE_PATH || '/Users/farzad/fbc-lab-9'})
   - Read files directly from that path
   - Use: node scripts/import-file.js <file-path> --validate
4. For each file to import:
   a. Import using: node scripts/import-file.js <source-path>
   b. Move to target location: mv <imported-file> <target-path>
   c. Update import paths to absolute from root (no @/ aliases)
   d. Remove .js extensions from imports
   e. Fix any obvious type errors
5. After importing all files:
   - Run: pnpm type-check (MUST pass or fix errors)
   - Run: pnpm lint (MUST pass or fix errors)
   - Run: pnpm test --run (verify tests still pass)
6. Update PROJECT_STATUS.md with:
   - Files imported
   - Any issues found
   - Validation results

VALIDATION CHECKLIST:
- [ ] All files imported to correct locations
- [ ] All import paths updated (absolute from root)
- [ ] pnpm type-check passes (or errors documented)
- [ ] pnpm lint passes
- [ ] pnpm test --run passes
- [ ] PROJECT_STATUS.md updated

IMPORT PATH RULES:
- Use absolute paths from root: 'src/lib/X', 'src/core/Y'
- NO @/ aliases
- NO .js extensions
- NO relative paths (../)

See docs/PARALLEL_AGENT_STRATEGY.md for full workflow.
See docs/PHASE_2_COMPLETE.md for current Phase 2 status.
`
}

// Generate prompts
const promptsDir = path.join(__dirname, 'agent-prompts')

if (!fs.existsSync(promptsDir)) {
  fs.mkdirSync(promptsDir, { recursive: true })
}

for (const [agentId, agentConfig] of Object.entries(phase2Continuation)) {
  const prompt = generatePrompt(agentId, agentConfig)
  const filePath = path.join(promptsDir, `phase-2-continuation-${agentId}.txt`)
  fs.writeFileSync(filePath, prompt)
  console.log(`✅ Generated: ${filePath}`)
}

console.log(`\n✅ Generated ${Object.keys(phase2Continuation).length} prompts for Phase 2 Continuation`)
console.log(`\n📋 Next steps:`)
console.log(`1. Open ${Object.keys(phase2Continuation).length} agent chats in Cursor (click "New Agent")`)
console.log(`2. Copy-paste prompts from scripts/agent-prompts/phase-2-continuation-*.txt`)
console.log(`3. Each agent will work on their assigned files in parallel`)
console.log(`4. Monitor progress: Check PROJECT_STATUS.md after each agent completes`)
console.log(`5. After all complete: pnpm type-check && pnpm test --run`)
console.log(`\n📁 Prompts location: scripts/agent-prompts/`)

