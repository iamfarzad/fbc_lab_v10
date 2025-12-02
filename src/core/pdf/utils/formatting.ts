/**
 * Sanitize text for PDF rendering (remove markdown, normalize whitespace)
 */
export function sanitizeTextForPdf(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Format date for PDF display
 */
export function formatDate(dateString?: string): string {
  if (!dateString) {
    const now = new Date()
    return now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }
}

/**
 * Convert value to printable string for PDF
 */
export function toPrintable(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return sanitizeTextForPdf(value)
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return sanitizeTextForPdf(JSON.stringify(value, null, 2))
  } catch {
    return '[unserializable payload]'
  }
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Shorten text to specified number of sentences
 */
export function shortenText(text: string, sentenceLimit = 2): string {
  if (!text) return ''
  const sanitized = text.replace(/\s+/g, ' ').trim()
  const sentenceEnd = /[.!?] +/g
  const sentences: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = sentenceEnd.exec(sanitized)) !== null && sentences.length < sentenceLimit - 1) {
    sentences.push(sanitized.slice(lastIndex, match.index + 1).trim())
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < sanitized.length && sentences.length < sentenceLimit) {
    sentences.push(sanitized.slice(lastIndex).trim())
  }

  return sentences.join(' ')
}

