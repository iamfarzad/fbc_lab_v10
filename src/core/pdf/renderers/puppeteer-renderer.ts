import fs from 'fs'
import puppeteer from 'puppeteer'
import type { SummaryData, Mode } from '../utils/types'
import { generateHtmlContent } from '../templates/base-template'

/**
 * Generate PDF using Puppeteer (browser-based rendering)
 */
export async function generatePdfWithPuppeteer(
  summaryData: SummaryData,
  outputPath: string,
  mode: Mode = 'client',
  language: string = 'en'
): Promise<Uint8Array> {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process',
        '--disable-extensions'
      ],
      timeout: 15000
    })

    try {
      const page = await browser.newPage()
      const htmlContent = await generateHtmlContent(summaryData, mode, language)
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 15000 })
      
      // Generate PDF buffer instead of writing to file
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true,
        preferCSSPageSize: true
      })
      
      // Write to file if in development
      if (outputPath && (!process.env.VERCEL && process.env.NODE_ENV !== 'production')) {
        await fs.promises.writeFile(outputPath, pdfBuffer)
      }
      
      return new Uint8Array(pdfBuffer)
    } finally {
      await browser.close()
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Puppeteer failed, falling back to pdf-lib:', errorMessage)
    throw error // Re-throw to let caller handle fallback
  }
}

