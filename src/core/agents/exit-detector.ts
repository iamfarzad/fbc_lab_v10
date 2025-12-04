/**
 * Exit Intent Detector
 * 
 * Analyzes conversation for exit signals:
 * - BOOKING: User wants to schedule a call
 * - WRAP_UP: User is satisfied and ready to end
 * - FRUSTRATION: User is annoyed/wants to leave
 * - FORCE_EXIT: Multiple exit attempts, must end gracefully
 */

import type { ChatMessage } from './types.js'

export type ExitIntent = 'BOOKING' | 'WRAP_UP' | 'FRUSTRATION' | 'FORCE_EXIT' | null

export interface ExitDetectionResult {
  intent: ExitIntent
  confidence: number
  shouldForceExit: boolean
  reason?: string
  suggestedResponse?: string
}

// Pattern matchers for each intent type
const PATTERNS = {
  booking: [
    // Direct booking language
    /book\s*(a|an)?\s*(call|meeting|appointment|session|demo|time)/i,
    /schedule\s*(a|an)?\s*(call|meeting|appointment|session|demo|time)/i,
    /set\s*up\s*(a|an)?\s*(call|meeting|appointment|session)/i,
    // Availability inquiries
    /when\s*(are|is)\s*(you|farzad|he)\s*available/i,
    /what\s*times?\s*(do you have|work|are available)/i,
    /can\s*(we|i)\s*(meet|talk|chat|connect)/i,
    // Calendar language
    /calendar/i,
    /send\s*(me|over)\s*(your|the)\s*(calendar|availability)/i,
    // Intent phrases
    /let'?s\s*(talk|meet|connect|schedule|chat)/i,
    /i'?d\s*(like|love|want)\s*to\s*(talk|meet|book|schedule)/i,
  ],
  
  wrapUp: [
    // Satisfaction signals
    /thank(s|you)?\s*(for|so much|very much)/i,
    /that'?s\s*(all|everything|great|perfect|what i needed)/i,
    /got\s*(what|everything)\s*(i|we)\s*need/i,
    /sounds\s*good/i,
    /perfect\s*thanks/i,
    // Summary requests
    /can\s*(you|we)\s*summarize/i,
    /give\s*(me|us)\s*a\s*summary/i,
    /wrap\s*(this|it)\s*up/i,
    // Ending signals
    /i('?m|have to)\s*go(ing)?\s*(now)?/i,
    /talk\s*(to you\s*)?(later|soon)/i,
    /have\s*a\s*(good|great|nice)\s*(day|one)/i,
    /bye/i,
    /goodbye/i,
  ],
  
  frustration: [
    // Direct frustration
    /stop/i,
    /enough/i,
    /annoying/i,
    /spam(ming|my)?/i,
    /leave\s*me\s*alone/i,
    /go\s*away/i,
    /shut\s*up/i,
    // Disinterest
    /not\s*interested/i,
    /don'?t\s*care/i,
    /waste\s*(of|my)\s*time/i,
    // Unsubscribe language
    /unsubscribe/i,
    /remove\s*me/i,
    /stop\s*contact(ing)?/i,
    // Strong negative
    /this\s*is\s*(stupid|dumb|useless)/i,
    /i\s*hate\s*this/i,
  ]
}

/**
 * Exit attempt tracker (module-level state)
 */
let exitAttempts = 0
let lastExitAttemptTime = 0
const EXIT_COOLDOWN_MS = 30000 // 30 seconds

/**
 * Reset exit tracker (call when starting new session)
 */
export function resetExitTracker(): void {
  exitAttempts = 0
  lastExitAttemptTime = 0
}

/**
 * Get current exit attempts count
 */
export function getExitAttempts(): number {
  return exitAttempts
}

/**
 * Detect exit intent from messages
 */
export function detectExitIntent(messages: ChatMessage[]): ExitDetectionResult {
  const recentMessages = messages.slice(-5)
  const userMessages = recentMessages.filter(m => m.role === 'user')
  
  if (userMessages.length === 0) {
    return { intent: null, confidence: 0, shouldForceExit: false }
  }
  
  const lastMessage = userMessages[userMessages.length - 1]
  const text = lastMessage.content
  
  // Check booking patterns (highest positive intent)
  for (const pattern of PATTERNS.booking) {
    if (pattern.test(text)) {
      return {
        intent: 'BOOKING',
        confidence: 0.9,
        shouldForceExit: false,
        reason: 'User wants to book a meeting',
        suggestedResponse: 'Great! Let me share our calendar link.'
      }
    }
  }
  
  // Check wrap-up patterns
  for (const pattern of PATTERNS.wrapUp) {
    if (pattern.test(text)) {
      return {
        intent: 'WRAP_UP',
        confidence: 0.8,
        shouldForceExit: false,
        reason: 'User is satisfied and ready to end',
        suggestedResponse: 'Thank you for your time. Here\'s a summary of our conversation.'
      }
    }
  }
  
  // Check frustration patterns
  for (const pattern of PATTERNS.frustration) {
    if (pattern.test(text)) {
      const now = Date.now()
      
      // Track exit attempts with cooldown
      if (now - lastExitAttemptTime > EXIT_COOLDOWN_MS) {
        exitAttempts = 1
      } else {
        exitAttempts++
      }
      lastExitAttemptTime = now
      
      // Force exit after 2+ attempts
      if (exitAttempts >= 2) {
        return {
          intent: 'FORCE_EXIT',
          confidence: 0.95,
          shouldForceExit: true,
          reason: 'Multiple exit attempts detected',
          suggestedResponse: 'I understand. Thank you for your time. Here\'s a summary, and feel free to reach out anytime.'
        }
      }
      
      return {
        intent: 'FRUSTRATION',
        confidence: 0.85,
        shouldForceExit: false,
        reason: 'User is showing signs of frustration',
        suggestedResponse: 'I apologize if I wasn\'t helpful. Would you like me to summarize what we discussed, or is there something specific I can help with?'
      }
    }
  }
  
  return { intent: null, confidence: 0, shouldForceExit: false }
}

/**
 * Check if conversation should be force-ended
 */
export function shouldForceEnd(messages: ChatMessage[]): boolean {
  const result = detectExitIntent(messages)
  return result.shouldForceExit || exitAttempts >= 2
}

/**
 * Get appropriate exit response based on intent
 */
export function getExitResponse(intent: ExitIntent): string {
  switch (intent) {
    case 'BOOKING':
      return 'I\'ll get that set up for you right away.'
    case 'WRAP_UP':
      return 'Here\'s a summary of our conversation. Thank you for your time!'
    case 'FRUSTRATION':
      return 'I understand. Is there anything specific I can clarify before we wrap up?'
    case 'FORCE_EXIT':
      return 'Thank you for your time today. Here\'s a summary of what we discussed. Feel free to reach out whenever you\'re ready to continue.'
    default:
      return ''
  }
}

/**
 * Analyze conversation sentiment trend
 */
export function analyzeSentimentTrend(messages: ChatMessage[]): {
  trend: 'improving' | 'declining' | 'stable'
  averageSentiment: number
} {
  const userMessages = messages.filter(m => m.role === 'user').slice(-10)
  
  if (userMessages.length < 3) {
    return { trend: 'stable', averageSentiment: 0.5 }
  }
  
  // Simple sentiment scoring based on keywords
  const scores = userMessages.map(msg => {
    const text = msg.content.toLowerCase()
    let score = 0.5 // neutral
    
    // Positive signals
    if (/thanks|great|perfect|awesome|love|excellent|amazing|helpful/i.test(text)) score += 0.2
    if (/interested|want|need|looking for/i.test(text)) score += 0.1
    
    // Negative signals
    if (/not interested|no thanks|stop|annoying/i.test(text)) score -= 0.3
    if (/don't|can't|won't|shouldn't/i.test(text)) score -= 0.1
    
    return Math.max(0, Math.min(1, score))
  })
  
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  
  // Check trend from first half to second half
  const midpoint = Math.floor(scores.length / 2)
  const firstHalf = scores.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint
  const secondHalf = scores.slice(midpoint).reduce((a, b) => a + b, 0) / (scores.length - midpoint)
  
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  if (secondHalf - firstHalf > 0.15) trend = 'improving'
  else if (firstHalf - secondHalf > 0.15) trend = 'declining'
  
  return { trend, averageSentiment: avg }
}

