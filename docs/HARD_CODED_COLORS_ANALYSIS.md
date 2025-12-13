# Hard-Coded Colors Analysis

**Generated:** 2025-01-XX  
**Purpose:** Identify all components using hard-coded colors instead of design tokens and theme mode

---

## Summary

Found **37 components** with hard-coded color values. Many use theme mode (`isDarkMode`) but still hard-code colors instead of using design tokens from `components/chat/design-tokens.ts`.

---

## Components with Hard-Coded Colors

### 🔴 Critical Issues (No Theme Support)

#### 1. `components/chat/CodeBlock.tsx`
**Issues:**
- Uses hard-coded `bg-gray-50`, `bg-gray-900`, `text-gray-800`, etc.
- Has theme support but doesn't use design tokens
- Lines 14-36: Hard-coded color classes in THEMES object

**Recommendation:**
```typescript
// Replace with design tokens
import { BG, TEXT } from './design-tokens';
const THEMES = {
  light: {
    background: BG.subtle,
    text: TEXT.primary,
    // ...
  }
}
```

---

### 🟡 Medium Issues (Theme Support but Hard-Coded Values)

#### 2. `components/LandingPage.tsx`
**Issues:**
- Line 224: `bg-[#1a1a1a]` - Hard-coded hex color
- Uses `isDarkMode` but hard-codes colors
- Multiple instances of hard-coded `bg-white`, `text-slate-900`, etc.

**Hard-coded values:**
- `bg-[#1a1a1a]` (line 224)
- `bg-white text-slate-900` (multiple)
- `bg-white/10`, `bg-white/40`, `bg-white/60` (multiple)

**Recommendation:**
```typescript
import { BG, TEXT } from './chat/design-tokens';
// Replace bg-[#1a1a1a] with BG.default or create token
```

---

#### 3. `components/AdminDashboard.tsx`
**Issues:**
- Line 172: `bg-[#050505]` - Hard-coded hex
- Line 522: `bg-[#1a1a1a]` - Hard-coded hex
- Uses `isDarkMode` but hard-codes colors

**Hard-coded values:**
- `bg-[#050505]` (line 172)
- `bg-[#1a1a1a]` (line 522)
- `bg-gray-50`, `text-slate-900` (line 172)

**Recommendation:**
```typescript
import { BG, TEXT } from '../chat/design-tokens';
// Replace hex values with design tokens
```

---

#### 4. `components/chat/DiscoveryReportPreview.tsx`
**Issues:**
- Lines 40-67: Hard-coded hex colors in CSS string
- Uses `isDarkMode` but hard-codes all color values
- Inline styles with hard-coded colors

**Hard-coded values:**
- `#e4e4e7`, `#27272a`, `#000000`, `#ffffff` (lines 40-41)
- `#18181b`, `#3f3f46`, `#e4e4e7` (lines 51-53)
- `#f97316`, `#ea580c` (lines 57, 59, 63, 67)

**Recommendation:**
```typescript
// Extract colors to design tokens
const COLORS = {
  text: {
    primary: isDarkMode ? '#e4e4e7' : '#27272a',
    // ...
  }
}
// Or use CSS variables
```

---

#### 5. `components/AntigravityCanvas.tsx`
**Issues:**
- Lines 408, 410: Hard-coded rgba values
- Lines 425, 447, 469, 488: Multiple hard-coded rgba colors
- Line 548: Hard-coded hex `#000000`, `#f9fafb`

**Hard-coded values:**
- `rgba(0, 0, 0, ${clearOpacity})` (line 408)
- `rgba(249, 250, 251, ${clearOpacity})` (line 410)
- `rgba(255, 255, 255, 0.05)` (line 425)
- `rgba(255, 165, 0, 0.3)` (line 469)
- `#000000`, `#f9fafb` (line 548)

**Note:** Canvas rendering requires rgba values, but should reference design tokens

**Recommendation:**
```typescript
// Create canvas color tokens
const CANVAS_COLORS = {
  background: {
    dark: 'rgba(0, 0, 0, 0.25)',
    light: 'rgba(249, 250, 251, 0.25)',
  }
}
```

---

#### 6. `components/chat/ChatInputDock.tsx`
**Issues:**
- Multiple hard-coded `bg-gray-50`, `bg-gray-100`, `text-gray-900`
- Uses `isDarkMode` but hard-codes Tailwind classes
- Lines 232, 246, 295, 305: Hard-coded color classes

