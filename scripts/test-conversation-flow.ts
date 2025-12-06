/**
 * Conversation Flow Test Script
 * Simulates a complete conversation flow and generates PDF report
 */

import { routeToAgent } from '../src/core/agents/orchestrator.js'
import type { AgentContext, ChatMessage, FunnelStage } from '../src/core/agents/types.js'
import { generatePDF } from '../src/core/pdf/generator.js'

interface TestScenario {
  name: string
  description: string
  messages: ChatMessage[]
  context: AgentContext
  expectedStage: FunnelStage
  expectedAgent: string
}

const scenarios: TestScenario[] = [
  {
    name: 'Workshop Lead Flow',
    description: 'Mid-size company manager seeking team training',
    messages: [
      { role: 'user', content: 'What services do you offer?' },
      { role: 'assistant', content: 'We offer AI workshops and consulting. What are you looking to achieve?' },
      { role: 'user', content: 'We want to train our team on AI. We have about 50 people and want hands-on workshops.' },
      { role: 'assistant', content: 'Great! What specific areas would you like to focus on?' },
      { role: 'user', content: 'We need to automate our reporting and teach our team how to use AI tools effectively.' }
    ],
    context: {
      sessionId: 'test-workshop-session',
      intelligenceContext: {
        email: 'manager@midsize.com',
        name: 'Jane Manager',
        company: {
          name: 'MidSize Tech',
          industry: 'Software',
          size: '51-200',
          employeeCount: 50
        },
        person: {
          fullName: 'Jane Manager',
          role: 'Engineering Manager',
          seniority: 'Manager'
        },
        role: 'Engineering Manager',
        budget: {
          hasExplicit: true,
          minUsd: 5,
          maxUsd: 15,
          urgency: 0.7
        },
        fitScore: {
          workshop: 0.85,
          consulting: 0.25
        }
      },
      conversationFlow: {
        covered: {
          goals: true,
          pain: true,
          data: true,
          readiness: true,
          budget: true,
          success: false
        },
        recommendedNext: null,
        evidence: {
          goals: ['Team training', 'AI workshops'],
          pain: ['Manual reporting'],
          budget: ['$5K-$15K range']
        },
        coverageOrder: [],
        totalUserTurns: 5,
        shouldOfferRecap: false
      },
      multimodalContext: {
        hasRecentImages: false,
        hasRecentAudio: false,
        hasRecentUploads: false,
        recentAnalyses: [],
        recentUploads: []
      }
    },
    expectedStage: 'WORKSHOP_PITCH',
    expectedAgent: 'Workshop Sales Agent'
  },
  {
    name: 'Consulting Lead Flow',
    description: 'Enterprise CTO seeking custom AI implementation',
    messages: [
      { role: 'user', content: 'We need a custom AI system for our operations' },
      { role: 'assistant', content: 'Tell me more about what you need to automate.' },
      { role: 'user', content: 'We have 500 employees and need to automate customer service workflows. Budget is around $100K.' },
      { role: 'assistant', content: 'What specific workflows are you looking to automate?' },
      { role: 'user', content: 'Customer support ticket routing, email responses, and integration with our CRM system.' }
    ],
    context: {
      sessionId: 'test-consulting-session',
      intelligenceContext: {
        email: 'cto@enterprise.com',
        name: 'Bob CTO',
        company: {
          name: 'Enterprise Inc',
          industry: 'Finance',
          size: '201-1000',
          employeeCount: 500
        },
        person: {
          fullName: 'Bob CTO',
          role: 'Chief Technology Officer',
          seniority: 'C-Level'
        },
        role: 'CTO',
        budget: {
          hasExplicit: true,
          minUsd: 50,
          maxUsd: 150,
          urgency: 0.9
        },
        fitScore: {
          workshop: 0.2,
          consulting: 0.9
        }
      },
      conversationFlow: {
        covered: {
          goals: true,
          pain: true,
          data: true,
          readiness: true,
          budget: true,
          success: true
        },
        recommendedNext: null,
        evidence: {
          goals: ['Custom AI system', 'Workflow automation'],
          pain: ['Manual customer service'],
          budget: ['$100K budget']
        },
        coverageOrder: [],
        totalUserTurns: 5,
        shouldOfferRecap: true
      },
      multimodalContext: {
        hasRecentImages: true,
        hasRecentAudio: false,
        hasRecentUploads: false,
        recentAnalyses: ['Dashboard showing customer service metrics'],
        recentUploads: []
      }
    },
    expectedStage: 'CONSULTING_PITCH',
    expectedAgent: 'Consulting Sales Agent'
  }
]

