---
description: Deploy WebSocket server to Fly.io
---

# Deploy WebSocket Server to Fly.io

// turbo-all

## 1. Verify build passes before deploying
```bash
pnpm build
```

## 2. Check fly.toml configuration
```bash
cat fly.toml
```

## 3. Check Fly.io app status
```bash
fly status --app fb-consulting-websocket
```

## 4. View current secrets (names only)
```bash
fly secrets list --app fb-consulting-websocket
```

## 5. Deploy to Fly.io
```bash
fly deploy --app fb-consulting-websocket
```

## 6. Verify deployment health
```bash
fly status --app fb-consulting-websocket
```

## 7. Check health endpoint
```bash
curl -s https://fb-consulting-websocket.fly.dev/health
```

## 8. Watch logs after deployment
```bash
fly logs --app fb-consulting-websocket | head -50
```

## Setting Secrets (if needed)

```bash
# Required secrets for WebSocket server
fly secrets set GEMINI_API_KEY="your-key" --app fb-consulting-websocket
fly secrets set SUPABASE_URL="your-url" --app fb-consulting-websocket
fly secrets set SUPABASE_ANON_KEY="your-key" --app fb-consulting-websocket
fly secrets set SUPABASE_SERVICE_ROLE_KEY="your-key" --app fb-consulting-websocket
fly secrets set GEMINI_LIVE_MODEL="gemini-2.5-flash-native-audio-preview" --app fb-consulting-websocket
```

## Troubleshooting

### Deployment failed
```bash
# Check build logs
fly logs --app fb-consulting-websocket

# Force rebuild
fly deploy --app fb-consulting-websocket --no-cache
```

### Health check failing
```bash
# SSH into the machine
fly ssh console --app fb-consulting-websocket

# Check if process is running
ps aux | grep node
```

### WebSocket not connecting from frontend
- Check `NEXT_PUBLIC_WSS_URL` in Vercel points to Fly.io URL
- Verify CORS allows your frontend domain
- Check Fly.io logs for connection attempts

## Rollback if needed
```bash
# List recent deployments
fly releases --app fb-consulting-websocket

# Rollback to previous version
fly deploy --image <previous-image-id> --app fb-consulting-websocket
```
