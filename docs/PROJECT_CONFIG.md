# Project Configuration

## Build Tool
✅ **Vite + React** (confirmed by `vite.config.ts` and `vitest.config.ts`)

## Import Path Strategy

### ✅ **Absolute paths from root** (NO @ alias)

The project uses **absolute imports from the project root**, not `@/` aliases.

### Import Pattern Examples:

```typescript
// ✅ CORRECT - Absolute from root
import { AdminDashboard } from 'components/AdminDashboard'
import { geminiLiveService } from 'services/geminiLiveService'
import { constants } from 'src/config/constants'
import { pdfUtils } from 'utils/pdfUtils'

// ❌ WRONG - Don't use @ alias
import { AdminDashboard } from '@/components/AdminDashboard'

// ❌ WRONG - Don't use relative (except in rare cases)
import { AdminDashboard } from '../components/AdminDashboard'
```

### Project Structure (from root):

```
/
├── components/          # React components
├── services/            # Frontend services  
├── utils/              # Utility functions
├── context/            # React context
├── api/                # API routes
├── server/              # WebSocket server
├── src/                # Core source code
│   ├── core/           # Core business logic
│   ├── config/         # Configuration
│   ├── lib/            # Libraries
│   └── types/          # TypeScript types
├── types.ts            # Root types file
└── config.ts           # Root config file
```

### Vite Configuration

Vite resolves imports from the project root by default. No special alias configuration needed.

If you need to configure it explicitly in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Imports resolve from project root by default
    // No alias needed for absolute imports
  }
})
```

### TypeScript Configuration

For TypeScript to recognize these imports, `tsconfig.json` should have:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      // No paths needed - absolute imports work from root
    }
  }
}
```

## Import Path Rules

1. **Use absolute paths from root** - `components/X`, `services/Y`, `src/Z`
2. **No `@/` alias** - Don't use `@/components/X`
3. **Minimal relative paths** - Only use `../` when necessary (e.g., in nested scripts)
4. **Keep structure flat** - Files at root level can import each other directly

## When Importing Files

When importing files, use these patterns:

```typescript
// Components
import { Component } from 'components/ComponentName'
import { Component } from 'components/chat/ChatComponent'

// Services
import { service } from 'services/serviceName'

// Utils
import { util } from 'utils/utilName'
import { util } from 'utils/visuals/utilName'

// Core
import { something } from 'src/core/module'
import { config } from 'src/config/constants'

// Root files
import { types } from 'types'
import { config } from 'config'
```

## Migration Notes

When updating imports during migration:

- ✅ Keep absolute paths: `components/X` → `components/X`
- ✅ Keep absolute paths: `src/core/X` → `src/core/X`
- ❌ Don't add `@/` prefix
- ❌ Don't convert to relative paths unless necessary

