/**
 * Generate PDF from Conversation Flow Documentation
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import puppeteer from 'puppeteer'

function markdownToHtml(markdown: string): string {
  // Simple markdown to HTML conversion
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Lists
    .replace(/^\* (.+)$/gim, '<li>$1</li>')
    .replace(/^- (.+)$/gim, '<li>$1</li>')
    // Tables (basic)
    .replace(/\|(.+)\|/g, (match, content) => {
      const cells = content.split('|').map((c: string) => c.trim()).filter(Boolean)
      return '<tr>' + cells.map((cell: string) => `<td>${cell}</td>`).join('') + '</tr>'
    })
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
  
  // Wrap in paragraphs
  html = '<p>' + html + '</p>'
  
  // Wrap lists
  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
  
  return html
}

async function generatePDF() {
  console.log('📄 Reading conversation flow documentation...')
  
  const docPath = join(process.cwd(), 'docs', 'CONVERSATION_FLOW_WORKSHOP_VS_CONSULTING.md')
  const markdown = await readFile(docPath, 'utf-8')
  
  console.log('🔄 Converting markdown to HTML...')
  const htmlContent = await markdownToHtml(markdown)
  
  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Conversation Flow: Workshop vs Consulting</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 {
      color: #2563eb;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
      margin-top: 0;
    }
    h2 {
      color: #1e40af;
      margin-top: 40px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
    }
    h3 {
      color: #3b82f6;
      margin-top: 30px;
    }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 12px;
      text-align: left;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #1e40af;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    blockquote {
      border-left: 4px solid #2563eb;
      padding-left: 20px;
      margin: 20px 0;
      color: #6b7280;
      font-style: italic;
    }
    ul, ol {
      margin: 15px 0;
      padding-left: 30px;
    }
    li {
      margin: 8px 0;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 10px;
    }
    .status.ready {
      background: #d1fae5;
      color: #065f46;
    }
    @media print {
      body {
        padding: 20px;
      }
      h1, h2, h3 {
        page-break-after: avoid;
      }
      table {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <h1>Conversation Flow: Workshop vs Consulting Routing</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  <p><strong>Status:</strong> <span class="status ready">✅ Production-Ready</span></p>
  
  ${htmlContent}
  
  <div style="margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 0.9em;">
    <p><strong>F.B/c AI Consultation System</strong></p>
    <p>This document describes the automated conversation flow routing system.</p>
    <p>For questions or updates, contact the development team.</p>
  </div>
</body>
</html>
  `
  
  console.log('🖨️  Generating PDF with Puppeteer...')
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  })
  
  try {
    const page = await browser.newPage()
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true,
      preferCSSPageSize: true
    })
    
    const outputPath = join(process.cwd(), 'conversation-flow-final.pdf')
    const fs = await import('fs/promises')
    await fs.writeFile(outputPath, pdfBuffer)
    
    console.log(`\n✅ PDF Generated Successfully!`)
    console.log(`📁 Location: ${outputPath}`)
    console.log(`📊 Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`)
    
  } finally {
    await browser.close()
  }
}

generatePDF().catch((error) => {
  console.error('❌ Error generating PDF:', error)
  process.exit(1)
})

