# Git Setup Guide

Guide for setting up Git repository locally and connecting to GitHub.

## Current Status Check

**I cannot log into GitHub or authenticate** - that's something you need to do. But I can help you set up the repository.

## Setup Steps

### Step 1: Check if Git is Initialized

```bash
# Check if git repo exists
git status

# If not initialized, you'll see:
# "fatal: not a git repository"
```

### Step 2: Initialize Git (If Needed)

```bash
# Initialize git repository
git init

# Configure git (if not already done)
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### Step 3: Create GitHub Repository

**On GitHub:**
1. Go to https://github.com/new
2. Repository name: `fbc_lab_v10` (or your preferred name)
3. Description: "Clean codebase import and organization"
4. Choose: Public or Private
5. **Don't** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### Step 4: Connect Local to Remote

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/fbc_lab_v10.git

# Or if using SSH:
git remote add origin git@github.com:YOUR_USERNAME/fbc_lab_v10.git

# Verify remote
git remote -v
```

### Step 5: Initial Commit

```bash
# Stage all files
git add .

# Check what will be committed (verify no secrets!)
git status

# Commit
git commit -m "initial: project setup and documentation"

# Push to GitHub
git push -u origin main
# Or if your default branch is master:
# git push -u origin master
```

## Authentication

### Option 1: Personal Access Token (Recommended)

**For HTTPS:**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Select scopes: `repo` (full control)
4. Copy token
5. Use token as password when pushing:
   ```bash
   git push
   # Username: your_github_username
   # Password: your_personal_access_token
   ```

### Option 2: SSH Key

**For SSH:**
1. Generate SSH key (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "your.email@example.com"
   ```

2. Add to GitHub:
   - Copy public key: `cat ~/.ssh/id_ed25519.pub`
   - Go to GitHub → Settings → SSH and GPG keys
   - Add new SSH key
   - Paste public key

3. Test connection:
   ```bash
   ssh -T git@github.com
   ```

### Option 3: GitHub CLI

```bash
# Install GitHub CLI (if not installed)
# macOS: brew install gh

# Login
gh auth login

# This will guide you through authentication
```

## Verification

### Check Git Status

```bash
# Check repository status
git status

# Check remote
git remote -v

# Check branches
git branch -a
```

### Test Connection

```bash
# Test SSH (if using SSH)
ssh -T git@github.com

# Test HTTPS (if using HTTPS)
git ls-remote origin
```

## Important: Before First Push

### 1. Verify No Secrets

```bash
# Run secret check
pnpm check:secrets

# Verify .env files are gitignored
git status | grep .env
# Should show nothing (files are ignored)
```

### 2. Verify Important Files Are Committed

```bash
# Check these are tracked:
git ls-files | grep -E "(PROJECT_STATUS|\.cursorrules|docs/|scripts/)"
```

### 3. Verify Secrets Are Ignored

```bash
# These should NOT be in git:
git ls-files | grep -E "\.env$|\.env\.local|fly\.toml$|vercel\.json$"
# Should return nothing
```

## Recommended Workflow

### Initial Setup

```bash
# 1. Initialize (if needed)
git init

# 2. Add remote
git remote add origin https://github.com/YOUR_USERNAME/fbc_lab_v10.git

# 3. Stage files
git add .

# 4. Verify no secrets
pnpm check:secrets

# 5. Commit
git commit -m "initial: project setup and documentation"

# 6. Push
git push -u origin main
```

### Daily Workflow

```bash
# 1. Check status
git status

# 2. Stage changes
git add .

# 3. Verify (hooks run automatically)
# Pre-commit hook runs: pnpm check:secrets, pnpm type-check, pnpm lint

# 4. Commit
git commit -m "import: add types.ts foundation file"

# 5. Push (pre-push hook runs: pnpm test, pnpm check:all)
git push
```

## Troubleshooting

### Issue: "fatal: not a git repository"

**Solution:**
```bash
git init
```

### Issue: "remote origin already exists"

**Solution:**
```bash
# Check current remote
git remote -v

# Update if needed
git remote set-url origin https://github.com/YOUR_USERNAME/fbc_lab_v10.git
```

### Issue: Authentication failed

**Solution:**
- Use Personal Access Token (not password)
- Or set up SSH key
- Or use GitHub CLI: `gh auth login`

### Issue: Pre-commit hook not running

**Solution:**
```bash
# Reinstall husky
pnpm exec husky install

# Make hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

## Security Checklist

Before pushing to GitHub:

- [ ] No secrets in committed files
- [ ] `.env.local` is gitignored
- [ ] `fly.toml` is gitignored (if has real values)
- [ ] `vercel.json` is gitignored (if has real values)
- [ ] `.env.example` is committed (template only)
- [ ] `fly.toml.example` is committed (template only)
- [ ] Run `pnpm check:secrets` passes

## See Also

- [Git Workflow](./GIT_WORKFLOW.md) - Commit guidelines and workflow
- [Git Setup](./GIT_SETUP.md) - Git hooks setup
- [Secrets Management](./SECRETS_MANAGEMENT.md) - How to handle secrets

