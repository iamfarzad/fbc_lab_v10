# Documentation Organization

## Structure

All documentation is organized in the `docs/` directory to keep the root clean.

### Root Directory (Clean)

**Essential files only:**
- `README.md` - Project overview and quick start
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite configuration
- `vitest.config.ts` - Test configuration
- `docs/what_to_import.md` - Import map data

**Tools (analysis scripts):**
- `analyze-dependencies.js` - Dependency analysis
- `analyze-import-patterns.js` - Import pattern analysis
- `compare-duplicates.js` - Duplicate comparison

**Configuration:**
- `.eslintrc.cjs` - ESLint config
- `.prettierrc` - Prettier config
- `.gitignore` - Git ignore rules
- `.vscode/settings.json` - VS Code settings

### Documentation Directory (`docs/`)

**Index:**
- `README.md` - Documentation index (start here)

**Core Documents:**
- `IMPORT_STRATEGY.md` - Main strategy document
- `IMPORT_ORDER.md` - Prioritized import list
- `PROJECT_CONFIG.md` - Project configuration

**Process Documents:**
- `README_IMPORT_PROCESS.md` - Import process overview
- `DUPLICATE_COMPARISON_CHECKLIST.md` - Duplicate comparison process

**Setup Documents:**
- `TYPE_CHECK_AND_LINT.md` - TypeScript/ESLint setup
- `SETUP_COMPLETE.md` - Setup summary

## How to Find Documentation

### By Purpose

**Starting the import process?**
→ `docs/README.md` → `docs/IMPORT_ORDER.md`

**Found a duplicate file?**
→ `docs/DUPLICATE_COMPARISON_CHECKLIST.md`

**Need to understand import paths?**
→ `docs/PROJECT_CONFIG.md`

**Type checking or linting issues?**
→ `docs/TYPE_CHECK_AND_LINT.md`

**Want to understand the overall strategy?**
→ `docs/IMPORT_STRATEGY.md`

### By File Type

**Strategy & Planning:**
- `docs/IMPORT_STRATEGY.md`
- `docs/IMPORT_ORDER.md`

**Configuration:**
- `docs/PROJECT_CONFIG.md`
- `docs/TYPE_CHECK_AND_LINT.md`

**Process & Workflow:**
- `docs/README_IMPORT_PROCESS.md`
- `docs/DUPLICATE_COMPARISON_CHECKLIST.md`

**Status & Summary:**
- `docs/SETUP_COMPLETE.md`
- `docs/README.md` (index)

## File Naming Convention

- `README.md` - Index/overview files
- `*_STRATEGY.md` - Strategy documents
- `*_ORDER.md` - Ordered lists
- `*_CHECKLIST.md` - Step-by-step checklists
- `*_CONFIG.md` - Configuration docs
- `*_COMPLETE.md` - Status/summary docs

## Maintenance

**When adding new documentation:**
1. Place in `docs/` directory
2. Add entry to `docs/README.md`
3. Follow naming convention
4. Update this file if structure changes

**When documentation becomes outdated:**
1. Move to `docs/_archive/` (create if needed)
2. Update `docs/README.md` to mark as archived
3. Don't delete - keep for reference

## Quick Reference

```
Root/
├── README.md                    # Start here
├── package.json                 # Dependencies
├── docs/what_to_import.md      # Import map data
└── docs/                       # All documentation
    ├── README.md               # Documentation index
    ├── IMPORT_STRATEGY.md     # Main strategy
    ├── IMPORT_ORDER.md         # Import sequence
    ├── PROJECT_CONFIG.md       # Configuration
    └── ...
```

