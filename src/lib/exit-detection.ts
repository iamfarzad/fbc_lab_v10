const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const bookingKeywords = [
  'book',
  'schedule',
  'meeting',
  'call',
  'consultation',
  'strategy call',
  'calendar',
  'cal.com',
  'calendly'
] as const

const keywordPatterns = bookingKeywords.map(
  keyword => new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i')
)

const bookingPatterns: RegExp[] = [
  /let'?s (just )?book/i,
  /schedule (a|the) (call|meeting|workshop)/i,
  /set up (a|the) (call|meeting)/i,
  /book (a|the) (call|meeting|workshop)/i,
  /calendar/i,
  /when can we/i,
  ...keywordPatterns
]

const wrapUpPatterns: RegExp[] = [
  /let'?s wrap/i,
  /move on/i,
  /that'?s enough/i,
  /wrap it up(?!.*(talk|speak|call|meeting))/i,
  /move forward/i
]

const frustrationPatterns: RegExp[] = [
  /stop asking/i,
  /i don'?t want to answer/i,
  /for fuck'?s sake/i,
  /this is ridiculous/i,
  /enough already/i
]

const minimalResponsePatterns: RegExp[] = [
  /^(nothing|nope|no|not sure|i don'?t know)$/i,
  /^.{1,4}$/
]

export const BOOKING_KEYWORDS = Object.freeze([...bookingKeywords])
export const BOOKING_PATTERNS = Object.freeze(bookingPatterns)
export const WRAP_UP_PATTERNS = Object.freeze(wrapUpPatterns)
export const FRUSTRATION_PATTERNS = Object.freeze(frustrationPatterns)
export const MINIMAL_RESPONSE_PATTERNS = Object.freeze(minimalResponsePatterns)

export type ExitIntent =
  | 'BOOKING'
  | 'WRAP_UP'
  | 'FRUSTRATION'
  | 'MINIMAL'
  | 'CONTINUE'

export function detectExitIntent(content: string | null | undefined): ExitIntent {
  if (!content) return 'CONTINUE'

  const normalized = content.toLowerCase().trim()

  if (BOOKING_PATTERNS.some(pattern => pattern.test(normalized))) {
    return 'BOOKING'
  }

  if (WRAP_UP_PATTERNS.some(pattern => pattern.test(normalized))) {
    return 'WRAP_UP'
  }

  if (FRUSTRATION_PATTERNS.some(pattern => pattern.test(normalized))) {
    return 'FRUSTRATION'
  }

  if (MINIMAL_RESPONSE_PATTERNS.some(pattern => pattern.test(normalized))) {
    return 'MINIMAL'
  }

  return 'CONTINUE'
}

