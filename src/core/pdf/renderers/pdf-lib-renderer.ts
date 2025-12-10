import fs from 'fs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { PDF_DESIGN_TOKENS, getRgbColor } from '../../pdf-design-tokens.js'
import { CONTACT_CONFIG } from '../../../config/constants.js'
import { FALLBACK_PRICING } from '../utils/constants.js'
import { formatDate, shortenText, toPrintable, sanitizeTextForPdf } from '../utils/formatting.js'
import { generateApproveMailtoLink } from '../templates/proposal-template.js'
import { generateROIChartsImages, isValidROIData } from './chart-renderer.js'
import { buildConversationPairs } from '../utils/conversation.js'
import { extractConversationInsights } from '../utils/insights.js'
import type { SummaryData } from '../utils/types.js'

/**
 * Lightweight text helper until the Gemini translator is migrated.
 */
function translateText(text: string) {
  return sanitizeTextForPdf(text)
}

/**
 * Generate PDF using pdf-lib (programmatic rendering)
 */
export async function generatePdfWithPdfLib(
  summaryData: SummaryData,
  outputPath: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  let page = pdfDoc.addPage([595.28, 841.89])
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  // Use design tokens for spacing and colors
  const marginX = PDF_DESIGN_TOKENS.spacing.pageMargin.pt // 72pt = 1in
  const lineHeight = PDF_DESIGN_TOKENS.typography.body.size // ~10.5pt
  let cursorY = 750 // Start position
  
  // Colors from design tokens
  const [accentR, accentG, accentB] = getRgbColor('accent')
  const orangeColor = rgb(accentR, accentG, accentB)
  
  const [foregroundR, foregroundG, foregroundB] = getRgbColor('foreground')
  const darkColor = rgb(foregroundR, foregroundG, foregroundB)
  
  const [mutedR, mutedG, mutedB] = getRgbColor('mutedForeground')
  const grayColor = rgb(mutedR, mutedG, mutedB)
  
  const [textR, textG, textB] = getRgbColor('text')
  const textColor = rgb(textR, textG, textB)
  
  const [lightGrayR, lightGrayG, lightGrayB] = getRgbColor('lightGray')
  const lightGrayColor = rgb(lightGrayR, lightGrayG, lightGrayB)

  const ensureRoom = () => {
    if (cursorY < 100) {
      page = pdfDoc.addPage([595.28, 841.89])
      cursorY = 720
    }
  }

  const writeLine = (text: string, size = PDF_DESIGN_TOKENS.typography.body.size, bold = false, isOrange = false, x?: number) => {
    const color = isOrange ? orangeColor : darkColor
    
    page.drawText(text, {
      x: x ?? marginX,
      y: cursorY,
      size,
      font: bold ? boldFont : regularFont,
      color: color
    })
    cursorY -= lineHeight * 1.6 // Use design token line height multiplier
    ensureRoom()
  }

  // Header: Logo left, date right
  const logoSize = PDF_DESIGN_TOKENS.typography.logo.size
  page.drawText('F.B/', {
    x: marginX,
    y: 800,
    size: logoSize,
    font: boldFont,
    color: orangeColor
  })
  const fbWidth = boldFont.widthOfTextAtSize('F.B/', logoSize)
  page.drawText('c', {
    x: marginX + fbWidth,
    y: 800,
    size: logoSize,
    font: boldFont,
    color: orangeColor
  })
  
  const dateText = formatDate()
  const dateSize = PDF_DESIGN_TOKENS.typography.body.size
  const dateWidth = regularFont.widthOfTextAtSize(dateText, dateSize)
  page.drawText(dateText, {
    x: 595.28 - marginX - dateWidth,
    y: 800,
    size: dateSize,
    font: regularFont,
    color: grayColor
  })
  
  // Draw border line under header
  page.drawLine({
    start: { x: marginX, y: 775 },
    end: { x: 595.28 - marginX, y: 775 },
    thickness: PDF_DESIGN_TOKENS.border.headerThickness,
    color: orangeColor
  })
  
  cursorY = 740

  // Title Section (centered) - using design tokens
  const titleText = 'AI Consulting Assessment'
  const titleSize = PDF_DESIGN_TOKENS.typography.title.size
  const titleWidth = regularFont.widthOfTextAtSize(titleText, titleSize)
  page.drawText(titleText, {
    x: (595.28 - titleWidth) / 2,
    y: cursorY,
    size: titleSize,
    font: regularFont,
    color: darkColor
  })
  cursorY -= PDF_DESIGN_TOKENS.spacing.xl.pt // 24pt spacing

  const clientName = summaryData.leadInfo.company || summaryData.leadInfo.name || 'Valued Client'
  const clientNameSize = PDF_DESIGN_TOKENS.typography.clientName.size
  const clientNameWidth = boldFont.widthOfTextAtSize(clientName, clientNameSize)
  page.drawText(clientName, {
    x: (595.28 - clientNameWidth) / 2,
    y: cursorY,
    size: clientNameSize,
    font: boldFont,
    color: orangeColor
  })
  cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt // 18pt spacing

  const preparedByText = 'Prepared by Farzad Bayat'
  const preparedBySize = PDF_DESIGN_TOKENS.typography.body.size
  const preparedByWidth = regularFont.widthOfTextAtSize(preparedByText, preparedBySize)
  page.drawText(preparedByText, {
    x: (595.28 - preparedByWidth) / 2,
    y: cursorY,
    size: preparedBySize,
    font: regularFont,
    color: grayColor
  })
  cursorY -= PDF_DESIGN_TOKENS.spacing.xxl.pt // 36pt spacing

  // Executive Summary
  if (summaryData.leadResearch?.conversation_summary) {
    const sectionTitleSize = PDF_DESIGN_TOKENS.typography.sectionTitle.size
    writeLine('EXECUTIVE SUMMARY', sectionTitleSize, true, true)
    cursorY -= 5
    writeParagraph(summaryData.leadResearch.conversation_summary, PDF_DESIGN_TOKENS.typography.body.size)
    cursorY -= PDF_DESIGN_TOKENS.spacing.sectionMargin.pt / 2
  }

  // Lead Information with fixed grid layout
  const sectionTitleSize = PDF_DESIGN_TOKENS.typography.sectionTitle.size
  writeLine('LEAD INFORMATION', sectionTitleSize, true, true)
  cursorY -= 5
  
  // Fixed grid layout - labels and values on same line
  const gridLabelStartX = marginX
  const gridValueStartX = marginX + 100 // Fixed offset for values
  const bodySize = PDF_DESIGN_TOKENS.typography.body.size
  let gridY = cursorY
  
  // Name
  const nameLabel = 'Name:'
  page.drawText(nameLabel, {
    x: gridLabelStartX,
    y: gridY,
    size: bodySize,
    font: boldFont,
    color: darkColor
  })
  const nameText = summaryData.leadInfo.name || 'Unknown'
  page.drawText(nameText, {
    x: gridValueStartX,
    y: gridY,
    size: bodySize,
    font: regularFont,
    color: grayColor
  })
  gridY -= 22
  
  // Company
  if (summaryData.leadInfo.company) {
    const companyLabel = 'Company:'
    page.drawText(companyLabel, {
      x: gridLabelStartX,
      y: gridY,
      size: bodySize,
      font: boldFont,
      color: darkColor
    })
    page.drawText(summaryData.leadInfo.company, {
      x: gridValueStartX,
      y: gridY,
      size: bodySize,
      font: regularFont,
      color: grayColor
    })
    gridY -= 22
  }
  
  // Role
  if (summaryData.leadInfo.role) {
    const roleLabel = 'Role:'
    page.drawText(roleLabel, {
      x: gridLabelStartX,
      y: gridY,
      size: bodySize,
      font: boldFont,
      color: darkColor
    })
    page.drawText(summaryData.leadInfo.role, {
      x: gridValueStartX,
      y: gridY,
      size: bodySize,
      font: regularFont,
      color: grayColor
    })
    gridY -= 22
  }
  
  // Date
  const dateLabel = 'Date:'
  page.drawText(dateLabel, {
    x: gridLabelStartX,
    y: gridY,
    size: bodySize,
    font: boldFont,
    color: darkColor
  })
  page.drawText(formatDate(), {
    x: gridValueStartX,
    y: gridY,
    size: bodySize,
    font: regularFont,
    color: grayColor
  })
  
  cursorY = gridY - PDF_DESIGN_TOKENS.spacing.lg.pt

  // Consultant Brief
  if (summaryData.leadResearch?.consultant_brief) {
    writeLine('CONSULTANT BRIEF', sectionTitleSize, true, true)
    cursorY -= 5
    writeParagraph(summaryData.leadResearch.consultant_brief, bodySize)
    cursorY -= PDF_DESIGN_TOKENS.spacing.sectionMargin.pt / 2
  }
  
  // AI Capabilities
  const extractAICapabilities = (): string[] => {
    const capabilities: string[] = []
    if (summaryData.leadResearch?.ai_capabilities_shown) {
      const caps = summaryData.leadResearch.ai_capabilities_shown.split(',').map(c => c.trim())
      capabilities.push(...caps)
    }
    if (capabilities.length === 0) {
      capabilities.push('AI consultation', 'Strategy development', 'Implementation planning')
    }
    return [...new Set(capabilities)].slice(0, 8)
  }
  
  const aiCapabilities = extractAICapabilities()
  if (aiCapabilities.length > 0) {
    writeLine('AI CAPABILITIES IDENTIFIED', sectionTitleSize, true, true)
    cursorY -= 5
    for (const cap of aiCapabilities) {
      // Draw bullet point
      page.drawText('•', {
        x: marginX,
        y: cursorY,
        size: bodySize,
        font: boldFont,
        color: orangeColor
      })
      page.drawText(cap, {
        x: marginX + 18,
        y: cursorY,
        size: bodySize,
        font: regularFont,
        color: textColor
      })
      cursorY -= 20
      ensureRoom()
    }
    cursorY -= 10
  }

  // Multimodal Context Section (simplified for pdf-lib)
  if (summaryData.multimodalContext) {
    const mc = summaryData.multimodalContext
    
    if (mc.summary.modalitiesUsed.length > 0) {
      writeLine('MULTIMODAL INTERACTIONS', sectionTitleSize, true, true)
      writeParagraph(`Modalities Used: ${mc.summary.modalitiesUsed.join(', ')}`, bodySize)
      writeParagraph(`Total Messages: ${mc.summary.totalMessages}`, bodySize)
      cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt / 2
    }

    // Voice Transcripts Summary
    if (mc.voiceTranscripts.length > 0) {
      writeLine('Voice Conversation Excerpts', bodySize, true)
      const userTranscripts = mc.voiceTranscripts
        .filter(t => t.type === 'voice_input' && t.data.transcript && t.data.isFinal)
        .slice(-5) // Last 5 user voice inputs
      
      for (const transcript of userTranscripts) {
        if (transcript.data.transcript) {
          writeLine(`[Voice] ${new Date(transcript.timestamp).toLocaleTimeString()}`, PDF_DESIGN_TOKENS.typography.small.size)
          writeParagraph(shortenText(transcript.data.transcript, 200), bodySize)
          cursorY -= 2
        }
      }
      cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt / 2
    }

    // Visual Analyses Summary
    if (mc.visualAnalyses.length > 0) {
      writeLine('Visual Context Analyzed', bodySize, true)
      const grouped = mc.visualAnalyses.reduce((acc, v) => {
        acc[v.type] = (acc[v.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      Object.entries(grouped).forEach(([type, count]) => {
        writeLine(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${count} captures`, bodySize)
      })
      
      // Show sample analyses
      const recent = mc.visualAnalyses.slice(-3)
      for (const analysis of recent) {
        writeLine(`[${analysis.type}] ${new Date(analysis.timestamp).toLocaleTimeString()}`, PDF_DESIGN_TOKENS.typography.small.size)
        writeParagraph(shortenText(analysis.analysis, 150), bodySize)
        cursorY -= 2
      }
      cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt / 2
    }

    // Uploaded Files
    if (mc.uploadedFiles.length > 0) {
      writeLine('Documents Shared', bodySize, true)
      for (const file of mc.uploadedFiles) {
        const sizeKB = Math.round(file.size / 1024)
        const pageInfo = file.pages ? ` (${file.pages} pages)` : ''
        writeLine(`${file.filename} - ${sizeKB}KB${pageInfo}`, PDF_DESIGN_TOKENS.typography.small.size)
        if (file.analysis) {
          writeParagraph(shortenText(file.analysis, 100), bodySize)
        }
        cursorY -= 2
      }
      cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt / 2
    }
  }

  const conversationPairs = buildConversationPairs(summaryData.conversationHistory)
  const insights = extractConversationInsights(conversationPairs)
  
  const hasInsights = insights.recommendations.length > 0 || 
                     insights.nextSteps.length > 0 || 
                     insights.keyDecisions.length > 0 ||
                     insights.importantPoints.length > 0

  if (hasInsights) {
    writeLine('KEY OUTCOMES & NEXT STEPS', sectionTitleSize, true, true)
    cursorY -= 5

    // Recommendations
    if (insights.recommendations.length > 0) {
      writeLine('Recommendations:', bodySize, true)
      for (const rec of insights.recommendations.slice(0, 4)) {
        page.drawText('•', {
          x: marginX,
          y: cursorY,
          size: bodySize,
          font: boldFont,
          color: orangeColor
        })
        writeParagraph(shortenText(rec, 4), bodySize)
        cursorY -= 5
      }
      cursorY -= 10
    }

    // Next Steps
    if (insights.nextSteps.length > 0) {
      writeLine('Next Steps:', bodySize, true)
      for (const step of insights.nextSteps.slice(0, 4)) {
        page.drawText('•', {
          x: marginX,
          y: cursorY,
          size: bodySize,
          font: boldFont,
          color: orangeColor
        })
        writeParagraph(shortenText(step, 4), bodySize)
        cursorY -= 5
      }
      cursorY -= 10
    }

    // Key Decisions
    if (insights.keyDecisions.length > 0) {
      writeLine('Key Decisions:', bodySize, true)
      for (const decision of insights.keyDecisions.slice(0, 3)) {
        page.drawText('•', {
          x: marginX,
          y: cursorY,
          size: bodySize,
          font: boldFont,
          color: orangeColor
        })
        writeParagraph(shortenText(decision, 4), bodySize)
        cursorY -= 5
      }
      cursorY -= 10
    }

    // Important Points
    if (insights.importantPoints.length > 0) {
      writeLine('Important Points Discussed:', bodySize, true)
      for (const point of insights.importantPoints.slice(0, 3)) {
        page.drawText('•', {
          x: marginX,
          y: cursorY,
          size: bodySize,
          font: boldFont,
          color: orangeColor
        })
        writeParagraph(shortenText(point, 4), bodySize)
        cursorY -= 5
      }
      cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt / 2
    }
  }

  if (summaryData.researchHighlights && summaryData.researchHighlights.length > 0) {
    writeLine('RESEARCH HIGHLIGHTS', sectionTitleSize, true, true)
    for (const [index, highlight] of summaryData.researchHighlights.entries()) {
      const label = highlight.query ? `Query: ${highlight.query}` : `Insight ${index + 1}`
      writeLine(label, bodySize, true)
      if (highlight.combinedAnswer) {
        writeParagraph(highlight.combinedAnswer, bodySize)
      }
      if (highlight.urlsUsed && highlight.urlsUsed.length > 0) {
        writeLine('Sources:', bodySize, true)
        for (const url of highlight.urlsUsed) {
          writeLine(`• ${url}`, bodySize)
        }
      }
      const metrics: string[] = []
      if (typeof highlight.citationCount === 'number') {
        metrics.push(`Citations: ${highlight.citationCount}`)
      }
      if (typeof highlight.searchGroundingUsed === 'number') {
        metrics.push(`Search Grounding: ${highlight.searchGroundingUsed}`)
      }
      if (typeof highlight.urlContextUsed === 'number') {
        metrics.push(`URL Context: ${highlight.urlContextUsed}`)
      }
      if (metrics.length > 0) {
        writeLine(metrics.join(' • '), bodySize)
      }
      if (highlight.error) {
        writeLine(`Note: ${highlight.error}`, bodySize)
      }
      cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt / 2
    }
  }

  if (summaryData.artifactInsights && summaryData.artifactInsights.length > 0) {
    writeLine('GENERATED ARTIFACTS', sectionTitleSize, true, true)
    for (const artifact of summaryData.artifactInsights) {
      const heading = `${artifact.type || 'Artifact'} ${artifact.status ? `(${artifact.status})` : ''}`.trim()
      writeLine(heading, bodySize, true)
      if (artifact.error) {
        writeLine(`Error: ${artifact.error}`, bodySize)
      }
      if (artifact.payload) {
        const preview = toPrintable(artifact.payload)
        if (preview) {
          writeParagraph(preview.length > 2000 ? `${preview.slice(0, 2000)}…` : preview, bodySize)
        }
      }
      cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt / 2
    }
  }

  // ROI Charts Section (for Cost-Benefit Analysis artifacts)
  const roiArtifact = summaryData.artifactInsights?.find(
    a => a.type === 'Cost-Benefit Analysis' && a.payload && isValidROIData(a.payload)
  )

  if (roiArtifact && isValidROIData(roiArtifact.payload!)) {
    try {
      writeLine('ROI ANALYSIS', sectionTitleSize, true, true)
      cursorY -= 10
      ensureRoom()

      const charts = await generateROIChartsImages(roiArtifact.payload)

      // Embed investment chart (left side)
      const investmentImage = await pdfDoc.embedPng(charts.investmentChart)
      const invScale = 0.35
      const invWidth = investmentImage.width * invScale
      const invHeight = investmentImage.height * invScale
      page.drawImage(investmentImage, {
        x: marginX,
        y: cursorY - invHeight,
        width: invWidth,
        height: invHeight
      })

      // Embed savings chart (right side)
      const savingsImage = await pdfDoc.embedPng(charts.savingsChart)
      const savScale = 0.35
      const savWidth = savingsImage.width * savScale
      const savHeight = savingsImage.height * savScale
      page.drawImage(savingsImage, {
        x: 595.28 - marginX - savWidth,
        y: cursorY - savHeight,
        width: savWidth,
        height: savHeight
      })

      cursorY -= Math.max(invHeight, savHeight) + 15
      ensureRoom()

      // Embed ROI comparison bar chart (full width)
      const roiImage = await pdfDoc.embedPng(charts.roiChart)
      const roiScale = 0.4
      const roiWidth = roiImage.width * roiScale
      const roiHeight = roiImage.height * roiScale
      page.drawImage(roiImage, {
        x: marginX,
        y: cursorY - roiHeight,
        width: roiWidth,
        height: roiHeight
      })

      cursorY -= roiHeight + 15
      ensureRoom()

      // Add ROI summary text
      const roiPayload = roiArtifact.payload
      const investmentTotal = roiPayload.investment.initial + roiPayload.investment.annual
      const savingsTotal = Object.values(roiPayload.savings).reduce((a, b) => a + b, 0)
      const roiPercentage = ((roiPayload.roi.firstYear - investmentTotal) / investmentTotal * 100).toFixed(1)

      writeLine(`Total Investment: $${investmentTotal.toLocaleString()}`, bodySize)
      writeLine(`Total Savings (Year 1): $${savingsTotal.toLocaleString()}`, bodySize)
      writeLine(`Net ROI (Year 1): $${roiPayload.roi.firstYear.toLocaleString()}`, bodySize)
      writeLine(`ROI Percentage: ${roiPercentage}%`, bodySize)
      writeLine(`Payback Period: ${roiPayload.roi.paybackPeriod}`, bodySize)

      cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt / 2
    } catch (error) {
      console.error('Failed to generate ROI charts:', error)
      // Fallback to text display
      writeLine('ROI ANALYSIS', sectionTitleSize, true, true)
      if (roiArtifact.payload) {
        const preview = toPrintable(roiArtifact.payload)
        if (preview) {
          writeParagraph(preview.length > 2000 ? `${preview.slice(0, 2000)}…` : preview, bodySize)
        }
      }
      cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt / 2
    }
  }

  // Artifacts Section (High-Value Artifacts)
  const artifacts = summaryData.artifacts

  // Cost of Inaction (warning box)
  if (artifacts?.costOfInaction) {
    cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt
    ensureRoom()
    
    const coi = artifacts.costOfInaction
    const boxHeight = 80
    const boxStartY = cursorY
    
    // Warning box background (light red)
    page.drawRectangle({
      x: marginX,
      y: cursorY - boxHeight,
      width: 595.28 - marginX * 2,
      height: boxHeight,
      borderColor: rgb(0.86, 0.15, 0.15), // Red border
      borderWidth: 2,
      color: rgb(1, 0.96, 0.96) // Light red background
    })
    
    cursorY -= 8
    writeLine('⚠️ Operational Waste Detected', bodySize + 1, true, false, marginX + 8)
    cursorY -= 12
    
    const wasteText = `Based on our analysis of ${coi.inefficiencySource}, your current process is costing you:`
    writeParagraph(wasteText, bodySize - 1)
    cursorY -= 8
    
    // Big number for annual waste
    const wasteAmount = `$${coi.annualWaste.toLocaleString()} / Year`
    page.drawText(wasteAmount, {
      x: marginX + 8,
      y: cursorY,
      size: bodySize + 4,
      font: boldFont,
      color: rgb(0.86, 0.15, 0.15) // Red
    })
    cursorY -= 20
    
    const paybackText = 'This waste covers the cost of the workshop in < 3 months.'
    writeLine(paybackText, bodySize - 2, false, false, marginX + 8)
    
    cursorY = boxStartY - boxHeight - 15
    ensureRoom()
  }

  // Executive Memo (new page)
  if (artifacts?.executiveMemo) {
    // Add new page for memo
    page = pdfDoc.addPage([595.28, 841.89])
    cursorY = 750
    
    const memo = artifacts.executiveMemo
    
    // CONFIDENTIAL watermark (rotated) - pdf-lib doesn't support rotation, use opacity instead
    page.drawText('CONFIDENTIAL', {
      x: 400,
      y: 600,
      size: 60,
      font: regularFont,
      color: rgb(0.8, 0.8, 0.8),
      opacity: 0.3
    })
    
    writeLine('EXECUTIVE BRIEFING', sectionTitleSize, true, true)
    cursorY -= 10
    
    // Memo content (preserve line breaks)
    const memoLines = memo.content.split('\n')
    for (const line of memoLines) {
      if (line.trim()) {
        writeLine(line.trim(), bodySize, false, false, marginX)
        cursorY -= 4
      } else {
        cursorY -= 8
      }
      ensureRoom()
    }
    
    cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt
    ensureRoom()
  }

  // Custom Syllabus
  if (artifacts?.customSyllabus) {
    cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt
    ensureRoom()
    
    const syllabus = artifacts.customSyllabus
    writeLine(syllabus.title.toUpperCase(), sectionTitleSize, true, true)
    cursorY -= 10
    
    for (const module of syllabus.modules) {
      writeLine(module.title, bodySize + 1, true, false, marginX)
      cursorY -= 8
      
      for (const topic of module.topics) {
        page.drawText('•', {
          x: marginX,
          y: cursorY,
          size: bodySize,
          font: boldFont,
          color: orangeColor
        })
        writeLine(topic, bodySize, false, false, marginX + 18)
        cursorY -= 4
      }
      
      cursorY -= 8
      ensureRoom()
    }
  }

  // Competitor Gap
  if (artifacts?.competitorGap) {
    cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt
    ensureRoom()
    
    const gap = artifacts.competitorGap
    writeLine('COMPETITIVE GAP ANALYSIS', sectionTitleSize, true, true)
    cursorY -= 10
    
    writeLine(`Your Current State: ${gap.clientState}`, bodySize, false, false, marginX)
    cursorY -= 12
    
    writeLine(`Competitors: ${gap.competitors.join(', ')}`, bodySize, false, false, marginX)
    cursorY -= 12
    
    // Gap analysis box
    const gapBoxHeight = 60
    page.drawRectangle({
      x: marginX,
      y: cursorY - gapBoxHeight,
      width: 595.28 - marginX * 2,
      height: gapBoxHeight,
      borderColor: orangeColor,
      borderWidth: 1,
      color: rgb(0.98, 0.98, 0.99) // Light gray
    })
    
    cursorY -= 8
    writeLine('Gap Analysis:', bodySize, true, false, marginX + 8)
    cursorY -= 8
    writeParagraph(gap.gapAnalysis, bodySize - 1)
    
    cursorY -= gapBoxHeight - 40
    ensureRoom()
  }

  // Proposal Section
  const proposal = summaryData.proposal
  cursorY -= PDF_DESIGN_TOKENS.spacing.lg.pt
  ensureRoom()

  writeLine('PROPOSAL & NEXT STEPS', sectionTitleSize, true, true)
  cursorY -= 10
  ensureRoom()
  
  if (proposal?.recommendedSolution) {
    const approveLink = generateApproveMailtoLink(proposal, summaryData.leadInfo)
    const bookingUrl = CONTACT_CONFIG.SCHEDULING.BOOKING_URL
    // Show recommendation
    const solutionType = proposal.recommendedSolution === 'workshop' ? 'AI Strategy Workshop' : 'Custom AI Implementation'
    const pricing = proposal.pricingBallpark || FALLBACK_PRICING[proposal.recommendedSolution as keyof typeof FALLBACK_PRICING]
    const solutionRationale = proposal.solutionRationale || `Based on our discovery conversation, a ${proposal.recommendedSolution === 'workshop' ? 'workshop' : 'consulting engagement'} aligns best with your needs.`
    
    // Recommendation card background
    const cardStartY = cursorY
    const cardHeight = 110
    page.drawRectangle({
      x: marginX,
      y: cursorY - cardHeight,
      width: 595.28 - marginX * 2,
      height: cardHeight,
      borderColor: orangeColor,
      borderWidth: 2,
      color: rgb(1, 0.957, 0.918) // Light orange tint
    })
    
    // Recommendation title
    cursorY -= 8
    page.drawText(`Recommended: ${solutionType}`, {
      x: marginX + 8,
      y: cursorY,
      size: bodySize + 1,
      font: boldFont,
      color: orangeColor
    })
    cursorY -= 15
    ensureRoom()
    
    // Solution rationale (within card)
    const rationaleWords = solutionRationale.split(/\s+/)
    let rationaleLine = ''
    const maxWidth = 595.28 - marginX * 2 - 16
    for (const word of rationaleWords) {
      const testLine = rationaleLine ? `${rationaleLine} ${word}` : word
      const width = regularFont.widthOfTextAtSize(testLine, bodySize - 1)
      if (width > maxWidth && rationaleLine) {
        page.drawText(rationaleLine, {
          x: marginX + 8,
          y: cursorY,
          size: bodySize - 1,
          font: regularFont,
          color: textColor
        })
        cursorY -= lineHeight * 1.4
        ensureRoom()
        rationaleLine = word
      } else {
        rationaleLine = testLine
      }
    }
    if (rationaleLine) {
      page.drawText(rationaleLine, {
        x: marginX + 8,
        y: cursorY,
        size: bodySize - 1,
        font: regularFont,
        color: textColor
      })
      cursorY -= lineHeight * 1.4
      ensureRoom()
    }
    
    // Pricing box
    cursorY -= 5
    const pricingText = `Investment: ${pricing} (Estimated)`
    page.drawText(pricingText, {
      x: marginX + 8,
      y: cursorY,
      size: bodySize,
      font: boldFont,
      color: textColor
    })
    
    if (proposal.expectedROI) {
      cursorY -= 12
      page.drawText(`Expected ROI: ${proposal.expectedROI}`, {
        x: marginX + 8,
        y: cursorY,
        size: bodySize,
        font: regularFont,
        color: textColor
      })
    }
    
    cursorY = cardStartY - cardHeight - 15
    ensureRoom()
    
    // CTA buttons
    cursorY -= 10
    const buttonY = cursorY - 25
    
    // Approve button (visual)
    page.drawRectangle({
      x: marginX,
      y: buttonY,
      width: 250,
      height: 25,
      borderColor: orangeColor,
      borderWidth: 1,
      color: orangeColor
    })
    const approveText = 'Approve This Plan'
    const approveWidth = boldFont.widthOfTextAtSize(approveText, bodySize - 1)
    page.drawText(approveText, {
      x: marginX + (250 - approveWidth) / 2,
      y: buttonY + 5,
      size: bodySize - 1,
      font: boldFont,
      color: rgb(1, 1, 1) // White text
    })
    
    // Book call button (visual)
    page.drawRectangle({
      x: marginX + 270,
      y: buttonY,
      width: 270,
      height: 25,
      borderColor: orangeColor,
      borderWidth: 2
    })
    const bookText = 'Book 30-Min Free Call'
    const bookWidth = boldFont.widthOfTextAtSize(bookText, bodySize - 1)
    page.drawText(bookText, {
      x: marginX + 270 + (270 - bookWidth) / 2,
      y: buttonY + 5,
      size: bodySize - 1,
      font: boldFont,
      color: orangeColor
    })
    
    // Display URLs as text below buttons (links work in HTML version)
    cursorY -= 30
    writeLine(`Approve: ${approveLink.substring(0, 80)}...`, bodySize - 2, false, false, marginX)
    cursorY -= 8
    writeLine(`Book Call: ${bookingUrl}`, bodySize - 2, false, false, marginX)
    
    cursorY -= 10
    ensureRoom()
  } else {
    // Show both options
    writeLine('Explore Your Options:', bodySize, false)
    cursorY -= 15
    ensureRoom()
    
    // Workshop option
    page.drawRectangle({
      x: marginX,
      y: cursorY - 80,
      width: 260,
      height: 80,
      borderColor: orangeColor,
      borderWidth: 1,
      color: rgb(1, 0.957, 0.918)
    })
    writeLine('AI Strategy Workshop', bodySize, true, false, marginX + 8)
    cursorY -= 8
    writeLine('1-day in-person', bodySize - 2, false, false, marginX + 8)
    cursorY -= 18
    writeLine(FALLBACK_PRICING.workshop, bodySize + 1, true, false, marginX + 8)
    
    // Consulting option
    page.drawRectangle({
      x: marginX + 280,
      y: cursorY + 60,
      width: 260,
      height: 80,
      borderColor: orangeColor,
      borderWidth: 1,
      color: rgb(1, 0.957, 0.918)
    })
    writeLine('Custom AI Implementation', bodySize, true, false, marginX + 288)
    cursorY -= 8
    writeLine('4-8 week consulting', bodySize - 2, false, false, marginX + 288)
    cursorY -= 18
    writeLine(FALLBACK_PRICING.consulting, bodySize + 1, true, false, marginX + 288)
    
    cursorY -= 70
    ensureRoom()
    
    // Single CTA button
    const bookingUrl = CONTACT_CONFIG.SCHEDULING.BOOKING_URL
    const buttonY = cursorY - 25
    page.drawRectangle({
      x: marginX,
      y: buttonY,
      width: 595.28 - marginX * 2,
      height: 25,
      borderColor: orangeColor,
      borderWidth: 2,
      color: orangeColor
    })
    const ctaText = 'Book 30-Min Free Call'
    const ctaWidth = boldFont.widthOfTextAtSize(ctaText, bodySize)
    page.drawText(ctaText, {
      x: (595.28 - ctaWidth) / 2,
      y: buttonY + 5,
      size: bodySize,
      font: boldFont,
      color: rgb(1, 1, 1) // White text
    })
    
    // Display URL as text below button
    cursorY -= 30
    writeLine(`Book Call: ${bookingUrl}`, bodySize - 2, false, false, marginX)
    
    cursorY -= 35
    ensureRoom()
  }

  // Footer
  cursorY = Math.max(cursorY, 120)
  
  // Draw border line above footer
  page.drawLine({
    start: { x: marginX, y: cursorY },
    end: { x: 595.28 - marginX, y: cursorY },
    thickness: PDF_DESIGN_TOKENS.border.footerThickness,
    color: lightGrayColor
  })
  cursorY -= 20
  
  // Footer content (centered) - using design tokens
  const footerName = 'Farzad Bayat – AI Consulting Specialist'
  const footerSize = PDF_DESIGN_TOKENS.typography.small.size
  const footerNameWidth = boldFont.widthOfTextAtSize(footerName, footerSize)
  page.drawText(footerName, {
    x: (595.28 - footerNameWidth) / 2,
    y: cursorY,
    size: footerSize,
    font: boldFont,
    color: darkColor
  })
  cursorY -= 18
  
  const footerContact = 'contact@farzadbayat.com • +47 944 46 446'
  const footerContactWidth = regularFont.widthOfTextAtSize(footerContact, footerSize)
  page.drawText(footerContact, {
    x: (595.28 - footerContactWidth) / 2,
    y: cursorY,
    size: footerSize,
    font: regularFont,
    color: grayColor
  })
  cursorY -= 18
  
  const footerWebsite = 'www.farzadbayat.com'
  const footerWebsiteWidth = regularFont.widthOfTextAtSize(footerWebsite, footerSize)
  page.drawText(footerWebsite, {
    x: (595.28 - footerWebsiteWidth) / 2,
    y: cursorY,
    size: footerSize,
    font: regularFont,
    color: orangeColor
  })

  const pdfBytes = await pdfDoc.save()
  
  // In serverless environments (like Vercel), we can't write to filesystem
  // Instead, we'll return the PDF bytes directly for email attachment
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    // Store PDF bytes in memory or return them directly
    return pdfBytes
  } else {
    // Only write to filesystem in development
    await fs.promises.writeFile(outputPath, pdfBytes)
    return pdfBytes
  }

  function writeParagraph(text: string, size = PDF_DESIGN_TOKENS.typography.body.size) {
    const translated = translateText(text)
    const maxWidth = 595.28 - marginX * 2
    const words = translated.split(/\s+/)
    let line = ''
    
    // Use design token line height multiplier
    const paragraphLineHeight = lineHeight * PDF_DESIGN_TOKENS.typography.body.lineHeight

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word
      const width = regularFont.widthOfTextAtSize(testLine, size)
      if (width > maxWidth) {
        page.drawText(line, {
          x: marginX,
          y: cursorY,
          size,
          font: regularFont,
          color: textColor
        })
        cursorY -= paragraphLineHeight
        ensureRoom()
        line = word
      } else {
        line = testLine
      }
    }

    if (line) {
      page.drawText(line, {
        x: marginX,
        y: cursorY,
        size,
        font: regularFont,
        color: textColor
      })
      cursorY -= paragraphLineHeight
      ensureRoom()
    }
  }
}

