# Parallel Cursor Agent Coordination Guide

> ⚠️ **NOTE:** This document is about coordinating multiple Cursor AI agents in parallel (development workflow), NOT about the F.B/c agent system.

## How Parallel Agents Work in Cursor

Cursor 2.0 allows you to run **up to 8 agents simultaneously**, each in its own isolated workspace (Git worktree). This guide shows you how to coordinate them effectively.

## Two Ways to Run Parallel Agents

### Method 1: Cursor UI (Recommended)

**Steps:**
1. Open Cursor
2. Click "New Agent" in the left sidebar (or use `Cmd/Ctrl + Shift + N`)
3. Repeat to open multiple agent chats (up to 8)
4. Each agent gets its own isolated workspace
5. Assign tasks to each agent
6. Review and merge changes when done

**Advantages:**
- ✅ Visual interface
- ✅ Easy to monitor progress
- ✅ Can review diffs side-by-side
- ✅ Built-in isolation (Git worktrees)

### Method 2: Terminal Coordination (Manual)

While Cursor doesn't have a direct CLI for parallel agents, you can coordinate them using:

1. **Terminal scripts** to validate and coordinate
2. **Agent prompt templates** for consistent tasks
3. **Validation gates** between phases

---

## Coordination Workflow

### Step 1: Prepare Agent Prompts

Create agent prompt files for each phase:

```bash
# Create prompts directory
mkdir -p scripts/agent-prompts

# Generate prompts for Phase 1
node scripts/generate-agent-prompts.js phase-1
```

### Step 2: Launch Agents in Cursor UI

1. Open Cursor
2. Open 4 agent chats (for Phase 1):
   - Agent 1: Types Foundation
   - Agent 2: Config Foundation
   - Agent 3: Core Utilities
   - Agent 4: Schemas

3. Copy-paste the prompt for each agent (from generated files)

### Step 3: Monitor Progress

Use terminal to monitor:

```bash
# Watch for file changes
watch -n 2 'find src/ -name "*.ts" -newer .last-check 2>/dev/null | wc -l'

# Check validation status
pnpm status:check

# Monitor type errors
pnpm type-check:watch
```

### Step 4: Validate After Each Agent Completes

```bash
# Run validation gate
pnpm validate:phase-1
```

### Step 5: Review and Merge

1. Review each agent's changes in Cursor UI
2. Accept changes that pass validation
3. Fix issues if needed
4. Proceed to next phase

---

## Agent Prompt Templates

### Template for Phase 1 Agent

```
You are Agent 1: Types Foundation

TASK: Import types foundation files (10 files)

Files to import (in this order):
1. types.ts
2. src/types/core.ts
3. src/types/conversation-flow.ts
4. src/core/database.types.ts
5. src/core/live/types.ts
6. src/core/tools/tool-types.ts
7. src/core/tools/types.ts
8. src/core/queue/job-types.ts
9. server/message-types.ts
10. server/message-payload-types.ts

REQUIREMENTS:
1. Read PROJECT_STATUS.md to understand current state
2. Read docs/IMPORT_ORDER.md for file locations
3. Import files in dependency order listed above
4. Update import paths to absolute from root (no @/ aliases)
5. Remove any @/ aliases
6. Run validation after each file:
   - pnpm type-check (MUST pass)
   - pnpm lint (MUST pass)
7. Fix all errors before proceeding
8. Update PROJECT_STATUS.md with:
   - Files imported
   - Any issues found
   - Validation results

VALIDATION CHECKLIST:
- [ ] All 10 files imported
- [ ] pnpm type-check passes
- [ ] pnpm lint passes
- [ ] No type errors
- [ ] No lint errors
- [ ] PROJECT_STATUS.md updated

See docs/PARALLEL_AGENT_STRATEGY.md for full workflow.
```

---

## Coordination Scripts

### Script 1: Generate Agent Prompts

Create `scripts/generate-agent-prompts.js`:

```javascript
#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

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
    // ... more agents
  }
}

function generatePrompt(phase, agentId, agentConfig) {
  return `You are ${agentConfig.name}

TASK: Import ${agentConfig.name} files (${agentConfig.files.length} files)

Files to import (in this order):
${agentConfig.files.map((f, i) => `${i + 1}. ${f}`).join('\n')}

REQUIREMENTS:
1. Read PROJECT_STATUS.md to understand current state
2. Read docs/IMPORT_ORDER.md for file locations
3. Import files in dependency order listed above
4. Update import paths to absolute from root (no @/ aliases)
5. Remove any @/ aliases
6. Run validation after each file:
   - pnpm type-check (MUST pass)
   - pnpm lint (MUST pass)
7. Fix all errors before proceeding
8. Update PROJECT_STATUS.md with:
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
`
}

// Generate prompts
const phase = process.argv[2] || 'phase-1'
const promptsDir = 'scripts/agent-prompts'

if (!fs.existsSync(promptsDir)) {
  fs.mkdirSync(promptsDir, { recursive: true })
}

const phaseConfig = phases[phase]
if (!phaseConfig) {
  console.error(`Unknown phase: ${phase}`)
  process.exit(1)
}

for (const [agentId, agentConfig] of Object.entries(phaseConfig)) {
  const prompt = generatePrompt(phase, agentId, agentConfig)
  const filePath = path.join(promptsDir, `${phase}-${agentId}.txt`)
  fs.writeFileSync(filePath, prompt)
  console.log(`Generated: ${filePath}`)
}

console.log(`\n✅ Generated ${Object.keys(phaseConfig).length} prompts for ${phase}`)
console.log(`\nNext steps:`)
console.log(`1. Open multiple agent chats in Cursor`)
console.log(`2. Copy-paste prompts from scripts/agent-prompts/`)
console.log(`3. Run: pnpm validate:${phase}`)
```