**Hard-coded values:**
- `bg-gray-50/80 dark:bg-black/80` (line 232)
- `text-gray-900 dark:text-gray-100` (line 246)
- `bg-gray-50 dark:bg-black` (line 205)
- `bg-gray-100 dark:bg-white/10` (multiple)

**Recommendation:**
```typescript
import { BG, TEXT, BORDER } from './design-tokens';
// Replace with tokens
className={`${BG.glass} ${BORDER.glass} ${TEXT.primary}`}
```

---

#### 7. `components/MultimodalChat.tsx`
**Issues:**
- Lines 350, 396, 405, 409: Hard-coded `bg-gray-50`, `bg-gray-300`
- Uses `isDarkMode` but hard-codes colors
- Line 355: Hard-coded rgba in boxShadow

**Hard-coded values:**
- `bg-gray-50 dark:bg-black` (lines 350, 396, 405)
- `bg-gray-300 dark:bg-gray-600` (line 409)
- `rgba(0, 0, 0, 0.25)` (line 355)

**Recommendation:**
```typescript
import { BG } from './chat/design-tokens';
// Replace bg-gray-50 with BG.subtle
```

---

#### 8. `components/TermsOverlay.tsx`
**Issues:**
- Line 124: Hard-coded rgba in inline style
- Uses `isDarkMode` but hard-codes rgba values

**Hard-coded values:**
- `rgba(5, 5, 5, 0.7)` (dark mode)
- `rgba(248, 249, 250, 0.7)` (light mode)

**Recommendation:**
```typescript
// Extract to design tokens
const OVERLAY_BG = {
  dark: 'rgba(5, 5, 5, 0.7)',
  light: 'rgba(248, 249, 250, 0.7)',
}
```

---

#### 9. `components/chat/CalendarWidget.tsx`
**Issues:**
- Lines 51-52, 68-69: Hard-coded rgba values
- Uses `isDarkMode` but hard-codes colors

**Hard-coded values:**
- `rgba(0, 0, 0, 0.15)`, `rgba(248, 249, 250, 0.2)` (lines 51-52)
- `rgba(220, 220, 230, ${particle.alpha * 0.6})` (line 68)
- `rgba(20, 20, 20, ${particle.alpha * 0.4})` (line 69)

**Recommendation:**
```typescript
// Extract to design tokens for canvas rendering
```

---

#### 10. `components/chat/WebcamPreview.tsx`
**Issues:**
- Line 287: Hard-coded `bg-cyan-400` and rgba in shadow
- No theme support for indicator color

**Hard-coded values:**
- `bg-cyan-400`
- `rgba(34,211,238,0.8)` (shadow)

**Recommendation:**
```typescript
// Use semantic color tokens
import { SEMANTIC } from './design-tokens';
// Or create status indicator tokens
```

---

#### 11. `components/chat/ScreenSharePreview.tsx`
**Issues:**
- Line 110: Hard-coded `bg-purple-400` and rgba in shadow
- No theme support

**Hard-coded values:**
- `bg-purple-400`
- `rgba(168,85,247,0.8)` (shadow)

**Recommendation:**
```typescript
// Use semantic color tokens
```

---

#### 12. `components/ServiceIconParticles.tsx`
**Issues:**
- Lines 71-73: Hard-coded rgba values for colors
- Lines 333-334, 364-365: Hard-coded rgba values
- Uses `isDarkMode` but hard-codes rgba

**Hard-coded values:**
- `rgba(251, 146, 60, ...)` (orange)
- `rgba(59, 130, 246, ...)` (blue)
- `rgba(168, 85, 247, ...)` (purple)
- `rgba(0, 0, 0, 0.12)`, `rgba(255, 255, 255, 0.15)` (lines 333-334)

**Recommendation:**
```typescript
// Extract to particle color tokens
const PARTICLE_COLORS = {
  orange: { dark: 'rgba(251, 146, 60, ', light: 'rgba(249, 115, 22, ' },
  // ...
}
```

---

### 🟢 Minor Issues (Theme Support Present)

#### 13. `components/chat/ChatMessage.tsx`
**Status:** Uses `isDarkMode` and mostly theme-aware
**Issues:**
- Some hard-coded `bg-white`, `bg-black`, `text-white` classes
- Could use design tokens more consistently

**Hard-coded values:**
- `bg-white dark:bg-black` (multiple)
- `text-white` (multiple)
- `bg-zinc-50 dark:bg-black` (line 125)

**Recommendation:**
```typescript
import { BG, TEXT } from './design-tokens';
// Replace with tokens
```

---

