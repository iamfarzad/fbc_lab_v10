# Agent Documentation Update Rules

**Last Updated:** 2025-12-07  
**Purpose:** Clear guidelines for keeping agent documentation up-to-date  
**Status:** ✅ **ACTIVE RULE** - Follow this when making agent changes

---

## Single Source of Truth

**PRIMARY DOCUMENT:** `docs/AGENTS_DOCUMENTATION.md`

This is the **ONLY document** that should be updated when agent code or flow changes. All other agent-related documents are either:
- Historical/archived (don't update)
- Analysis frameworks (reference only)
- Misnamed/unrelated (ignore)

---

## When to Update Documentation

### ✅ MUST Update `AGENTS_DOCUMENTATION.md` When:

1. **New Agent Created**
   - Add to Core Pipeline Agents or Special Agents section
   - Document: File path, function signature, inputs/outputs, goal, features, routing logic, model config
   - Add prompt example to Agent Instructions & Prompts section
   - Update agent count in Architecture Overview

2. **Agent Code Changes**
   - Update relevant agent section with:
     - New features
     - Modified inputs/outputs
     - Changed behavior
     - Updated prompts

3. **Orchestration Changes**
   - Update Orchestration System section
   - Update routing logic diagrams
   - Update stage determination logic
   - Update flow diagrams

4. **New API Endpoints**
   - Add to API Endpoints section
   - Document: Purpose, request/response format, integration points

5. **New Systems/Features**
   - Response Validation System
   - Voice/Orchestrator sync
   - Dynamic prompting
   - Context management
   - Add new section or update relevant section

6. **Prompt Changes**
   - Update Agent Instructions & Prompts section
   - Include actual prompt text from code
   - Document any dynamic prompt logic

7. **Architecture Changes**
   - Update Architecture Overview
   - Update diagrams
   - Update data flow descriptions

---

## Update Checklist

When making agent-related changes, use this checklist:

### Before Making Changes
- [ ] Identify which agent/system is affected
- [ ] Review current documentation in `AGENTS_DOCUMENTATION.md`
- [ ] Understand the change scope

### While Making Code Changes
- [ ] Update code comments if they document behavior
- [ ] Ensure function signatures are clear
- [ ] Add JSDoc comments for complex logic

### After Making Code Changes
- [ ] Update `AGENTS_DOCUMENTATION.md`:
  - [ ] Relevant agent section updated
  - [ ] Prompts section updated (if prompts changed)
  - [ ] Architecture section updated (if architecture changed)
  - [ ] Orchestration section updated (if routing changed)
  - [ ] API Endpoints section updated (if endpoints changed)
- [ ] Update "Last Updated" date in header
- [ ] Verify all code examples match actual implementation
- [ ] Check that file paths are correct
- [ ] Verify function signatures match code

---

## What NOT to Update

### ❌ Do NOT Update These Documents:

1. **Archived Documents** (historical reference only):
   - `AGENTS_PIPELINE_CHANGES_30H.md` - Historical snapshot
   - `AGENT_DEEP_ANALYSIS.md` - Original analysis (Dec 2, 2025)
   - `AGENT_SYSTEM_STATUS.md` - Status snapshot (Dec 7, 2025)

2. **Analysis Frameworks** (reference only):
   - `AGENT_CONVERSATION_ANALYSIS.md` - Analysis checklist/template

3. **Misnamed/Unrelated Documents:**
   - `AGENT_COORDINATION.md` - About Cursor AI agents, not F.B/c agents

---

## Documentation Sections & What They Cover

### 1. Architecture Overview
**Update when:**
- New agents added
- System architecture changes
- Data flow changes
- New components added

**Includes:**
- System architecture diagram
- Agent count
- Data flow diagrams
- Layer descriptions

### 2. Core Pipeline Agents
**Update when:**
- Any core agent code changes
- New agents added
- Agent behavior changes

**Includes for each agent:**
- File path
- Function signature
- Inputs/outputs
- Goal and features
- Routing logic
- Model configuration

### 3. Special Agents
**Update when:**
- Admin, Retargeting, or Lead Intelligence agent changes
- New special agents added

### 4. Orchestration System
**Update when:**
- Routing logic changes
- Stage determination changes
- New triggers added
- Fast-track logic changes
- Objection detection changes

**Includes:**
- Server orchestrator details
- Client orchestrator details
- Routing priority order
- Stage determination logic
- Flow diagrams

### 5. Agent Connections & Flow
**Update when:**
- Routing changes
- New flows added
- Stage transitions change

**Includes:**
- Main conversation flow
- Fast-track flow
- Objection override flow
- Exit intent flow
- Proposal flow
- Admin flow

### 6. Agent Instructions & Prompts
**Update when:**
- Any prompt changes
- System prompt modifications
- New prompt sections added

**Includes:**
- Common instruction patterns
- Agent-specific prompts
- Actual prompt text from code
- Dynamic prompt logic

### 7. Response Validation System
**Update when:**
- New validation rules added
- Validation logic changes
- New validation functions added

### 8. API Endpoints
**Update when:**
- New endpoints added
- Endpoint behavior changes
- Request/response format changes

### 9. Recent Enhancements
**Update when:**
- Major features added
- Significant improvements made

**Note:** This section tracks recent changes. Consider archiving older entries periodically.

---

## Update Process

### Step 1: Make Code Changes
```bash
# Make your agent code changes
git add src/core/agents/
git commit -m "feat: [describe change]"
```

### Step 2: Update Documentation
```bash
# Open and update AGENTS_DOCUMENTATION.md
# Follow the checklist above
# Update relevant sections
```

### Step 3: Verify Documentation
- [ ] All code examples match actual code
- [ ] File paths are correct
- [ ] Function signatures match
- [ ] Prompts match actual prompts in code
- [ ] Diagrams reflect current architecture

### Step 4: Commit Documentation Update
```bash
git add docs/AGENTS_DOCUMENTATION.md
git commit -m "docs: update agent documentation for [describe change]"
```

---

## Code-to-Documentation Mapping

### Agent Files → Documentation Sections

| File | Documentation Section |
|------|----------------------|
| `src/core/agents/discovery-agent.ts` | Core Pipeline Agents → Discovery Agent |
| `src/core/agents/scoring-agent.ts` | Core Pipeline Agents → Scoring Agent |
| `src/core/agents/pitch-agent.ts` | Core Pipeline Agents → Pitch Agent |
| `src/core/agents/orchestrator.ts` | Orchestration System → Server Orchestrator |
| `src/core/agents/client-orchestrator.ts` | Orchestration System → Client Orchestrator |
| `src/core/agents/response-validator.ts` | Response Validation System |
| `api/chat.ts` | API Endpoints → `/api/chat` |
| `api/agent-stage.ts` | API Endpoints → `/api/agent-stage` |

### When Prompts Change

**Location in Code:** Agent file system prompt variable  
**Location in Docs:** Agent Instructions & Prompts → [Agent Name] Prompt

**Example:**
- Code: `src/core/agents/discovery-agent.ts` → `instructionSection` variable
- Docs: `AGENTS_DOCUMENTATION.md` → Agent Instructions & Prompts → Discovery Agent Prompt

**Update Rule:** Copy actual prompt text from code to documentation.

---

## Verification Commands

After updating documentation, verify accuracy:

```bash
# Check if file paths exist
grep -E "src/core/agents/[a-z-]+\.ts" docs/AGENTS_DOCUMENTATION.md | \
  sed 's/.*`\([^`]*\)`.*/\1/' | \
  xargs -I {} sh -c 'test -f {} && echo "✅ {}" || echo "❌ {} MISSING"'

# Verify function names match exports
grep -E "Function:.*\(|export.*function" src/core/agents/*.ts docs/AGENTS_DOCUMENTATION.md

# Check for outdated information
grep -i "TODO\|FIXME\|outdated\|deprecated" docs/AGENTS_DOCUMENTATION.md
```

---

## Examples

### Example 1: Adding a New Agent

**Code Change:**
```typescript
// src/core/agents/new-agent.ts
export async function newAgent(messages: ChatMessage[], context: AgentContext) {
  // implementation
}
```

**Documentation Update:**
1. Add to Core Pipeline Agents section (or Special Agents if appropriate)
2. Add prompt to Agent Instructions & Prompts section
3. Update agent count in Architecture Overview
4. Update Orchestration System if routing changes
5. Update flow diagrams if flow changes

### Example 2: Changing Agent Prompt

**Code Change:**
```typescript
// src/core/agents/discovery-agent.ts
const instructionSection = `INSTRUCTIONS:
You are F.B/c Discovery AI - [NEW PROMPT TEXT]`
```

**Documentation Update:**
1. Update "Agent Instructions & Prompts → Discovery Agent Prompt" section
2. Copy entire new prompt text
3. Update date in header

### Example 3: Adding New Validation Rule

**Code Change:**
```typescript
// src/core/agents/response-validator.ts
// New validation rule added
```

**Documentation Update:**
1. Update "Response Validation System → Validation Rules" section
2. Document new rule: name, pattern, severity, suggestion

---

## Quick Reference

### Common Update Patterns

**New Agent:**
```
1. Core Pipeline Agents section → Add agent details
2. Agent Instructions & Prompts → Add prompt
3. Architecture Overview → Update count
4. Orchestration System → Update routing (if needed)
```

**Prompt Change:**
```
1. Agent Instructions & Prompts → Update [Agent] Prompt section
```

**Routing Change:**
```
1. Orchestration System → Update routing logic
2. Agent Connections & Flow → Update relevant flow diagrams
```

**New Endpoint:**
```
1. API Endpoints → Add endpoint documentation
```

**New System:**
```
1. Add new section or subsection
2. Update Architecture Overview if needed
```

---

## Enforcement

### Pre-Commit Checklist
Before committing agent-related changes:
- [ ] Code changes made and tested
- [ ] Documentation updated in `AGENTS_DOCUMENTATION.md`
- [ ] "Last Updated" date changed
- [ ] All examples match actual code
- [ ] No updates to archived documents

### Code Review
When reviewing agent-related PRs:
- [ ] Verify documentation is updated
- [ ] Check that examples match code
- [ ] Ensure no updates to archived docs

---

## Summary

**Golden Rule:** When agent code or flow changes, update `AGENTS_DOCUMENTATION.md` only. All other agent docs are reference-only or archived.

**Single Source of Truth:** `docs/AGENTS_DOCUMENTATION.md`

**Update Frequency:** Every time agent code/flow changes

**Verification:** Use verification commands to ensure accuracy

---

**Remember:** Documentation that doesn't match code is worse than no documentation. Keep it accurate and up-to-date.
