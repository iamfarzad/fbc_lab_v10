#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const phases = {
  'phase-1': {
    'agent-1': {
      name: 'Types Foundation',
      files: [
        'types.ts',
        'src/types/core.ts',
        'src/types/conversation-flow.ts',
        'src/core/database.types.ts',
        'src/core/live/types.ts',
        'src/core/tools/tool-types.ts',
        'src/core/tools/types.ts',
        'src/core/queue/job-types.ts',
        'server/message-types.ts',
        'server/message-payload-types.ts'
      ]
    },
    'agent-2': {
      name: 'Config Foundation',
      files: [
        'config.ts',
        'src/config/constants.ts',
        'src/config/env.ts',
        'src/config/live-tools.ts',
        'src/lib/ai/retry-config.ts'
      ]
    },
    'agent-3': {
      name: 'Core Utilities',
      files: [
        'src/lib/errors.ts',
        'src/lib/logger.ts',
        'src/lib/supabase.ts',
        'src/lib/supabase-parsers.ts',
        'src/lib/hash-utils.ts',
        'src/lib/exit-detection.ts',
        'src/lib/json.ts',
        'src/lib/vercel-cache.ts',
        'src/lib/ai-client.ts',
        'src/lib/text-utils.ts',
        'src/lib/code-quality.ts',
        'utils/browser-compat.ts',
        'utils/audioUtils.ts',
        'utils/visuals/store.ts',
        'utils/pdfUtils.ts'
      ]
    },
    'agent-4': {
      name: 'Schemas & Validation',
      files: [
        'src/schemas/supabase.ts',
        'src/schemas/agents.ts',
        'src/schemas/admin.ts'
      ]
    }
  }
}

function generatePrompt(phase, agentId, agentConfig) {
  return `You are Agent ${agentId.split('-')[1]}: ${agentConfig.name}

TASK: Import ${agentConfig.name} files (${agentConfig.files.length} files)

Files to import (in this order):
${agentConfig.files.map((f, i) => `${i + 1}. ${f}`).join('\n')}

REQUIREMENTS:
1. Read PROJECT_STATUS.md to understand current state
2. Read docs/IMPORT_ORDER.md for file locations
3. Access source files from original project:
   - Check .source-config.json for source location
   - If local path: Read files directly from that path
   - If repository: Request file contents or use API
   - Use: node scripts/import-file.js <file-path> --validate
4. Import files in dependency order listed above
5. Update import paths to absolute from root (no @/ aliases)
6. Remove any @/ aliases
7. Run validation after each file:
   - pnpm type-check (MUST pass)
   - pnpm lint (MUST pass)
8. Fix all errors before proceeding
9. Update PROJECT_STATUS.md with:
   - Files imported
   - Any issues found
   - Validation results

VALIDATION CHECKLIST:
- [ ] All ${agentConfig.files.length} files imported
- [ ] pnpm type-check passes
- [ ] pnpm lint passes
- [ ] No type errors
- [ ] No lint errors
- [ ] PROJECT_STATUS.md updated

See docs/PARALLEL_AGENT_STRATEGY.md for full workflow.
See docs/AGENT_COORDINATION.md for coordination guide.
`
}

// Generate prompts
const phase = process.argv[2] || 'phase-1'
const promptsDir = path.join(__dirname, 'agent-prompts')

if (!fs.existsSync(promptsDir)) {
  fs.mkdirSync(promptsDir, { recursive: true })
}

const phaseConfig = phases[phase]
if (!phaseConfig) {
  console.error(`Unknown phase: ${phase}`)
  console.error(`Available phases: ${Object.keys(phases).join(', ')}`)
  process.exit(1)
}

for (const [agentId, agentConfig] of Object.entries(phaseConfig)) {
  const prompt = generatePrompt(phase, agentId, agentConfig)
  const filePath = path.join(promptsDir, `${phase}-${agentId}.txt`)
  fs.writeFileSync(filePath, prompt)
  console.log(`✅ Generated: ${filePath}`)
}

console.log(`\n✅ Generated ${Object.keys(phaseConfig).length} prompts for ${phase}`)
console.log(`\n📋 Next steps:`)
console.log(`1. Open ${Object.keys(phaseConfig).length} agent chats in Cursor (click "New Agent")`)
console.log(`2. Copy-paste prompts from scripts/agent-prompts/`)
console.log(`3. Monitor progress: pnpm monitor:${phase}`)
console.log(`4. After all complete: pnpm validate:${phase}`)
console.log(`\n📁 Prompts location: scripts/agent-prompts/`)

