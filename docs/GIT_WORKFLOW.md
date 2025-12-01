# Git Workflow & Commit Guidelines

## Pre-Commit Checks

Before every commit, the following checks run automatically:

1. 🔒 **Secret detection** - `pnpm check:secrets` - **BLOCKS COMMIT IF SECRETS FOUND**
2. ✅ **Type checking** - `pnpm type-check`
3. ✅ **Linting** - `pnpm lint`
4. ⚠️ **Circular dependencies** - `pnpm check:circular` (warning only)

**If any check fails, the commit is blocked.**

## Pre-Push Checks

Before pushing to remote, the following checks run:

1. ✅ **Tests** - `pnpm test --run`
2. ✅ **All checks** - `pnpm check:all` (type-check, lint, circular, unused, naming)

**If any check fails, the push is blocked.**

## Commit Message Format

Use conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `import`: Importing files from old codebase
- `merge`: Merging duplicate files

### Examples

```bash
# Importing a new file
git commit -m "import: add types.ts foundation file"

# Fixing a type error
git commit -m "fix(types): correct Message type definition"

# Merging duplicates
git commit -m "merge(tools): merge tool-executor duplicates from api/_lib and src"

# Adding documentation
git commit -m "docs: add cleanup checklist"

# Refactoring
git commit -m "refactor(imports): update import paths to use absolute paths"
```

## Commit Checklist

Before committing, verify:

- [ ] **Code compiles** - `pnpm type-check` passes
- [ ] **No lint errors** - `pnpm lint` passes
- [ ] **No broken imports** - All imports resolve
- [ ] **No test failures** - Tests pass (if applicable)
- [ ] **Meaningful commit message** - Follows conventional commits
- [ ] **Only relevant files** - No accidental files included
- [ ] **No secrets** - No API keys, passwords, etc.

## What NOT to Commit

### Never Commit:

- ❌ **Broken code** - Code that doesn't compile or has type errors
- ❌ **Commented-out code** - Remove it instead
- ❌ **Console.logs** - Use proper logging
- ❌ **Secrets** - API keys, passwords, tokens, live credentials
  - ❌ **API Keys** - Google API keys, OpenAI keys, etc.
  - ❌ **Database credentials** - Connection strings with passwords
  - ❌ **JWT secrets** - Secret keys for token signing
  - ❌ **OAuth secrets** - Client secrets, refresh tokens
  - ❌ **Service account keys** - JSON key files
  - ❌ **Environment variables with secrets** - `.env` files with real values
- ❌ **Large generated files** - Build artifacts, node_modules
- ❌ **Temporary files** - `.tmp`, `.temp`, `.cache`
- ❌ **IDE files** - `.vscode/`, `.idea/` (except shared settings)
- ❌ **OS files** - `.DS_Store`, `Thumbs.db`

### Check Before Committing:

```bash
# See what will be committed
git status

# Review changes
git diff

# Check for secrets (CRITICAL!)
git diff --cached | grep -iE "(api[_-]?key|secret|password|token|credential)" || echo "No obvious secrets found (but review manually!)"

# Check for large files
git diff --cached --stat

# Check for .env files
git diff --cached --name-only | grep -E "\.env" && echo "⚠️  WARNING: .env file detected!"
```

## Branch Strategy

### Main Branches

- `main` - Production-ready code
- `develop` - Development branch (if using)

### Feature Branches

- `import/phase-1-foundation` - Importing foundation files
- `import/phase-2-tools` - Importing tools
- `merge/duplicate-tools` - Merging duplicate tools
- `fix/type-errors` - Fixing type errors

### Naming Convention

```
<type>/<description>

Examples:
- import/types
- merge/tool-executor
- fix/circular-deps
- refactor/import-paths
```

## Workflow

### 1. Before Starting Work

```bash
# Pull latest changes
git pull origin main

# Create feature branch
git checkout -b import/types-foundation
```

### 2. While Working

```bash
# Stage files as you complete them
git add types.ts
git add src/types/core.ts

# Commit when logical unit is complete
git commit -m "import: add foundation type files"
```

### 3. Before Pushing

```bash
# Run checks manually (hooks will also run)
pnpm check:all

# Review what will be pushed
git log origin/main..HEAD

# Push
git push origin import/types-foundation
```

### 4. After Pushing

- Create PR/MR
- Wait for CI checks (if configured)
- Get review
- Merge to main

## Commit Frequency

### Good Practice

- ✅ **Commit often** - Small, logical commits
- ✅ **Commit working code** - Each commit should compile
- ✅ **One logical change per commit** - Don't mix unrelated changes

### Bad Practice

- ❌ **Large commits** - Hundreds of files at once
- ❌ **Broken commits** - Commits that don't compile
- ❌ **Mixed concerns** - Fixing types + adding features in one commit

## Import-Specific Guidelines

### When Importing Files

1. **Import one file at a time** (or small logical group)
2. **Test the import** - Verify it compiles
3. **Fix any issues** - Type errors, import paths
4. **Commit** - `git commit -m "import: add [filename]"`

### When Merging Duplicates

1. **Compare duplicates** - Use comparison tool
2. **Merge code** - Combine unique functions
3. **Test merge** - Verify it works
4. **Commit** - `git commit -m "merge: merge [filename] duplicates"`

### When Fixing Issues

1. **Fix the issue** - Type errors, imports, etc.
2. **Test the fix** - Verify it works
3. **Commit** - `git commit -m "fix([scope]): [description]"`

## Rollback Strategy

If you commit broken code:

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Or discard changes
git reset --hard HEAD~1

# If already pushed, create fix commit
git commit -m "fix: revert broken commit"
```

## Git Hooks Setup

Hooks are automatically set up with husky. To verify:

```bash
# Check hooks are installed
ls -la .husky/

# Test pre-commit manually
.husky/pre-commit

# Test pre-push manually
.husky/pre-push
```

## CI/CD Integration

When setting up CI/CD, ensure:

1. ✅ Run `pnpm install`
2. ✅ Run `pnpm type-check`
3. ✅ Run `pnpm lint`
4. ✅ Run `pnpm test`
5. ✅ Run `pnpm check:all`
6. ✅ Build: `pnpm build`

## Troubleshooting

### Hook Not Running

```bash
# Make hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/pre-push

# Reinstall husky
pnpm exec husky install
```

### Skip Hooks (Emergency Only)

```bash
# Skip pre-commit
git commit --no-verify -m "emergency fix"

# Skip pre-push
git push --no-verify
```

**⚠️ Only use in emergencies!**

## Best Practices Summary

1. ✅ **Always commit working code**
2. ✅ **Run checks before committing**
3. ✅ **Write meaningful commit messages**
4. ✅ **Commit small, logical changes**
5. ✅ **Review before pushing**
6. ✅ **Never commit secrets**
7. ✅ **Keep commits focused**

