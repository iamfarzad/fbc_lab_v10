# 🚨 STRICT RULES - Must Follow in Every Session

## Rule 1: ALWAYS Read Status First

**Before doing ANYTHING:**

```bash
# MUST read this file first
PROJECT_STATUS.md
```

**What it tells you:**
- What has been done ✅
- What is in progress 🚧
- What needs to be done next 📋
- Any blockers ⚠️
- Current phase and progress 📊

**How to read:**
```bash
pnpm status:check  # Quick view
cat PROJECT_STATUS.md  # Full file
```

## Rule 2: ALWAYS Update Status After Changes

**After ANY significant work:**

1. Open `PROJECT_STATUS.md`
2. Update relevant sections:
   - ✅ Completed - Add what was done
   - 🚧 In Progress - Update current task
   - 📋 Next Steps - Update what's next
   - 📊 Progress Tracking - Update counts
   - ⚠️ Blockers - Add any issues
3. Update "Last Updated" date
4. Add session notes if significant

**When to update:**
- After importing files
- After completing phases
- After fixing issues
- After making decisions
- At end of session

## Rule 3: Follow Import Order Strictly

**ALWAYS:**
- Follow `docs/IMPORT_ORDER.md` sequence
- Import one file at a time
- Check dependencies before importing
- Compare duplicates if they exist
- Run `pnpm check:all` after import
- Update status after each file

**NEVER:**
- Skip files in order
- Import without checking dependencies
- Skip duplicate comparison
- Skip running checks

## Rule 4: Never Skip Checks

**ALWAYS run:**
```bash
pnpm check:all  # After each import
```

**Checks include:**
- Type checking
- Linting
- Secret detection
- Circular dependencies
- Unused exports
- Naming consistency

## Rule 5: Document Decisions

**When making decisions:**
- Update `PROJECT_STATUS.md` session notes
- Update relevant documentation
- Note why decision was made
- Document any deviations from plan

## Rule 6: Maintain Context

**During work:**
- Reference `PROJECT_STATUS.md` for current state
- Follow `docs/IMPORT_ORDER.md` for sequence
- Use `docs/IMPORT_STRATEGY.md` for decisions
- Check `docs/CLEANUP_CHECKLIST.md` for quality

## Rule 7: Session Handoff

**At end of session:**
- Update `PROJECT_STATUS.md` completely
- Document what was done
- Document what's next
- Note any blockers
- Update progress counters

**At start of session:**
- Read `PROJECT_STATUS.md` first
- Understand current state
- Continue from where left off

## Quick Reference

### Start of Session
```
1. Read PROJECT_STATUS.md
2. Understand current phase
3. Check next file to import
4. Continue work
```

### During Work
```
1. Follow IMPORT_ORDER.md
2. Check dependencies
3. Compare duplicates (if needed)
4. Import file
5. Run pnpm check:all
6. Update PROJECT_STATUS.md
7. Move to next file
```

### End of Session
```
1. Update PROJECT_STATUS.md:
   - What was done
   - Current phase
   - Progress
   - Next steps
   - Blockers
2. Commit (if ready)
```

## Enforcement

These rules are enforced by:
- `.cursorrules` file (Cursor reads this)
- `PROJECT_STATUS.md` (single source of truth)
- Checklists in documentation
- Helper scripts

## Consequences of Not Following

**If you skip these rules:**
- ❌ Lose context between sessions
- ❌ Don't know where you left off
- ❌ Risk duplicating work
- ❌ Risk missing steps
- ❌ Inconsistent progress

**If you follow these rules:**
- ✅ Context preserved
- ✅ Clear progress tracking
- ✅ Know exactly what's next
- ✅ No duplicate work
- ✅ Consistent progress

## Files to Remember

**Must read first:**
- `PROJECT_STATUS.md` - Current status

**Must update:**
- `PROJECT_STATUS.md` - After changes

**Must follow:**
- `docs/IMPORT_ORDER.md` - Import sequence
- `docs/IMPORT_STRATEGY.md` - Strategy

**Must check:**
- `docs/CLEANUP_CHECKLIST.md` - Quality checks

## Commands

```bash
# Check status
pnpm status:check

# Update status helper
pnpm status

# Read status
cat PROJECT_STATUS.md

# Check import order
cat docs/IMPORT_ORDER.md | grep -A 5 "Phase 1"
```

## Remember

**These are NOT suggestions - they are REQUIREMENTS.**

Every session MUST:
1. Read status first
2. Update status after changes
3. Follow import order
4. Run checks
5. Document decisions

**No exceptions.**