### Script 2: Validation Gate

Add to `package.json`:

```json
{
  "scripts": {
    "validate:phase-1": "pnpm check:all && pnpm build",
    "validate:phase-2": "pnpm check:all && pnpm build",
    "validate:phase-3": "pnpm check:all && pnpm build",
    "validate:phase-4": "pnpm check:all && pnpm build",
    "validate:phase-5": "pnpm check:all && pnpm build",
    "validate:phase-6": "pnpm check:all && pnpm build",
    "validate:phase-7": "pnpm check:all && pnpm build:server && pnpm dev:server --dry-run",
    "validate:phase-8": "pnpm check:all && pnpm build && pnpm build:server && pnpm dev:all --dry-run"
  }
}
```

### Script 3: Monitor Agent Progress

Create `scripts/monitor-agents.js`:

```javascript
#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'

const phase = process.argv[2] || 'phase-1'

console.log(`\n🔍 Monitoring Phase ${phase} Progress\n`)

// Check files imported
const expectedFiles = {
  'phase-1': {
    'agent-1': 10, // types
    'agent-2': 5,  // config
    'agent-3': 15, // utils
    'agent-4': 3   // schemas
  }
}

const files = expectedFiles[phase]
if (!files) {
  console.error(`Unknown phase: ${phase}`)
  process.exit(1)
}

// Check validation status
console.log('📊 Validation Status:')
try {
  execSync('pnpm type-check', { stdio: 'inherit' })
  console.log('✅ Type check: PASSED')
} catch (e) {
  console.log('❌ Type check: FAILED')
}

try {
  execSync('pnpm lint', { stdio: 'inherit' })
  console.log('✅ Lint: PASSED')
} catch (e) {
  console.log('❌ Lint: FAILED')
}

// Check PROJECT_STATUS.md
if (fs.existsSync('PROJECT_STATUS.md')) {
  const status = fs.readFileSync('PROJECT_STATUS.md', 'utf-8')
  const importedCount = (status.match(/\[x\]/g) || []).length
  console.log(`\n📝 Status: ${importedCount} items completed`)
}

console.log('\n✅ Monitoring complete\n')
```

---

## Step-by-Step Workflow

### Phase 1 Example

**1. Generate Prompts:**
```bash
node scripts/generate-agent-prompts.js phase-1
```

**2. Open 4 Agent Chats in Cursor:**
- Click "New Agent" 4 times
- Or use `Cmd/Ctrl + Shift + N` 4 times

**3. Assign Prompts:**
- Agent 1: Copy `scripts/agent-prompts/phase-1-agent-1.txt`
- Agent 2: Copy `scripts/agent-prompts/phase-1-agent-2.txt`
- Agent 3: Copy `scripts/agent-prompts/phase-1-agent-3.txt`
- Agent 4: Copy `scripts/agent-prompts/phase-1-agent-4.txt`

**4. Monitor Progress:**
```bash
# In terminal
pnpm monitor:phase-1
```

**5. After All Agents Complete:**
```bash
# Run validation gate
pnpm validate:phase-1
```

**6. Review Changes:**
- Review each agent's diff in Cursor UI
- Accept changes that pass validation
- Fix issues if needed

**7. Proceed to Next Phase:**
```bash
node scripts/generate-agent-prompts.js phase-2
# Repeat steps 2-6
```

---

## Terminal Commands Summary

```bash
# Generate prompts for a phase
node scripts/generate-agent-prompts.js phase-1

# Monitor agent progress
pnpm monitor:phase-1

# Validate phase completion
pnpm validate:phase-1

# Check overall status
pnpm status:check

# Run all checks
pnpm check:all
```

---

## Best Practices

### 1. One Phase at a Time
- Complete Phase 1 before starting Phase 2
- Wait for validation gate to pass
- Fix all issues before proceeding

### 2. Clear Communication
- Each agent updates `PROJECT_STATUS.md`
- Document issues found
- Note what works and what doesn't

### 3. Validation First
- Agents must validate before proposing
- Fix errors in their workspace
- Only propose working code

### 4. Review Before Merge
- Review each agent's changes
- Test validation locally
- Merge only validated changes

### 5. Incremental Progress
- Small batches (10-15 files per agent)
- Validate after each batch
- Ensure codebase works at each step

---

## Troubleshooting

### Agents Overwriting Each Other

**Problem:** Agents editing same files

**Solution:**
- Each agent has isolated workspace (Git worktree)
- Cursor handles this automatically
- Review diffs before merging

### Validation Fails

**Problem:** `pnpm validate:phase-1` fails

**Solution:**
1. Check which agent's changes caused failure
2. Ask that agent to fix issues
3. Re-run validation
4. Don't proceed until gate passes

### Agents Stuck

**Problem:** Agent not making progress

**Solution:**
1. Check agent's chat for errors
2. Verify dependencies are imported
3. Check import paths are correct
4. May need to restart agent with clearer prompt

---

## See Also

- [Parallel Agent Strategy](./PARALLEL_AGENT_STRATEGY.md) - Full strategy
- [Import Order](./IMPORT_ORDER.md) - File import sequence
- [Project Status](../PROJECT_STATUS.md) - Current state

