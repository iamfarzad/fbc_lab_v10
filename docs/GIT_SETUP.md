# Git Setup Instructions

## Initial Setup

After cloning or setting up the project:

```bash
# 1. Install dependencies (this will set up husky)
pnpm install

# 2. Verify hooks are installed
ls -la .husky/

# 3. Make hooks executable (if needed)
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

## What Gets Checked

### Pre-Commit (Before Every Commit)

Automatically runs:
1. ✅ `pnpm type-check` - TypeScript compilation
2. ✅ `pnpm lint` - ESLint checks
3. ⚠️ `pnpm check:circular` - Circular dependencies (warning only)

**If type-check or lint fails, commit is blocked.**

### Pre-Push (Before Pushing to Remote)

Automatically runs:
1. ✅ `pnpm test --run` - All tests
2. ✅ `pnpm check:all` - All checks (type, lint, circular, unused, naming)

**If any check fails, push is blocked.**

## Manual Checks

You can run checks manually anytime:

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# All checks
pnpm check:all

# Individual checks
pnpm check:circular
pnpm check:unused
pnpm check:naming
```

## Bypassing Hooks (Emergency Only)

**⚠️ Only use in emergencies!**

```bash
# Skip pre-commit hook
git commit --no-verify -m "emergency fix"

# Skip pre-push hook
git push --no-verify
```

**Why this is dangerous:**
- Broken code can enter the repository
- Tests might not pass
- Type errors might exist
- Other developers will be affected

## Troubleshooting

### Hooks Not Running

```bash
# Reinstall husky
pnpm exec husky install

# Make hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

### Hook Failing Unexpectedly

```bash
# Run the hook manually to see error
.husky/pre-commit

# Check if dependencies are installed
pnpm install

# Verify scripts work
pnpm type-check
pnpm lint
```

## Best Practices

1. ✅ **Always commit working code** - Hooks will catch most issues
2. ✅ **Run checks before committing** - Don't wait for hooks to fail
3. ✅ **Fix issues immediately** - Don't bypass hooks
4. ✅ **Write meaningful commits** - See [COMMIT_GUIDELINES.md](./COMMIT_GUIDELINES.md)
5. ✅ **Review before pushing** - Check what you're pushing

## See Also

- [Git Workflow](./GIT_WORKFLOW.md) - Complete workflow guide
- [Commit Guidelines](./COMMIT_GUIDELINES.md) - Quick reference

