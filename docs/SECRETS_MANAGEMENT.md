# Secrets Management Guide

## 🔒 Critical: Never Commit Secrets

**API keys, passwords, tokens, and other secrets MUST NEVER be committed to the repository.**

## What Counts as a Secret?

### API Keys
- ❌ Google API keys
- ❌ OpenAI API keys
- ❌ Gemini API keys
- ❌ Any third-party service API keys

### Authentication
- ❌ JWT secrets
- ❌ OAuth client secrets
- ❌ Refresh tokens
- ❌ Access tokens

### Database
- ❌ Database passwords
- ❌ Connection strings with passwords
- ❌ Supabase service role keys

### Service Accounts
- ❌ Service account JSON files
- ❌ Private keys
- ❌ Certificate files

### Other
- ❌ Email service API keys
- ❌ Payment processing keys
- ❌ Any credential that grants access

## How to Handle Secrets

### ✅ Use Environment Variables

**Instead of:**
```typescript
// ❌ BAD - Never do this!
const API_KEY = 'AIzaSyB...'
```

**Do this:**
```typescript
// ✅ GOOD - Use environment variables
const API_KEY = process.env.GOOGLE_API_KEY

if (!API_KEY) {
  throw new Error('GOOGLE_API_KEY is not set')
}
```

### ✅ Use .env Files

1. **Create `.env` file** (gitignored)
   ```bash
   GOOGLE_API_KEY=your_actual_key_here
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_key_here
   ```

2. **Create `.env.example`** (committed to repo)
   ```bash
   GOOGLE_API_KEY=your_google_api_key_here
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. **Load in code:**
   ```typescript
   import { config } from 'dotenv'
   config() // Loads .env file
   ```

### ✅ Use Vite Environment Variables

For Vite projects, prefix with `VITE_`:

```bash
# .env
VITE_GOOGLE_API_KEY=your_key_here
```

```typescript
// Access in code
const apiKey = import.meta.env.VITE_GOOGLE_API_KEY
```

## Automatic Detection

### Pre-Commit Hook

**Secret detection runs automatically before every commit!**

The `check-secrets.js` script scans for:
- API key patterns
- Token patterns
- Password patterns
- Secret patterns
- Database connection strings
- Service account keys
- `.env` files

**If secrets are detected, the commit is BLOCKED.**

### Manual Check

```bash
# Check staged files for secrets
pnpm check:secrets

# Or check specific file
git diff HEAD -- path/to/file.ts | node scripts/check-secrets.js
```

## If You Accidentally Commit Secrets

### Immediate Actions

1. **Rotate the secrets immediately!**
   - Generate new API keys
   - Change passwords
   - Revoke old tokens

2. **Remove from Git history:**
   ```bash
   # Remove from last commit (if not pushed)
   git reset --soft HEAD~1
   git reset HEAD <file-with-secret>
   git commit -m "fix: remove secrets"
   
   # If already pushed, use git filter-branch or BFG Repo-Cleaner
   ```

3. **Add to .gitignore:**
   ```bash
   echo "file-with-secret" >> .gitignore
   ```

4. **Notify team:**
   - Let team know secrets were exposed
   - Share new secrets securely
   - Update documentation

## Best Practices

### ✅ DO

- ✅ Use environment variables
- ✅ Use `.env` files (gitignored)
- ✅ Commit `.env.example` with placeholders
- ✅ Use secret management services (Vercel, AWS Secrets Manager)
- ✅ Review code before committing
- ✅ Run `pnpm check:secrets` before committing

### ❌ DON'T

- ❌ Hardcode secrets in source code
- ❌ Commit `.env` files with real values
- ❌ Commit config files with secrets
- ❌ Put secrets in comments
- ❌ Share secrets in chat/email
- ❌ Bypass pre-commit hooks

## File Patterns to Watch

These file patterns are automatically gitignored:

```
.env
.env.*
*.env
*.pem
*.key
*.p12
*.pfx
secrets/
credentials/
*service-account*.json
*private-key*.json
fly.toml          # Fly.io config (may contain secrets)
vercel.json       # Vercel config (may contain secrets)
supabase/config.toml  # Supabase local config
```

**Note:** Keep `.example` versions of config files for documentation:
- `fly.toml.example` ✅ (committed)
- `vercel.json.example` ✅ (committed)
- `supabase/config.toml.example` ✅ (committed)

## Example: Setting Up Environment Variables

### 1. Create .env file

```bash
# .env (gitignored)
GOOGLE_API_KEY=AIzaSyB...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your-secret-here
```

### 2. Create .env.example

```bash
# .env.example (committed)
# WebSocket (local vs production)
VITE_WEBSOCKET_URL=ws://localhost:8080  # Local development
# Production: wss://fb-consulting-websocket.fly.dev (set in Vercel)

GOOGLE_API_KEY=your_google_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
JWT_SECRET=your_jwt_secret_here
```

### 3. Load in code

```typescript
// src/config/env.ts
export const config = {
  googleApiKey: process.env.GOOGLE_API_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  jwtSecret: process.env.JWT_SECRET,
}

// Validate all required env vars are set
Object.entries(config).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
})
```

## Deployment Platforms

This project uses:
- **Vercel** - Frontend (environment variables in Vercel dashboard)
- **Fly.io** - WebSocket server (secrets via `fly secrets set`)
- **Supabase** - Database (config in Supabase dashboard)

**Never commit:**
- Real `fly.toml` with secrets
- Real `vercel.json` with secrets
- Real `supabase/config.toml` with secrets

**Always commit:**
- `.example` versions of config files
- Migration files (Supabase migrations are safe)

See [Deployment](./DEPLOYMENT.md) for platform-specific setup.

## See Also

- [Deployment](./DEPLOYMENT.md) - Platform-specific deployment guide
- [Git Workflow](./GIT_WORKFLOW.md) - Commit guidelines
- [Commit Guidelines](./COMMIT_GUIDELINES.md) - Quick reference

