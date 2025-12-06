/**
 * Simple PDF Generation - Uses system's default PDF tool
 * Creates HTML file that can be printed to PDF
 */

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

async function generatePDF() {
  console.log('📄 Reading conversation flow documentation...')
  
  const docPath = join(process.cwd(), 'docs', 'CONVERSATION_FLOW_WORKSHOP_VS_CONSULTING.md')
  const markdown = await readFile(docPath, 'utf-8')
  
  console.log('🔄 Converting to HTML...')
  
  // Simple markdown conversion
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
    // Horizontal rules
    .replace(/^---$/gim, '<hr>')
    // Lists
    .replace(/^\d+\. (.+)$/gim, '<li>$1</li>')
    .replace(/^\* (.+)$/gim, '<li>$1</li>')
    .replace(/^- (.+)$/gim, '<li>$1</li>')
    // Tables
    .replace(/\|(.+)\|/g, (match, content) => {
      const cells = content.split('|').map((c: string) => c.trim()).filter(Boolean)
      const isHeader = match.includes('---')
      if (isHeader) return ''
      return '<tr>' + cells.map((cell: string) => `<td>${cell}</td>`).join('') + '</tr>'
    })
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
  
  // Wrap in paragraphs
  html = '<p>' + html + '</p>'
  
  // Wrap consecutive list items
  html = html.replace(/(<li>.*?<\/li>(?:\s*<br>\s*<li>.*?<\/li>)*)/g, '<ul>$1</ul>')
  
  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Conversation Flow: Workshop vs Consulting</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
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
      page-break-after: avoid;
    }
    h2 {
      color: #1e40af;
      margin-top: 40px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
      page-break-after: avoid;
    }
    h3 {
      color: #3b82f6;
      margin-top: 30px;
      page-break-after: avoid;
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
      page-break-inside: avoid;
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
      page-break-inside: avoid;
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
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 30px 0;
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
      table, pre {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <h1>Conversation Flow: Workshop vs Consulting Routing</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  <p><strong>Status:</strong> <span class="status">✅ Production-Ready</span></p>
  
  ${html}
  
  <div style="margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 0.9em;">
    <p><strong>F.B/c AI Consultation System</strong></p>
    <p>This document describes the automated conversation flow routing system.</p>
    <p>For questions or updates, contact the development team.</p>
  </div>
</body>
</html>
  `
  
  const outputPath = join(process.cwd(), 'conversation-flow-final.html')
  await writeFile(outputPath, fullHtml)
  
  console.log(`\n✅ HTML Generated Successfully!`)
  console.log(`📁 Location: ${outputPath}`)
  console.log(`\n💡 To convert to PDF:`)
  console.log(`   1. Open ${outputPath} in your browser`)
  console.log(`   2. Press Cmd+P (Mac) or Ctrl+P (Windows/Linux)`)
  console.log(`   3. Select "Save as PDF"`)
  console.log(`   4. Save as "conversation-flow-final.pdf"`)
  
  // Also try to use system print-to-PDF if available
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    // Try using macOS's built-in print command
    if (process.platform === 'darwin') {
      console.log(`\n🖨️  Attempting to generate PDF using system tools...`)
      const pdfPath = join(process.cwd(), 'conversation-flow-final.pdf')
      await execAsync(`cupsfilter "${outputPath}" > "${pdfPath}" 2>/dev/null || echo "PDF generation skipped - use browser print instead"`)
      console.log(`✅ PDF may have been generated at: ${pdfPath}`)
    }
  } catch (err) {
    // Ignore errors - browser print is the fallback
  }
}

generatePDF().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})

