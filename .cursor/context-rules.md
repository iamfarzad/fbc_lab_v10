# Context Preservation Rules for AI Assistant

## 🚨 CRITICAL: Always Follow These Rules

### Rule 1: Read Status First
**BEFORE doing ANYTHING in a new chat session:**

1. **MUST read:** `PROJECT_STATUS.md`
   - Understand current phase
   - See what's been done
   - Check for blockers
   - Note next steps

2. **SHOULD read:** `docs/README.md`
   - Understand documentation structure
   - Find relevant guides

3. **CHECK:** `docs/IMPORT_ORDER.md`
   - See current import progress
   - Identify next file to import

### Rule 2: Update Status After Changes
**AFTER any significant work:**

1. **MUST update:** `PROJECT_STATUS.md`
   - What was done
   - Current phase
   - Progress (files imported count)
   - Next steps
   - Any blockers

2. **SHOULD update:** Relevant documentation
   - If process changed
   - If decisions made
   - If issues found

### Rule 3: Maintain Context
**During work:**

- Reference `PROJECT_STATUS.md` for current state
- Follow `docs/IMPORT_ORDER.md` for sequence
- Use `docs/IMPORT_STRATEGY.md` for decisions
- Check `docs/CLEANUP_CHECKLIST.md` for quality

### Rule 4: Never Skip Steps
**Always:**
- Check dependencies before importing
- Compare duplicates if they exist
- Run `pnpm check:all` after imports
- Update status file
- Document decisions

### Rule 5: Session Handoff
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

### Start of Session Checklist
```
1. Read PROJECT_STATUS.md
2. Read docs/README.md (if needed)
3. Check docs/IMPORT_ORDER.md for next file
4. Understand current phase
5. Continue work
```

### End of Session Checklist
```
1. Update PROJECT_STATUS.md:
   - What was done
   - Current phase
   - Progress (files imported)
   - Next steps
   - Blockers (if any)
2. Commit changes (if ready)
3. Document any decisions made
```

### During Work Checklist
```
1. Check PROJECT_STATUS.md for context
2. Follow IMPORT_ORDER.md sequence
3. Compare duplicates if needed
4. Run pnpm check:all
5. Update PROJECT_STATUS.md
6. Move to next file
```

## Status File Structure

`PROJECT_STATUS.md` should always have:
- ✅ Completed section (what's done)
- 🚧 In Progress section (current task)
- 📋 Next Steps section (what's next)
- ⚠️ Blockers section (any issues)
- 📊 Progress Tracking (counts, phases)
- 🔍 Current Context (key info)
- 📝 Session Notes (what happened)

## Never Forget

- ❌ Never start work without reading status
- ❌ Never skip status updates
- ❌ Never work without context
- ❌ Never commit without updating status
- ❌ Never skip dependency checks
- ❌ Never skip duplicate comparison

## Always Remember

- ✅ Read status first
- ✅ Update status after changes
- ✅ Follow import order
- ✅ Run checks
- ✅ Document decisions
- ✅ Maintain context

