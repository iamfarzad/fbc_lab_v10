/**
 * Test script to generate PDF with artifacts
 * Generates a sample PDF showing executive memo, cost of inaction, syllabus, and competitor gap
 */

import { writeFile } from 'fs/promises'
import { join } from 'path'
import { generatePdfWithPuppeteer } from '../src/core/pdf/generator.js'
import type { SummaryData } from '../src/core/pdf/utils/types.js'

async function generateTestPDF() {
  console.log('📄 Generating test PDF with artifacts...\n')

  // Sample conversation history
  const conversationHistory = [
    {
      role: 'user' as const,
      content: 'We spend about 20 hours per week on manual data entry in our marketing workflow.',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      role: 'assistant' as const,
      content: 'That\'s a significant time drain. With a team of 5 people, that\'s 100 hours per week, or about 5,200 hours per year. At an average cost of $50/hour, that\'s $260,000 in wasted time annually.',
      timestamp: new Date(Date.now() - 3500000).toISOString()
    },
    {
      role: 'user' as const,
      content: 'Yes, and our CFO is concerned about the budget for new tools.',
      timestamp: new Date(Date.now() - 3400000).toISOString()
    },
    {
      role: 'assistant' as const,
      content: 'I understand. Let me calculate the ROI and create a memo for your CFO that explains why this investment will actually save money.',
      timestamp: new Date(Date.now() - 3300000).toISOString()
    },
    {
      role: 'user' as const,
      content: 'That would be helpful. We also want to understand what a custom workshop would cover.',
      timestamp: new Date(Date.now() - 3200000).toISOString()
    },
    {
      role: 'assistant' as const,
      content: 'I\'ll generate a custom syllabus tailored to your team and pain points. This will show exactly what we\'ll cover in the workshop.',
      timestamp: new Date(Date.now() - 3100000).toISOString()
    }
  ]

  // Sample SummaryData with all artifacts
  const summaryData: SummaryData = {
    leadInfo: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@techcorp.com',
      company: 'TechCorp Inc.',
      role: 'VP of Marketing'
    },
    sessionId: 'test-session-' + Date.now(),
    conversationHistory,
    leadResearch: {
      conversation_summary: 'Discussed manual data entry inefficiencies in marketing workflow. Identified 20 hours/week waste affecting 5 team members. CFO has budget concerns. Client interested in custom workshop solution.',
      consultant_brief: 'High-value lead with clear pain point and budget authority. Strong fit for 2-day workshop focusing on automation and AI integration for marketing workflows.',
      lead_score: 85,
      ai_capabilities_shown: 'ROI calculation, cost analysis, executive memo generation, custom syllabus creation'
    },
    proposal: {
      recommendedSolution: 'workshop',
      pricingBallpark: '$10,000-$15,000',
      solutionRationale: 'Workshop provides immediate hands-on training for team while addressing specific pain points. Lower investment than full consulting engagement.',
      expectedROI: '300% first year ROI with payback period of 2.3 months',
      nextSteps: 'Schedule 2-day workshop for next month. Team will implement solutions immediately after training.'
    },
    multimodalContext: {
      visualAnalyses: [],
      voiceTranscripts: [],
      uploadedFiles: [],
      summary: {
        totalMessages: conversationHistory.length,
        modalitiesUsed: ['text'],
        recentVisualAnalyses: 0,
        recentAudioEntries: 0,
        recentUploads: 0
      }
    },
    // High-value artifacts
    artifacts: {
      executiveMemo: {
        targetAudience: 'CFO',
        subject: 'Business Case for AI Optimization Workshop',
        content: `TO: CFO
FROM: Sarah Johnson, VP of Marketing
DATE: ${new Date().toLocaleDateString()}

SUBJECT: Business Case for AI Optimization Workshop

EXECUTIVE SUMMARY:

We are currently losing approximately 20 hours/week on manual data entry in the Marketing workflow. This equates to an estimated annual waste of $260,000.

PROPOSED SOLUTION:

Engagement with F.B/c Consulting for a 2-Day Implementation Workshop.

INVESTMENT vs RETURN:

Cost: $12,000 (One-time)
Projected Savings (Year 1): $260,000
Payback Period: < 3 Months

RISK MITIGATION:

Unlike generic tools, F.B/c specializes in Local/Private LLMs, ensuring no client data leaves our servers. Implementation is hands-on with our team, reducing technical risk.

RECOMMENDATION:

Approval to book immediate slot for next month to stop the operational bleed. The workshop pays for itself in under 3 months, with ongoing annual savings of $260,000.`
      },
      costOfInaction: {
        monthlyWaste: 21667, // $260,000 / 12
        annualWaste: 260000,
        inefficiencySource: 'Manual data entry in marketing workflow'
      },
      customSyllabus: {
        title: 'Custom Workshop Syllabus - Marketing Automation',
        modules: [
          {
            title: 'Day 1: Understanding AI for Marketing',
            topics: [
              'Introduction to Local/Private LLMs for marketing',
              'Automating data entry workflows',
              'Integrating AI with current marketing stack',
              'Hands-on: Building your first automation'
            ]
          },
          {
            title: 'Day 1: Implementation Planning',
            topics: [
              'Architecture design for your use case',
              'Security and compliance considerations',
              'Team enablement and training plan',
              'ROI tracking and measurement'
            ]
          },
          {
            title: 'Day 2: Building Solutions',
            topics: [
              'Live build: Data entry automation',
              'Testing and validation',
              'Deployment strategies',
              'Troubleshooting and optimization'
            ]
          },
          {
            title: 'Day 2: Going Live',
            topics: [
              'Production deployment',
              'Monitoring and maintenance',
              'Scaling to other workflows',
              'Next steps and follow-up support'
            ]
          }
        ]
      },
      competitorGap: {
        clientState: 'Manual processes, exploring AI but not implemented',
        competitors: ['TechLeader Inc.', 'InnovateCorp', 'DigitalFirst Solutions'],
        gapAnalysis: 'Market leaders in your industry have already implemented AI automation, reducing operational costs by 40-60%. Your competitors are gaining efficiency advantages while you continue manual processes. The gap widens each month without action.'
      }
    }
  }

  // Generate PDF
  const timestamp = new Date().toISOString().split('T')[0]
  const pdfFilename = `test-pdf-with-artifacts-${timestamp}.pdf`
  const fullPath = join(process.cwd(), pdfFilename)

  console.log('Generating PDF with Puppeteer...')
  const pdfBuffer = await generatePdfWithPuppeteer(summaryData, fullPath, 'client', 'en')

  // Save PDF
  await writeFile(fullPath, pdfBuffer)

  console.log('\n✅ PDF Generated Successfully!')
  console.log(`📁 File: ${fullPath}`)
  console.log(`📊 Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`)
  console.log('\n📋 PDF Includes:')
  console.log('   ✓ Executive Summary')
  console.log('   ✓ Cost of Inaction Warning Box')
  console.log('   ✓ Executive Memo (separate page)')
  console.log('   ✓ Custom Workshop Syllabus')
  console.log('   ✓ Competitor Gap Analysis')
  console.log('   ✓ Full Conversation Transcript')
  console.log('   ✓ Proposal & Next Steps')
  console.log('\n💡 Open the PDF to see how artifacts are rendered!\n')
}

generateTestPDF().catch((error) => {
  console.error('❌ Error generating PDF:', error)
  process.exit(1)
})