#### 14. `components/chat/EmptyState.tsx`
**Status:** Uses `isDarkMode` and design tokens partially
**Issues:**
- Line 32: `bg-black`, `bg-gray-50` hard-coded
- Line 33: `text-black dark:text-white` hard-coded

**Hard-coded values:**
- `bg-black`, `bg-gray-50` (line 32)
- `text-black dark:text-white` (line 33)

**Recommendation:**
```typescript
import { BG, TEXT } from './design-tokens';
```

---

#### 15. `components/BrowserCompatibility.tsx`
**Status:** Uses `isDarkMode` prop
**Issues:**
- Line 28: Hard-coded `bg-red-900/90`, `bg-red-50`
- Uses semantic colors but hard-coded

**Hard-coded values:**
- `bg-red-900/90 border-red-700` (dark)
- `bg-red-50 border-red-200` (light)

**Recommendation:**
```typescript
import { SEMANTIC } from '../chat/design-tokens';
// Use SEMANTIC.redBg
```

---

## Design Token Gaps

### Missing Tokens in `components/chat/design-tokens.ts`:

1. **Canvas/Animation Colors**
   - Canvas background colors (rgba values)
   - Particle colors
   - Animation overlay colors

2. **Specific Hex Colors**
   - `#1a1a1a` (dark gray)
   - `#050505` (near black)
   - `#f9fafb` (gray-50)
   - `#e4e4e7` (zinc-200)
   - `#27272a` (zinc-800)

3. **Status Indicator Colors**
   - Cyan (webcam)
   - Purple (screen share)
   - Orange (connection)

4. **Overlay Colors**
   - Modal backdrop rgba values
   - Glass morphism rgba values

---

## Recommendations

### 1. Extend Design Tokens

Add to `components/chat/design-tokens.ts`:

```typescript
// Canvas/Animation Colors
export const CANVAS = {
  background: {
    dark: 'rgba(0, 0, 0, 0.25)',
    light: 'rgba(249, 250, 250, 0.25)',
  },
  stroke: {
    dark: 'rgba(255, 255, 255, 0.05)',
    light: 'rgba(0, 0, 0, 0.03)',
  },
} as const;

// Specific Color Values
export const COLORS = {
  nearBlack: '#050505',
  darkGray: '#1a1a1a',
  gray50: '#f9fafb',
  zinc200: '#e4e4e7',
  zinc800: '#27272a',
} as const;

// Status Indicators
export const INDICATORS = {
  webcam: {
    bg: 'bg-cyan-400',
    shadow: 'shadow-[0_0_8px_rgba(34,211,238,0.8)]',
  },
  screenShare: {
    bg: 'bg-purple-400',
    shadow: 'shadow-[0_0_8px_rgba(168,85,247,0.8)]',
  },
} as const;

// Overlay Colors
export const OVERLAY = {
  backdrop: {
    dark: 'rgba(5, 5, 5, 0.7)',
    light: 'rgba(248, 249, 250, 0.7)',
  },
} as const;
```

### 2. Migration Priority

**High Priority:**
1. `LandingPage.tsx` - User-facing, high visibility
2. `AdminDashboard.tsx` - Admin interface
3. `ChatInputDock.tsx` - Core UI component
4. `MultimodalChat.tsx` - Core UI component

**Medium Priority:**
5. `DiscoveryReportPreview.tsx` - Feature component
6. `AntigravityCanvas.tsx` - Visual component
7. `ChatMessage.tsx` - Core UI component

**Low Priority:**
8. Canvas/particle components (require rgba values)
9. Status indicators (semantic colors acceptable)

### 3. Migration Pattern

```typescript
// Before
className={`${isDarkMode ? 'bg-black' : 'bg-gray-50'}`}

// After
import { BG } from './chat/design-tokens';
className={BG.subtle} // Automatically handles dark mode
```

---

## Files Analyzed

Total: **37 components** checked

**Components with hard-coded colors:**
- ✅ Using design tokens: ~15 components
- ⚠️ Partial design tokens: ~10 components  
- ❌ No design tokens: ~12 components

---

## Next Steps

1. **Extend design tokens** with missing color values
2. **Migrate high-priority components** first
3. **Create migration guide** for team
4. **Add linting rule** to prevent hard-coded colors
5. **Update component library** documentation

---

## Notes

- Canvas components (`AntigravityCanvas`, `ServiceIconParticles`) require rgba values for rendering, but should reference design tokens
- Some components use `isDarkMode` correctly but still hard-code Tailwind classes instead of using tokens
- Design tokens exist but are not consistently used across all components

