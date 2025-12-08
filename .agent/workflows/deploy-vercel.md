---
description: Deploy frontend and API to Vercel
---

# Deploy to Vercel

// turbo-all

## 1. Verify build passes locally
```bash
pnpm build
```

## 2. Check for TypeScript errors
```bash
pnpm type-check
```

## 3. Check vercel.json configuration
```bash
cat vercel.json
```

## 4. Deploy to production
```bash
vercel --prod
```

## 5. Check deployment status
```bash
vercel ls | head -10
```

## 6. View deployment logs
```bash
vercel logs --follow
```

## 7. Test production endpoints
```bash
# Replace with your actual domain
curl -s https://your-app.vercel.app/api/health 2>/dev/null || echo "Check endpoint"
```

## Environment Variables (Vercel Dashboard)

Required environment variables:
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_WSS_URL` (points to Fly.io WebSocket)

## Troubleshooting

### Build failed on Vercel
```bash
# Check local build first
pnpm build

# Common issue: ESM imports
grep -rn "from 'src/" api/ | head -10
```

### API returning 500
```bash
# Check Vercel function logs
vercel logs

# Common causes:
# - Missing env vars
# - ESM import issues (src/ instead of relative)
# - Missing .js extensions on dynamic imports
```

### SPA routes returning 404
Check `vercel.json` has the rewrite rule:
```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

### Function size limit exceeded
- Check for large dependencies
- Consider code splitting
- Use dynamic imports

## Preview Deployments
```bash
# Deploy preview (not production)
vercel

# Get preview URL from output
```

## Rollback
```bash
# List deployments
vercel ls

# Promote a previous deployment to production
vercel promote <deployment-url>
```
