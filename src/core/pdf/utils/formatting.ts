/**
 * Remove emojis from text to prevent rendering issues and maintain professional style
 * Uses ranges compatible with standard regex (no unicode property escapes or \u{...} without flag)
 */
export function stripEmojis(text: string): string {
  // Matches common emoji ranges using surrogate pairs for compatibility
  // roughly: high surrogates D800-DBFF, low surrogates DC00-DFFF
  // plus some standard symbols
  return text
    .replace(/(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g, '')
}

/**
 * Sanitize text for PDF rendering (remove markdown, emojis, normalize whitespace)
 */
export function sanitizeTextForPdf(text: string): string {
  const noEmojis = stripEmojis(text)
  return noEmojis
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

