# Context Preservation System

## Overview

This system ensures continuity across chat sessions by maintaining persistent context about project state, progress, and next steps.

## Core Files

### 1. `PROJECT_STATUS.md` (Root)
**Purpose:** Single source of truth for project state

**Contains:**
- ✅ What's been completed
- 🚧 What's in progress
- 📋 What needs to be done next
- ⚠️ Any blockers/issues
- 📊 Progress tracking (counts, phases)
- 🔍 Current context (key info)
- 📝 Session notes

**Update frequency:** After every significant change

### 2. `.cursorrules` (Root)
**Purpose:** Project-specific rules for AI assistant

**Contains:**
- Context preservation rules
- Import process rules
- Code quality rules
- File structure rules

### 3. `.cursor/context-rules.md`
**Purpose:** Detailed context preservation rules

**Contains:**
- Start of session checklist
- End of session checklist
- During work checklist
- Never forget rules

### 4. `.cursor/START_HERE.md`
**Purpose:** Quick reference for AI assistant

**Contains:**
- What to read first
- Quick commands
- Essential rules

## Strict Rules

### Rule 1: Read Status First
**MUST do at start of every session:**

1. Read `PROJECT_STATUS.md`
2. Understand current phase
3. Check what's been done
4. See what's next
5. Note any blockers

**Command:** `pnpm status:check`

### Rule 2: Update Status After Changes
**MUST do after significant work:**

1. Update `PROJECT_STATUS.md`
2. Document what was done
3. Update progress counters
4. Note next steps
5. Document blockers (if any)

**Command:** `pnpm status` (shows helper)

### Rule 3: Follow Import Order
**MUST follow:**

- `docs/IMPORT_ORDER.md` sequence
- One file at a time
- Check dependencies first
- Compare duplicates if needed
- Run checks after import

### Rule 4: Never Skip Steps
**ALWAYS:**

- Check dependencies
- Compare duplicates
- Run `pnpm check:all`
- Update status
- Document decisions

## Checklists

### Start of Session
```
[ ] Read PROJECT_STATUS.md
[ ] Understand current phase
[ ] Check docs/IMPORT_ORDER.md for next file
[ ] Review any blockers
[ ] Continue from where left off
```

### During Work
```
[ ] Follow IMPORT_ORDER.md sequence
[ ] Check dependencies before importing
[ ] Compare duplicates if they exist
[ ] Run pnpm check:all after import
[ ] Update PROJECT_STATUS.md
[ ] Move to next file
```

### End of Session
```
[ ] Update PROJECT_STATUS.md:
    [ ] What was done
    [ ] Current phase
    [ ] Progress (files imported)
    [ ] Next steps
    [ ] Blockers (if any)
[ ] Commit changes (if ready)
[ ] Document any decisions
```

## Status File Template

```markdown
# Project Status

**Last Updated:** [DATE]
**Current Phase:** [PHASE]
**Session:** [SESSION NUMBER]

## 🎯 Current Objective
[What we're trying to achieve]

## ✅ Completed
[What's been done]

## 🚧 In Progress
[Current task]

## 📋 Next Steps
[What's next]

## ⚠️ Blockers / Issues
[Any problems]

## 📊 Progress Tracking
[Counts, phases, percentages]

## 🔍 Current Context
[Key information]

## 📝 Session Notes
[What happened this session]
```

## Quick Commands

```bash
# Check current status
pnpm status:check

# View status update helper
pnpm status

# Read status file
cat PROJECT_STATUS.md

# Check import progress
grep -A 10 "Phase 1" docs/IMPORT_ORDER.md
```

## Why This System?

### Problem
- Chat sessions don't persist context
- Easy to lose track of progress
- Don't know where we left off
- Risk of duplicating work
- Risk of missing steps

### Solution
- `PROJECT_STATUS.md` as single source of truth
- Always read it first
- Always update it after changes
- Clear checklists
- Progress tracking

### Benefits
- ✅ Context preserved across sessions
- ✅ Clear progress tracking
- ✅ Know exactly what's next
- ✅ No duplicate work
- ✅ No missed steps
- ✅ Easy to resume work

## Enforcement

### Automatic
- `.cursorrules` file (Cursor reads this)
- Status file at root (easy to find)
- Clear file structure

### Manual
- Checklists in documentation
- Reminders in status file
- Helper scripts

### Best Practice
- Update status immediately after work
- Don't wait until end of session
- Be specific about what was done
- Note any deviations from plan

## Example Workflow

### Session Start
```bash
# 1. Read status
cat PROJECT_STATUS.md

# 2. Understand state
# - Phase 1: Foundation Files
# - Next: types.ts
# - Progress: 0/87 files

# 3. Continue work
# Import types.ts
# Update status
# Move to next file
```

### During Work
```bash
# 1. Check what's next
grep "types.ts" docs/IMPORT_ORDER.md

# 2. Import file
# (import types.ts)

# 3. Run checks
pnpm check:all

# 4. Update status
# Edit PROJECT_STATUS.md
# - Mark types.ts as imported
# - Update count: 1/87
# - Note next file

# 5. Continue
```

### Session End
```bash
# 1. Update status completely
# - What was done: Imported 5 type files
# - Current phase: Phase 1
# - Progress: 5/87 files
# - Next: src/config/constants.ts
# - No blockers

# 2. Commit (if ready)
git add .
git commit -m "import: add foundation type files"

# 3. Status is ready for next session
```

## See Also

- `PROJECT_STATUS.md` - Current status (READ THIS FIRST)
- `.cursorrules` - Project rules
- `.cursor/context-rules.md` - Detailed rules
- `.cursor/START_HERE.md` - Quick start guide

