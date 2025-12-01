# Quick Commit Guidelines

## Before Every Commit

```bash
# 1. Check what you're committing
git status

# 2. Review changes
git diff

# 3. Run checks (hooks will also run)
pnpm type-check
pnpm lint

# 4. Commit
git commit -m "type: description"
```

## Commit Message Format

```
<type>(<scope>): <subject>
```

### Types

- `import` - Importing files from old codebase
- `merge` - Merging duplicate files
- `fix` - Bug fix
- `feat` - New feature
- `refactor` - Code refactoring
- `docs` - Documentation
- `test` - Tests
- `chore` - Maintenance

### Examples

```bash
git commit -m "import: add types.ts foundation file"
git commit -m "merge(tools): merge tool-executor duplicates"
git commit -m "fix(types): correct Message type definition"
git commit -m "refactor(imports): update to absolute paths"
```

## What NOT to Commit

- ❌ **Broken code** (doesn't compile)
- ❌ **Console.logs**
- ❌ **SECRETS** (CRITICAL!)
  - ❌ API keys (Google, OpenAI, Gemini, etc.)
  - ❌ Database passwords/connection strings
  - ❌ JWT secrets
  - ❌ OAuth client secrets
  - ❌ Service account keys
  - ❌ `.env` files with real values
- ❌ Large generated files
- ❌ Temporary files

**Secret detection runs automatically before every commit!**

## Hooks

Pre-commit runs automatically:
- ✅ Type check
- ✅ Lint check
- ⚠️ Circular dependency check (warning)

Pre-push runs automatically:
- ✅ Tests
- ✅ All checks

See [Git Workflow](./GIT_WORKFLOW.md) for details.