async function runTestScenario(scenario: TestScenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`)
  console.log(`   Description: ${scenario.description}`)
  
  const results: Array<{
    message: string
    agent: string
    stage: FunnelStage | undefined
    output: string
  }> = []

  // Process each message in the conversation
  for (let i = 0; i < scenario.messages.length; i++) {
    const message = scenario.messages[i]
    if (message.role !== 'user') continue

    const messagesToProcess = scenario.messages.slice(0, i + 1)
    
    try {
      const result = await routeToAgent({
        messages: messagesToProcess,
        sessionId: scenario.context.sessionId,
        currentStage: scenario.context.stage || 'DISCOVERY',
        intelligenceContext: scenario.context.intelligenceContext || {},
        multimodalContext: scenario.context.multimodalContext || {},
        trigger: 'chat'
      })

      results.push({
        message: message.content,
        agent: result.agent,
        stage: result.metadata?.stage,
        output: result.output.substring(0, 200) + '...'
      })

      console.log(`   ✅ Message ${i + 1}: ${result.agent} (${result.metadata?.stage})`)
    } catch (error) {
      console.error(`   ❌ Error on message ${i + 1}:`, error)
      results.push({
        message: message.content,
        agent: 'Error',
        stage: undefined,
        output: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return {
    scenario,
    results,
    finalStage: results[results.length - 1]?.stage,
    finalAgent: results[results.length - 1]?.agent
  }
}

async function generateTestReport(testResults: Array<Awaited<ReturnType<typeof runTestScenario>>>) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Conversation Flow Test Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #2563eb;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
    }
    h2 {
      color: #1e40af;
      margin-top: 40px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
    }
    .scenario {
      background: #f9fafb;
      border-left: 4px solid #2563eb;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .test-result {
      background: white;
      border: 1px solid #e5e7eb;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .message {
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 5px;
    }
    .agent {
      color: #059669;
      font-weight: 500;
    }
    .stage {
      color: #dc2626;
      font-weight: 500;
    }
    .output {
      color: #6b7280;
      font-style: italic;
      margin-top: 5px;
    }
    .summary {
      background: #eff6ff;
      border: 2px solid #2563eb;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 10px;
    }
    .status.pass {
      background: #d1fae5;
      color: #065f46;
    }
    .status.fail {
      background: #fee2e2;
      color: #991b1b;
    }
  </style>
</head>
<body>
  <h1>Conversation Flow Test Report</h1>
  <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
  <p><strong>Total Scenarios:</strong> ${testResults.length}</p>

  ${testResults.map((test, idx) => {
    const passed = test.finalStage === test.scenario.expectedStage || 
                   test.finalAgent === test.scenario.expectedAgent
    return `
    <div class="scenario">
      <h2>Scenario ${idx + 1}: ${test.scenario.name}
        <span class="status ${passed ? 'pass' : 'fail'}">
          ${passed ? '✓ PASS' : '✗ FAIL'}
        </span>
      </h2>
      <p><strong>Description:</strong> ${test.scenario.description}</p>
      <p><strong>Expected:</strong> ${test.scenario.expectedAgent} (${test.scenario.expectedStage})</p>
      <p><strong>Actual:</strong> ${test.finalAgent} (${test.finalStage || 'N/A'})</p>
      
      <h3>Conversation Flow</h3>
      ${test.results.map((r, i) => `
        <div class="test-result">
          <div class="message">Message ${i + 1}: "${r.message}"</div>
          <div>Agent: <span class="agent">${r.agent}</span></div>
          <div>Stage: <span class="stage">${r.stage || 'N/A'}</span></div>
          <div class="output">Response: ${r.output}</div>
        </div>
      `).join('')}
    </div>
    `
  }).join('')}

  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Total Tests:</strong> ${testResults.length}</p>
    <p><strong>Passed:</strong> ${testResults.filter(t => 
      t.finalStage === t.scenario.expectedStage || 
      t.finalAgent === t.scenario.expectedAgent
    ).length}</p>
    <p><strong>Failed:</strong> ${testResults.filter(t => 
      t.finalStage !== t.scenario.expectedStage && 
      t.finalAgent !== t.scenario.expectedAgent
    ).length}</p>
  </div>
</body>
</html>
  `

  const pdfBuffer = await generatePDF({
    html,
    filename: 'conversation-flow-test-report.pdf',
    options: {
      format: 'A4',
      printBackground: true
    }
  })

  return pdfBuffer
}

async function main() {
  console.log('🚀 Starting Conversation Flow Tests...\n')

  const testResults: Array<Awaited<ReturnType<typeof runTestScenario>>> = []

  for (const scenario of scenarios) {
    const result = await runTestScenario(scenario)
    testResults.push(result)
  }

  console.log('\n📄 Generating PDF Report...')
  const pdfBuffer = await generateTestReport(testResults)
  
  const fs = await import('fs/promises')
  const path = await import('path')
  const outputPath = path.join(process.cwd(), 'conversation-flow-test-report.pdf')
  await fs.writeFile(outputPath, pdfBuffer)
  
  console.log(`\n✅ PDF Report Generated: ${outputPath}`)
  console.log(`\n📊 Test Summary:`)
  console.log(`   Total: ${testResults.length}`)
  console.log(`   Passed: ${testResults.filter(t => 
    t.finalStage === t.scenario.expectedStage || 
    t.finalAgent === t.scenario.expectedAgent
  ).length}`)
  console.log(`   Failed: ${testResults.filter(t => 
    t.finalStage !== t.scenario.expectedStage && 
    t.finalAgent !== t.scenario.expectedAgent
  ).length}`)
}

main().catch(console.error)

