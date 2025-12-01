# 🚨 START HERE - Context Preservation

## For AI Assistant: Read This First

**Before doing ANYTHING in a new chat session, you MUST:**

### 1. Read Status File
```bash
Read: PROJECT_STATUS.md
```
This tells you:
- What has been done
- What is in progress
- What needs to be done next
- Any blockers or issues

### 2. Understand Current Phase
Check `PROJECT_STATUS.md` for:
- Current phase (Setup, Phase 1, Phase 2, etc.)
- Files imported count
- Next file to import
- Current objective

### 3. Check Documentation
If needed, read:
- `docs/README.md` - Documentation index
- `docs/IMPORT_ORDER.md` - Import sequence
- `docs/IMPORT_STRATEGY.md` - Overall strategy

### 4. Continue Work
- Follow the import order
- Update status after each change
- Run checks after imports
- Document decisions

## Rules to Follow

### Always
- ✅ Read `PROJECT_STATUS.md` first
- ✅ Update `PROJECT_STATUS.md` after changes
- ✅ Follow `docs/IMPORT_ORDER.md` sequence
- ✅ Run `pnpm check:all` after imports
- ✅ Compare duplicates before importing

### Never
- ❌ Start work without reading status
- ❌ Skip status updates
- ❌ Work without context
- ❌ Skip dependency checks
- ❌ Skip duplicate comparison

## Quick Commands

```bash
# Check current status
pnpm status:check

# View status update helper
pnpm status

# Check import progress
cat docs/IMPORT_ORDER.md | grep -A 5 "Phase 1"
```

## Status File Location

`PROJECT_STATUS.md` - At project root

**Update it:**
- After importing files
- After completing phases
- After fixing issues
- At end of each session

## See Also

- `.cursorrules` - Project-specific rules
- `.cursor/context-rules.md` - Detailed context rules
- `PROJECT_STATUS.md` - Current status (READ THIS FIRST)

