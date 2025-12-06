/**
 * Test Discovery Report Generation
 * 
 * Generates a sample AI Discovery Report PDF with realistic data
 * to verify design and layout
 */

import { generateDiscoveryReportFromSession } from '../src/core/pdf/discovery-report-generator.js'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function testDiscoveryReport() {
  console.log('🧪 Testing AI Discovery Report Generation...\n')

  // Sample session data
  const sessionData = {
    sessionId: 'test-session-' + Date.now(),
    leadInfo: {
      name: 'Sarah Chen',
      email: 'sarah.chen@techcorp.com',
      company: 'TechCorp Solutions',
      role: 'VP of Operations'
    },
    conversationSummary: 'Discussed AI automation strategy for customer support workflows. Client is looking to reduce manual data entry and improve response times. Showed interest in both consulting and workshop options.',
    keyFindings: {
      goals: 'Automate customer support workflows to reduce response times by 60%',
      painPoints: [
        'Manual data entry consuming 40% of team capacity',
        'Response times averaging 48 hours for complex queries',
        'High employee turnover in support team'
      ],
      currentSituation: 'Currently using legacy CRM system with limited automation. Team of 12 support agents handling 500+ tickets per week.'
    },
    multimodalContext: {
      voiceSummary: '15 minutes discussing AI implementation strategy, team readiness, and ROI expectations',
      voiceMinutes: 15,
      screenSummary: 'Analyzed CRM dashboard showing customer ticket backlog trends and response time metrics',
      screenMinutes: 8,
      filesReviewed: [
        {
          filename: 'Q4_Support_Metrics.xlsx',
          analysis: 'Q4 projections show 23% increase in ticket volume. Current capacity at 85%.'
        },
        {
          filename: 'budget_2025.pdf',
          analysis: 'Annual support budget: $450K. Allocated $120K for technology improvements.'
        }
      ],
      webcamSummary: 'Visual analysis of team workspace and current workflow setup'
    },
    toolsUsed: [
      {
        name: 'search_web',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        insight: 'Researched industry benchmarks for AI-powered support automation'
      },
      {
        name: 'calculate_roi',
        timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        insight: 'Projected 340% ROI with 4-month payback period'
      },
      {
        name: 'capture_screen_snapshot',
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        insight: 'Analyzed CRM dashboard metrics and ticket trends'
      },
      {
        name: 'extract_action_items',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        insight: 'Extracted 5 key action items from conversation'
      },
      {
        name: 'generate_summary_preview',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        insight: 'Generated executive summary preview'
      }
    ],
    roiData: {
      investment: 50000,
      projectedSavings: 200000,
      roiPercentage: 300,
      paybackPeriod: '4 months'
    },
    recommendedSolution: 'consulting' as const,
    solutionRationale: 'Based on the complexity of your requirements and team size, a comprehensive consulting engagement would provide the most value. This will include strategy development, implementation planning, and change management support.',
    messageCount: 32
  }

  try {
    console.log('📊 Building report data...')
    const result = await generateDiscoveryReportFromSession(sessionData)
    
    console.log('✅ Report data built successfully')
    console.log(`   - Client: ${result.data.client.name} (${result.data.client.company})`)
    console.log(`   - Engagement: ${result.data.engagementLevel}`)
    console.log(`   - Insights: ${result.data.insights.length}`)
    console.log(`   - Observations: ${result.data.observations.length}`)
    console.log(`   - Tools Used: ${result.data.toolsUsed.length}`)
    console.log(`   - ROI Data: ${result.data.roi?.hasData ? 'Yes' : 'No'}\n`)

    console.log('📄 Generating PDF...')
    const pdfBuffer = Buffer.from(result.pdf)
    
    // Save PDF
    const pdfPath = join(process.cwd(), 'test-discovery-report.pdf')
    writeFileSync(pdfPath, pdfBuffer)
    console.log(`✅ PDF saved to: ${pdfPath}\n`)

    // Save HTML for preview
    const htmlPath = join(process.cwd(), 'test-discovery-report.html')
    writeFileSync(htmlPath, result.html)
    console.log(`✅ HTML saved to: ${htmlPath}\n`)

    console.log('📊 Report Statistics:')
    console.log(`   - PDF Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`)
    console.log(`   - HTML Size: ${(result.html.length / 1024).toFixed(2)} KB`)
    console.log(`   - Engagement Metrics:`)
    console.log(`     * Text: ${result.data.engagementMetrics.text}/100`)
    console.log(`     * Voice: ${result.data.engagementMetrics.voice}/100`)
    console.log(`     * Screen: ${result.data.engagementMetrics.screen}/100`)
    console.log(`     * Files: ${result.data.engagementMetrics.files}/100`)

    console.log('\n✨ Test completed successfully!')
    console.log('\n📖 To view the report:')
    console.log(`   - Open: ${htmlPath} in your browser`)
    console.log(`   - Or open: ${pdfPath} in a PDF viewer`)

  } catch (error) {
    console.error('❌ Error generating report:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
    process.exit(1)
  }
}

// Run test
testDiscoveryReport().catch(console.error)

