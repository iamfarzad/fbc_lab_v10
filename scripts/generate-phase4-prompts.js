#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Phase 4: Services Layer
const phase4 = {
  'agent-1': {
    name: 'Core Services',
    files: [
      'services/unifiedContext.ts',
      'services/standardChatService.ts',
    ],
    description: 'Import core services that provide unified context and standard chat functionality'
  },
  'agent-2': {
    name: 'AI Services',
    files: [
      'services/aiBrainService.ts',
      'services/chromeAiService.ts',
    ],
    description: 'Import AI services for brain and Chrome AI functionality'
  },
  'agent-3': {
    name: 'Research & Live Services',
    files: [
      'services/leadResearchService.ts',
      'services/geminiLiveService.ts',
    ],
    description: 'Import research and live WebSocket services'
  },
  'agent-4': {
    name: 'Validation & Fixes',
    files: [],
    description: 'Validate Phase 4 completion and fix any issues',
    tasks: [
      'Verify all Phase 4 files can be imported',
      'Run type-check and fix any errors',
      'Run lint and fix any issues',
      'Verify no circular dependencies',
      'Update PROJECT_STATUS.md with Phase 4 completion'
    ]
  }
}

function generatePrompt(agentId, agentConfig) {
  const filesSection = agentConfig.files.length > 0 ? `
Files to import (in this order):
${agentConfig.files.map((f, i) => {
  // Determine source path - check both api/_lib and root locations
  const apiPath = f.replace('services/', 'api/_lib/services/')
  const rootPath = f
  return `${i + 1}. ${f}
     Source: Check both ${rootPath} and ${apiPath} in original codebase`
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
2. Read docs/PHASE_3_COMPLETE.md for Phase 3 completion status
3. Read docs/COMMIT_PROCESS_LEARNINGS.md for commit process learnings
4. Access source files from original project:
   - Check .source-config.json for source location (${process.env.SOURCE_PATH || '/Users/farzad/fbc-lab-9'})
   - Read files directly from that path
   - Files may be in either api/_lib/services/ or services/ in the original codebase
   - Use: node scripts/import-file.js <file-path> --validate
5. For each file to import:
   a. Check if file exists in original codebase (try both paths)
   b. Import using: node scripts/import-file.js <source-path>
   c. Move to target location if needed (should already be in services/)
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
- Use absolute paths from root: 'src/lib/X', 'src/core/Y', 'services/Z'
- NO @/ aliases
- NO .js extensions
- NO relative paths (../)

DEPENDENCIES TO CHECK:
- unifiedContext depends on: (check imports)
- standardChatService depends on: unifiedContext, constants, types
- aiBrainService depends on: unifiedContext, types
- chromeAiService depends on: (check imports)
- leadResearchService depends on: constants, types
- geminiLiveService depends on: config, unifiedContext, live/client, types, audioUtils

See docs/PARALLEL_AGENT_STRATEGY.md for full workflow.
See docs/PHASE_3_COMPLETE.md for Phase 3 status.
`
}

// Generate prompts
const promptsDir = path.join(__dirname, 'agent-prompts')

if (!fs.existsSync(promptsDir)) {
  fs.mkdirSync(promptsDir, { recursive: true })
}

for (const [agentId, agentConfig] of Object.entries(phase4)) {
  const prompt = generatePrompt(agentId, agentConfig)
  const filePath = path.join(promptsDir, `phase-4-${agentId}.txt`)
  fs.writeFileSync(filePath, prompt)
  console.log(`✅ Generated: ${filePath}`)
}

console.log(`\n✅ Generated ${Object.keys(phase4).length} prompts for Phase 4`)
console.log(`\n📋 Next steps:`)
console.log(`1. Open ${Object.keys(phase4).length} agent chats in Cursor (click "New Agent")`)
console.log(`2. Copy-paste prompts from scripts/agent-prompts/phase-4-*.txt`)
console.log(`3. Each agent will work on their assigned files in parallel`)
console.log(`4. Monitor progress: Check PROJECT_STATUS.md after each agent completes`)
console.log(`5. After all complete: pnpm type-check && pnpm test --run`)
console.log(`\n📁 Prompts location: scripts/agent-prompts/`)

