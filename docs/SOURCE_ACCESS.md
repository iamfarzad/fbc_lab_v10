# Accessing Original Source Files

## Overview

Since we **cannot clone** the original repository, we need to access files **incrementally** as we import them.

## Two Options

### Option 1: Local Path (Recommended)

If the original project is on your local machine:

1. **Provide the path** to the original project
2. **I can read files directly** from that location
3. **No cloning needed** - just file access

**Example:**
```bash
# Original project path
/Users/farzad/fbc_lab_v9
# or
/Users/farzad/old-project
```

### Option 2: Repository URL

If the original project is in a repository:

1. **Provide the repository URL**
2. **I can read individual files** via GitHub API (if public)
3. **Or you can paste file contents** when needed
4. **No cloning needed** - just file-by-file access

**Example:**
```bash
# GitHub repo
https://github.com/username/fbc_lab_v9

# Or specific file URL
https://github.com/username/fbc_lab_v9/blob/main/types.ts
```

---

## How It Works

### For Agents

Each agent will:

1. **Request source file** when needed
2. **Read from original location** (local path or URL)
3. **Import incrementally** (one file at a time)
4. **Validate after each import**

### For You

**If local path:**
- Just tell me the path: `/Users/farzad/fbc_lab_v9`
- I'll read files directly as needed

**If repository:**
- Provide the repo URL
- I'll read files via API or you paste when needed

---

## Setup Instructions

### Step 1: Configure Source Path

Create `.source-config.json` (gitignored):

```json
{
  "sourceType": "local",
  "sourcePath": "/Users/farzad/fbc_lab_v9",
  "sourceUrl": null
}
```

Or for repository:

```json
{
  "sourceType": "repository",
  "sourcePath": null,
  "sourceUrl": "https://github.com/username/fbc_lab_v9"
}
```

### Step 2: Use Import Script

```bash
# Import a single file
node scripts/import-file.js types.ts

# Import with validation
node scripts/import-file.js types.ts --validate
```

### Step 3: Agents Use This

Agents will automatically:
- Read source config
- Access files from original location
- Import incrementally
- Validate after import

---

## File Access Script

The `scripts/import-file.js` script will:

1. **Read source config** (`.source-config.json`)
2. **Locate file** in original project
3. **Read file content**
4. **Update import paths** (absolute from root)
5. **Write to new location**
6. **Run validation** (if `--validate` flag)
7. **Update PROJECT_STATUS.md**

---

## Example Workflow

### Agent 1: Import types.ts

**Agent requests:**
```
I need to import types.ts from the original project.
```

**System:**
1. Reads `.source-config.json`
2. Finds `types.ts` at `/Users/farzad/fbc_lab_v9/types.ts`
3. Reads file content
4. Updates imports (if any)
5. Writes to `/Users/farzad/fbc_lab_v10/types.ts`
6. Runs `pnpm type-check`
7. Updates `PROJECT_STATUS.md`

**Result:**
- ✅ File imported
- ✅ Validated
- ✅ Status updated

---

## Security Note

**`.source-config.json` is gitignored** - it contains local paths that shouldn't be committed.

---

## Next Steps

1. **Tell me the source location:**
   - Local path: `/Users/farzad/fbc_lab_v9`
   - Or repo URL: `https://github.com/...`

2. **I'll create the config file**

3. **Agents can start importing**

