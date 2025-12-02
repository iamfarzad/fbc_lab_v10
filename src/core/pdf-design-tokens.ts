/**
 * PDF Design Tokens
 * Extracted from app/globals.css design system
 * Converts CSS variables to PDF-usable values (RGB for pdf-lib, HSL for HTML)
 */

// HSL to RGB conversion helper
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100
  l /= 100
  
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  
  let r = 0, g = 0, b = 0
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x
  }
  
  return [(r + m), (g + m), (b + m)]
}

// Convert rem to points (1rem = 16px = 12pt)
function remToPt(rem: number): number {
  return rem * 12
}

// Convert rem to pixels (1rem = 16px)
function remToPx(rem: number): number {
  return rem * 16
}

/**
 * PDF Design Tokens
 * Values extracted from globals.css CSS variables
 */
export const PDF_DESIGN_TOKENS = {
  // Colors (from globals.css)
  colors: {
    // Accent/Orange: --accent: 17 90% 55%
    accent: {
      hsl: 'hsl(17, 90%, 55%)',
      rgb: hslToRgb(17, 90, 55),
      hex: '#ff5b04',
    },
    // Foreground: --foreground: 210 13% 16%
    foreground: {
      hsl: 'hsl(210, 13%, 16%)',
      rgb: hslToRgb(210, 13, 16),
      hex: '#1f2937',
    },
    // Dark color for headings: ~#222
    dark: {
      hsl: 'hsl(0, 0%, 13%)',
      rgb: hslToRgb(0, 0, 13),
      hex: '#222',
    },
    // Muted foreground: --muted-foreground: 210 9% 38%
    mutedForeground: {
      hsl: 'hsl(210, 9%, 38%)',
      rgb: hslToRgb(210, 9, 38),
      hex: '#666',
    },
    // Light gray border: #e0e0e0
    lightGray: {
      hsl: 'hsl(0, 0%, 88%)',
      rgb: hslToRgb(0, 0, 88),
      hex: '#e0e0e0',
    },
    // Text color: #444
    text: {
      hsl: 'hsl(0, 0%, 27%)',
      rgb: hslToRgb(0, 0, 27),
      hex: '#444',
    },
  },

  // Typography (from globals.css font-size variables)
  typography: {
    // Title: --font-size-4xl: 2.25rem = 36px
    title: {
      size: remToPt(2.25), // 27pt
      px: remToPx(2.25), // 36px
      weight: 300, // --font-weight-light
      lineHeight: 1.25, // --line-height-tight
      letterSpacing: -0.025, // --letter-spacing-tight
    },
    // Client name: --font-size-xl: 1.25rem = 20px
    clientName: {
      size: remToPt(1.25), // 15pt
      px: remToPx(1.25), // 20px
      weight: 500, // --font-weight-medium
      lineHeight: 1.375, // --line-height-snug
    },
    // Section title: --font-size-lg: 1.125rem = 18px (using 16px for section titles)
    sectionTitle: {
      size: remToPt(1), // 12pt
      px: remToPx(1), // 16px
      weight: 600, // --font-weight-semibold
      lineHeight: 1.5, // --line-height-normal
      letterSpacing: 0.5, // uppercase letter spacing
    },
    // Body: --font-size-sm: 0.875rem = 14px
    body: {
      size: remToPt(0.875), // 10.5pt
      px: remToPx(0.875), // 14px
      weight: 400, // --font-weight-normal
      lineHeight: 1.625, // --line-height-relaxed
    },
    // Small text: --font-size-xs: 0.75rem = 12px
    small: {
      size: remToPt(0.75), // 9pt
      px: remToPx(0.75), // 12px
      weight: 400, // --font-weight-normal
      lineHeight: 1.5, // --line-height-normal
    },
    // Logo: 24px
    logo: {
      size: remToPt(1.5), // 18pt
      px: remToPx(1.5), // 24px
      weight: 700, // --font-weight-bold
    },
  },

  // Spacing (from globals.css spacing variables)
  spacing: {
    // --spacing-xs: 0.25rem = 4px
    xs: {
      px: remToPx(0.25), // 4px
      pt: remToPt(0.25), // 3pt
    },
    // --spacing-sm: 0.5rem = 8px
    sm: {
      px: remToPx(0.5), // 8px
      pt: remToPt(0.5), // 6pt
    },
    // --spacing-md: 1rem = 16px
    md: {
      px: remToPx(1), // 16px
      pt: remToPt(1), // 12pt
    },
    // --spacing-lg: 1.5rem = 24px
    lg: {
      px: remToPx(1.5), // 24px
      pt: remToPt(1.5), // 18pt
    },
    // --spacing-xl: 2rem = 32px
    xl: {
      px: remToPx(2), // 32px
      pt: remToPt(2), // 24pt
    },
    // --spacing-2xl: 3rem = 48px
    xxl: {
      px: remToPx(3), // 48px
      pt: remToPt(3), // 36pt
    },
    // Section margin: 40px (between sections)
    sectionMargin: {
      px: 40,
      pt: 30,
    },
    // Page margin: 1in = 72pt
    pageMargin: {
      px: 96, // 1in = 96px
      pt: 72, // 1in = 72pt
    },
  },

  // Border
  border: {
    // Header border thickness: 2px
    headerThickness: 2,
    // Footer border thickness: 1px
    footerThickness: 1,
  },
} as const

/**
 * Helper function to get RGB color for pdf-lib
 * Usage: rgb(...PDF_DESIGN_TOKENS.colors.accent.rgb)
 */
export function getRgbColor(color: 'accent' | 'foreground' | 'dark' | 'mutedForeground' | 'lightGray' | 'text') {
  return PDF_DESIGN_TOKENS.colors[color].rgb
}

/**
 * Helper function to get HSL color string for HTML
 * Usage: PDF_DESIGN_TOKENS.colors.accent.hsl
 */
export function getHslColor(color: 'accent' | 'foreground' | 'dark' | 'mutedForeground' | 'lightGray' | 'text') {
  return PDF_DESIGN_TOKENS.colors[color].hsl
}

