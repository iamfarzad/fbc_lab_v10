import { analyzeUrl } from '../intelligence/url-context-tool.js'
import type { IntelligenceContext } from '../agents/types.js'

/**
 * Detect URLs in message content and analyze them
 * Returns formatted context string for inclusion in system instructions or messages
 */
export async function detectAndAnalyzeUrls(
  messageContent: string,
  _intelligenceContext?: IntelligenceContext
): Promise<string> {
  // Type guard: ensure messageContent is a string
  if (typeof messageContent !== 'string') {
    return ''
  }
  
  // Detect URLs using regex
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const urls = messageContent.match(urlRegex) || []
  
  if (urls.length === 0) return ''
  
  // Analyze each URL
  const analyses = await Promise.all(
    urls.map(async (url) => {
      try {
        const analysis = await analyzeUrl(url)
        return {
          url,
          analysis
        }
      } catch (err) {
        console.warn('URL analysis failed for', url, err)
        return null
      }
    })
  )
  
  // Format as context string
  const formattedAnalyses = analyses
    .filter((item): item is { url: string; analysis: Awaited<ReturnType<typeof analyzeUrl>> } => item !== null)
    .map((item, i) => {
      const { url, analysis } = item
      return `URL ${i + 1} (${url}):
- Summary: ${analysis.pageSummary}
- Key initiatives: ${analysis.keyInitiatives.join(', ')}
- Tech stack hints: ${analysis.techStackHints?.join(', ') || 'none detected'}
- Hiring: ${analysis.hiringSignals?.join(', ') || 'none'}
- Pain points mentioned: ${analysis.painPointsMentioned?.join(', ') || 'none'}`
    })
  
  if (formattedAnalyses.length === 0) {
    return ''
  }
  
  return formattedAnalyses.join('\n\n')
}
