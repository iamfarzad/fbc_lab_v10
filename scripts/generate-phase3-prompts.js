#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Phase 3: Core Infrastructure Completion
const phase3 = {
  'agent-1': {
    name: 'Tools System',
    files: [
      'src/core/tools/shared-tools.ts',
      'src/core/tools/tool-executor.ts',
      'src/core/tools/calculate-roi.ts',
      'src/core/tools/generate-proposal.ts',
      'src/core/tools/draft-follow-up-email.ts',
      'src/core/tools/extract-action-items.ts',
      'src/core/tools/generate-summary-preview.ts',
      'src/core/tools/shared-tool-registry.ts',
    ],
    description: 'Import all tools system files (8 files) - these are used by agents and services'
  },
  'agent-2': {
    name: 'Queue System',
    files: [
      'src/core/queue/redis-queue.ts',
      'src/core/queue/workers.ts',
    ],
    description: 'Import queue system files (2 files) - handles background jobs'
  },
  'agent-3': {
    name: 'Email & Live Client',
    files: [
      'src/core/email-service.ts',
      'src/core/live/client.ts',
    ],
    description: 'Import email service and live WebSocket client (2 files)'
  },
  'agent-4': {
    name: 'Validation & Fixes',
    files: [],
    description: 'Validate Phase 3 completion and fix any issues',
    tasks: [
      'Verify all Phase 3 files can be imported',
      'Run type-check and fix any errors',
      'Run lint and fix any issues',
      'Verify no circular dependencies',
      'Update PROJECT_STATUS.md with Phase 3 completion'
    ]
  }
}

function generatePrompt(agentId, agentConfig) {
  const filesSection = agentConfig.files.length > 0 ? `
Files to import (in this order):
${agentConfig.files.map((f, i) => {
  // Determine source path - check both api/_lib and src locations
  const apiPath = f.replace('src/', 'api/_lib/')
  const srcPath = f
  return `${i + 1}. ${f}
     Source: Check both ${apiPath} and ${srcPath} in original codebase`
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
2. Read docs/PHASE_2_FINAL_STATUS.md for Phase 2 completion status
3. Read docs/WHAT_IS_PHASE_3.md to understand Phase 3 goals
4. Access source files from original project:
   - Check .source-config.json for source location (${process.env.SOURCE_PATH || '/Users/farzad/fbc-lab-9'})
   - Read files directly from that path
   - Files may be in either api/_lib/ or src/ in the original codebase
   - Use: node scripts/import-file.js <file-path> --validate
5. For each file to import:
   a. Check if file exists in original codebase (try both api/_lib/ and src/ paths)
   b. Import using: node scripts/import-file.js <source-path>
   c. Move to target location if needed
   d. Update import paths to absolute from root (no @/ aliases)
   e. Remove .js extensions from imports
   f. Fix any obvious type errors
6. After importing all files:
   - Run: pnpm type-check (MUST pass or fix errors)
   - Run: pnpm lint (MUST pass or fix errors)
   - Run: pnpm test --run (verify tests still pass)
   - Run: pnpm check:circular (check for circular dependencies)
7. Update PROJECT_STATUS.md with:
   - Files imported
   - Any issues found
   - Validation results

VALIDATION CHECKLIST:
- [ ] All files imported to correct locations
- [ ] All import paths updated (absolute from root)
- [ ] pnpm type-check passes (or errors documented)
- [ ] pnpm lint passes
- [ ] pnpm test --run passes
- [ ] pnpm check:circular passes (no critical cycles)
- [ ] PROJECT_STATUS.md updated

IMPORT PATH RULES:
- Use absolute paths from root: 'src/lib/X', 'src/core/Y'
- NO @/ aliases
- NO .js extensions
- NO relative paths (../)

DEPENDENCIES TO CHECK:
- Tools depend on: context-storage, multimodal-context, pdf-generator
- Queue depends on: job-types, retry-config, vercel-cache, context-storage
- Email depends on: (check imports)
- Live client depends on: (check imports)

See docs/PARALLEL_AGENT_STRATEGY.md for full workflow.
See docs/WHAT_IS_PHASE_3.md for Phase 3 details.
`
}

// Generate prompts
const promptsDir = path.join(__dirname, 'agent-prompts')

if (!fs.existsSync(promptsDir)) {
  fs.mkdirSync(promptsDir, { recursive: true })
}

for (const [agentId, agentConfig] of Object.entries(phase3)) {
  const prompt = generatePrompt(agentId, agentConfig)
  const filePath = path.join(promptsDir, `phase-3-${agentId}.txt`)
  fs.writeFileSync(filePath, prompt)
  console.log(`✅ Generated: ${filePath}`)
}

console.log(`\n✅ Generated ${Object.keys(phase3).length} prompts for Phase 3`)
console.log(`\n📋 Next steps:`)
console.log(`1. Open ${Object.keys(phase3).length} agent chats in Cursor (click "New Agent")`)
console.log(`2. Copy-paste prompts from scripts/agent-prompts/phase-3-*.txt`)
console.log(`3. Each agent will work on their assigned files in parallel`)
console.log(`4. Monitor progress: Check PROJECT_STATUS.md after each agent completes`)
console.log(`5. After all complete: pnpm type-check && pnpm test --run`)
console.log(`\n📁 Prompts location: scripts/agent-prompts/`)

