/**
 * Chat Design System Tokens
 * Centralized constants for consistent styling across chat components
 */

// Button Sizes
export const BUTTON_SIZE = {
  icon: 'w-8 h-8', // 32px - Standard icon buttons
  primary: 'w-9 h-9', // 36px - Primary actions (Send, Voice)
} as const;

// Icon Sizes
export const ICON_SIZE = {
  sm: 'w-3.5 h-3.5', // 14px - Small icons
  md: 'w-4 h-4', // 16px - Standard icons
  lg: 'w-5 h-5', // 20px - Large/hero icons
} as const;

// Border Radius
export const RADIUS = {
  sm: 'rounded-lg', // 8px - Small cards
  md: 'rounded-xl', // 12px - Medium cards/modals
  lg: 'rounded-2xl', // 16px - Large containers
  full: 'rounded-full', // Pills/avatars
} as const;

// Typography Scale
export const TEXT_SIZE = {
  metadata: 'text-[10px]', // 10px - Metadata, labels
  label: 'text-[11px]', // 11px - UI labels
  body: 'text-[13px]', // 13px - Secondary text
  default: 'text-[14px]', // 14px - Primary text
  input: 'text-[15px]', // 15px - Input fields
} as const;

// Spacing Scale
export const GAP = {
  xs: 'gap-1.5', // 6px
  sm: 'gap-2', // 8px
  md: 'gap-3', // 12px - Standard spacing
  lg: 'gap-4', // 16px
} as const;

// Padding Scale
export const PADDING = {
  xs: 'p-1.5',
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
  xl: 'p-6',
} as const;

// Animation Durations
export const DURATION = {
  instant: 'duration-200', // 200ms - Instant feedback
  normal: 'duration-300', // 300ms - Standard transitions
  emphasis: 'duration-500', // 500ms - Emphasized animations
} as const;

// Transition Types
export const TRANSITION = {
  all: 'transition-all',
  colors: 'transition-colors',
  opacity: 'transition-opacity',
  transform: 'transition-transform',
} as const;

// Easing Curves
export const EASING = {
  spring: 'cubic-bezier(0.16, 1, 0.3, 1)', // Smooth spring animation
  inOut: 'ease-in-out',
  out: 'ease-out',
} as const;

// Background Colors
export const BG = {
  default: 'bg-white dark:bg-zinc-900',
  subtle: 'bg-zinc-50 dark:bg-zinc-900',
  card: 'bg-white/80 dark:bg-zinc-900/80',
  glass: 'bg-white/90 dark:bg-zinc-950/90',
  hover: 'hover:bg-zinc-100 dark:hover:bg-white/10',
  active: 'bg-zinc-200 dark:bg-white/20',
} as const;

// Border Colors
export const BORDER = {
  default: 'border-zinc-200 dark:border-zinc-800',
  subtle: 'border-zinc-100 dark:border-zinc-800',
  glass: 'border-white/40 dark:border-white/10',
  hover: 'hover:border-zinc-400 dark:hover:border-zinc-600',
} as const;

// Text Colors
export const TEXT = {
  primary: 'text-zinc-900 dark:text-zinc-100',
  secondary: 'text-zinc-600 dark:text-zinc-400', // 60% opacity
  tertiary: 'text-zinc-500 dark:text-zinc-500', // 50% opacity
  muted: 'text-zinc-400 dark:text-zinc-600', // 40% opacity
} as const;

// Backdrop Blur
export const BLUR = {
  standard: 'backdrop-blur-xl',
  strong: 'backdrop-blur-2xl',
} as const;

// Shadows
export const SHADOW = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
} as const;

// Animation Classes
export const ANIMATION = {
  fadeInUp: 'animate-fade-in-up',
  fadeInScale: 'animate-fade-in-scale',
  slideUp: 'animate-slide-up',
  popIn: 'animate-pop-in',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
} as const;

// Common Component Patterns
export const PATTERNS = {
  iconButton: `${BUTTON_SIZE.icon} flex items-center justify-center ${RADIUS.full} ${TRANSITION.colors} ${BG.hover}`,
  primaryButton: `${BUTTON_SIZE.primary} flex items-center justify-center ${RADIUS.full} ${TRANSITION.all} ${SHADOW.md}`,
  pill: `px-2.5 py-1 ${RADIUS.full} ${TEXT_SIZE.metadata} font-mono uppercase tracking-wide`,
  card: `${PADDING.md} ${RADIUS.md} ${BORDER.default} ${BG.card} ${SHADOW.sm}`,
  glassPanel: `${BG.glass} ${BLUR.standard} ${BORDER.glass} ${SHADOW.sm}`,
} as const;

// Semantic Colors
export const SEMANTIC = {
  // Status colors
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  red: 'bg-red-500',

  // Status text
  orangeText: 'text-orange-500',
  blueText: 'text-blue-500',
  purpleText: 'text-purple-500',
  greenText: 'text-green-500',
  redText: 'text-red-500',

  // Status backgrounds
  orangeBg: 'bg-orange-50 dark:bg-orange-900/20',
  blueBg: 'bg-blue-50 dark:bg-blue-900/20',
  purpleBg: 'bg-purple-50 dark:bg-purple-900/20',
  greenBg: 'bg-green-50 dark:bg-green-900/20',
  redBg: 'bg-red-50 dark:bg-red-900/20',
} as const;

// Accessibility - Minimum touch targets
export const TOUCH_TARGET = {
  min: '44px', // iOS minimum (44x44pt)
  preferred: '48px', // Android preferred (48x48dp)
} as const;

// Z-Index Scale
export const Z_INDEX = {
  base: 'z-0',
  dropdown: 'z-10',
  sticky: 'z-20',
  overlay: 'z-40',
  modal: 'z-50',
  popover: 'z-60',
  toast: 'z-70',
  tooltip: 'z-[100]',
} as const;
