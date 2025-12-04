import { generatePdfWithPuppeteer as generatePdfWithPuppeteerRenderer } from './renderers/puppeteer-renderer.js'
import { generatePdfWithPdfLib } from './renderers/pdf-lib-renderer.js'
import { generatePdfPath } from './utils/paths.js'
import { buildConversationPairs } from './utils/conversation.js'
import { extractConversationInsights } from './utils/insights.js'
import { generateApproveMailtoLink } from './templates/proposal-template.js'
import type { SummaryData, Mode, ConversationPair } from './utils/types.js'

/**
 * Main PDF generation function - orchestrates renderer selection
 */
export async function generatePdfWithPuppeteer(
  summaryData: SummaryData,
  outputPath: string,
  mode: Mode = 'client',
  language: string = 'en'
): Promise<Uint8Array> {
  const usePdfLib = process.env.PDF_USE_PDFLIB === 'true'

  if (!usePdfLib) {
    try {
      return await generatePdfWithPuppeteerRenderer(summaryData, outputPath, mode, language)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Puppeteer failed, falling back to pdf-lib:', errorMessage)
      // Fall through to pdf-lib
    }
  }

  return await generatePdfWithPdfLib(summaryData, outputPath)
}

// Re-export for backward compatibility
export { generatePdfPath, buildConversationPairs, extractConversationInsights, generateApproveMailtoLink }
export type { SummaryData, Mode, ConversationPair }

