# Git Repository Setup

## Current Status

❌ **Git repository is NOT initialized**
❌ **No remote configured**
❌ **Not connected to GitHub**

## What You Need to Do

### Step 1: Initialize Git Repository

```bash
# Navigate to project
cd /Users/farzad/fbc_lab_v10

# Initialize git
git init

# Set default branch to main (if needed)
git branch -M main
```

### Step 2: Configure Git (If Not Already Done)

```bash
# Set your name and email
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Or set globally
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Step 3: Create GitHub Repository

**On GitHub:**
1. Go to https://github.com/new
2. Repository name: `fbc_lab_v10` (or your preferred name)
3. Description: "Clean codebase import and organization"
4. Choose: Public or Private
5. **Important:** Don't initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### Step 4: Connect to GitHub

**Option A: HTTPS (Easier)**
```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/fbc_lab_v10.git

# Verify
git remote -v
```

**Option B: SSH (More Secure)**
```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin git@github.com:YOUR_USERNAME/fbc_lab_v10.git

# Verify
git remote -v
```

### Step 5: Authenticate with GitHub

**For HTTPS:**
- You'll need a Personal Access Token
- Go to: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Generate token with `repo` scope
- Use token as password when pushing

**For SSH:**
- Generate SSH key: `ssh-keygen -t ed25519 -C "your.email@example.com"`
- Add to GitHub: Settings → SSH and GPG keys
- Test: `ssh -T git@github.com`

**Or use GitHub CLI:**
```bash
# Install: brew install gh
gh auth login
```

### Step 6: Initial Commit and Push

```bash
# Stage all files
git add .

# Verify no secrets will be committed
pnpm check:secrets

# Check what will be committed
git status

# Initial commit
git commit -m "initial: project setup and documentation

- Set up TypeScript, ESLint, Prettier
- Created import strategy and documentation
- Set up Git hooks (pre-commit, pre-push)
- Created context preservation system
- Set up deployment guides (Vercel, Fly.io, Supabase)
- Created testing and cleanup strategy"

# Push to GitHub
git push -u origin main
```

## Verification

After setup, verify:

```bash
# Check git status
git status

# Check remote
git remote -v

# Check branches
git branch -a

# Test connection
git ls-remote origin
```

## Important: Before First Push

### Security Check

```bash
# 1. Verify no secrets
pnpm check:secrets

# 2. Verify .env files are ignored
git status | grep .env
# Should show nothing

# 3. Verify important files are tracked
git ls-files | grep -E "(PROJECT_STATUS|\.cursorrules|docs/)"

# 4. Verify secrets are NOT tracked
git ls-files | grep -E "\.env$|\.env\.local|fly\.toml$|vercel\.json$"
# Should return nothing
```

## Quick Setup Script

```bash
#!/bin/bash
# Run this to set up git (replace YOUR_USERNAME)

cd /Users/farzad/fbc_lab_v10

# Initialize
git init
git branch -M main

# Add remote (update YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/fbc_lab_v10.git

# Stage files
git add .

# Verify no secrets
pnpm check:secrets || echo "⚠️  Check secrets before committing!"

# Initial commit
git commit -m "initial: project setup and documentation"

echo "✅ Git initialized!"
echo "📝 Next: Create GitHub repo and push:"
echo "   git push -u origin main"
```

## See Also

- [Git Setup Guide](./docs/GIT_SETUP_GUIDE.md) - Detailed guide
- [Git Workflow](./docs/GIT_WORKFLOW.md) - Commit guidelines
- [Secrets Management](./docs/SECRETS_MANAGEMENT.md) - Security checklist

