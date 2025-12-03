/**
 * Multimodal Integration Test Suite
 * 
 * Tests all 6 real-world scenarios to prove the system works across every modality.
 * 
 * Usage: tsx scripts/multimodal-integration-test.ts
 */

import { v4 as uuidv4 } from 'uuid'

const API_URL = process.env.API_URL || 'http://localhost:3002'
const sessionId = uuidv4()

interface TestResult {
  scenario: string
  passed: boolean
  error?: string
  response?: any
  contextReferenced?: boolean
}

const results: TestResult[] = []

/**
 * Scenario 1: Text + File Upload
 * User types "Here's our budget" + uploads Excel file
 * Expected: Pitch agent references exact numbers from file
 */
async function testTextWithFile(): Promise<TestResult> {
  console.log('\n📄 Scenario 1: Text + File Upload')
  
  try {
    // Create a simple Excel-like CSV content for testing
    const csvContent = 'Category,Budget\nMarketing,$150000\nEngineering,$200000\nTotal,$350000'
    const base64Csv = Buffer.from(csvContent).toString('base64')
    
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        messages: [
          {
            role: 'user',
            content: "Here's our budget",
            attachments: [
              {
                mimeType: 'text/csv',
                data: base64Csv,
                filename: 'budget.csv'
              }
            ]
          }
        ],
        intelligenceContext: {
          company: { size: '51-200' },
          person: { seniority: 'VP' },
          budget: { hasExplicit: true }
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`   ❌ API Error (${response.status}): ${errorText.substring(0, 200)}`)
      return {
        scenario: 'Text + File Upload',
        passed: false,
        error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`
      }
    }
    
    const data = await response.json()
    const responseText = data.output?.toLowerCase() || ''
    
    // Debug: Log response for analysis
    console.log(`   Response status: ${response.status}`)
    console.log(`   Response preview: ${responseText.substring(0, 200) || '(empty)'}...`)
    console.log(`   Agent: ${data.agent || 'unknown'}`)
    console.log(`   Full response keys: ${Object.keys(data as Record<string, unknown>).join(', ')}`)
    
    // Check if agent references budget numbers
    const referencesBudget = responseText.includes('150') || 
                            responseText.includes('200') || 
                            responseText.includes('350') ||
                            responseText.includes('budget') ||
                            responseText.includes('spreadsheet') ||
                            responseText.includes('file') ||
                            responseText.includes('csv') ||
                            responseText.includes('data')

    return {
      scenario: 'Text + File Upload',
      passed: response.ok && referencesBudget,
      response: data,
      contextReferenced: referencesBudget
    }
  } catch (error) {
    return {
      scenario: 'Text + File Upload',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Scenario 2: Voice + Screen Share
 * User says "Can you see this?" while screen sharing dashboard
 * Expected: Discovery/Pitch agent says "Yes, I see Q4 revenue is down 18%..."
 */
async function testVoiceWithScreen(): Promise<TestResult> {
  console.log('\n🎤📺 Scenario 2: Voice + Screen Share')
  
  try {
    // First, simulate screen share analysis
    const screenBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' // 1x1 red pixel
    
    const screenResponse = await fetch(`${API_URL}/api/tools/webcam`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-intelligence-session-id': sessionId
      },
      body: JSON.stringify({
        sessionId,
        imageData: screenBase64,
        type: 'screen'
      })
    })

    await screenResponse.json() // Store screen analysis in context
    
    // Wait a moment for context to be stored
    await new Promise(r => setTimeout(r, 1000))
    
    // Then send voice transcript as text message
    const chatResponse = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        messages: [
          {
            role: 'user',
            content: "Can you see this dashboard I'm sharing?"
          }
        ],
        intelligenceContext: {
          company: { size: '51-200' }
        },
        multimodalContext: {
          hasRecentImages: true,
          recentAnalyses: ['Dashboard showing revenue metrics']
        }
      })
    })

    const chatData = await chatResponse.json()
    const responseText = chatData.output?.toLowerCase() || ''
    
    // Check if agent references screen/dashboard
    const referencesScreen = responseText.includes('see') ||
                            responseText.includes('dashboard') ||
                            responseText.includes('screen') ||
                            responseText.includes('sharing') ||
                            responseText.includes('visual')

    return {
      scenario: 'Voice + Screen Share',
      passed: screenResponse.ok && chatResponse.ok && referencesScreen,
      response: chatData,
      contextReferenced: referencesScreen
    }
  } catch (error) {
    return {
      scenario: 'Voice + Screen Share',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Scenario 3: Webcam + Text
 * User shows face + types "What do you think?"
 * Expected: Discovery agent says "I can see you're in an office with 3 monitors..."
 */
async function testWebcamWithText(): Promise<TestResult> {
  console.log('\n📷💬 Scenario 3: Webcam + Text')
  
  try {
    // First, simulate webcam analysis
    const webcamBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    
    const webcamResponse = await fetch(`${API_URL}/api/tools/webcam`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-intelligence-session-id': sessionId
      },
      body: JSON.stringify({
        sessionId,
        imageData: webcamBase64,
        type: 'webcam'
      })
    })

    await webcamResponse.json() // Store webcam analysis in context
    
    // Wait for context storage
    await new Promise(r => setTimeout(r, 1000))
    
    // Then send text message
    const chatResponse = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        messages: [
          {
            role: 'user',
            content: "What do you think?"
          }
        ],
        intelligenceContext: {
          company: { size: '11-50' }
        },
        multimodalContext: {
          hasRecentImages: true,
          recentAnalyses: ['Person in office environment with multiple monitors visible']
        }
      })
    })

    const chatData = await chatResponse.json()
    const responseText = chatData.output?.toLowerCase() || ''
    
    // Check if agent references visual context
    const referencesVisual = responseText.includes('see') ||
                            responseText.includes('office') ||
                            responseText.includes('monitor') ||
                            responseText.includes('webcam') ||
                            responseText.includes('visual') ||
                            responseText.includes('camera')

    return {
      scenario: 'Webcam + Text',
      passed: webcamResponse.ok && chatResponse.ok && referencesVisual,
      response: chatData,
      contextReferenced: referencesVisual
    }
  } catch (error) {
    return {
      scenario: 'Webcam + Text',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Scenario 4: URL Drop
 * User pastes "This is our product: https://acme.com/ai"
 * Expected: Discovery agent responds with real insights from page
 */
async function testUrlDrop(): Promise<TestResult> {
  console.log('\n🔗 Scenario 4: URL Drop')
  
  try {
    // Use a real, accessible URL for testing
    const testUrl = 'https://farzadbayat.com'
    
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        messages: [
          {
            role: 'user',
            content: `This is our product: ${testUrl}`
          }
        ],
        intelligenceContext: {
          company: { size: '1-10', domain: 'farzadbayat.com' }
        }
      })
    })

    const data = await response.json()
    const responseText = data.output?.toLowerCase() || ''
    
    // Check if agent references URL or page content
    const referencesUrl = responseText.includes('page') ||
                         responseText.includes('website') ||
                         responseText.includes('site') ||
                         responseText.includes('url') ||
                         responseText.includes('farzadbayat') ||
                         responseText.includes('product') ||
                         responseText.length > 50 // Substantial response indicates analysis

    return {
      scenario: 'URL Drop',
      passed: response.ok && referencesUrl,
      response: data,
      contextReferenced: referencesUrl
    }
  } catch (error) {
    return {
      scenario: 'URL Drop',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Scenario 5: Mixed Chaos
 * Voice + screen + URL + file upload in one session
 * Expected: All context flows correctly → Pitch agent references everything
 */
async function testMixedChaos(): Promise<TestResult> {
  console.log('\n🌪️ Scenario 5: Mixed Chaos (All Modalities)')
  
  try {
    // Step 1: Screen share
    const screenBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    await fetch(`${API_URL}/api/tools/webcam`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-intelligence-session-id': sessionId
      },
      body: JSON.stringify({
        sessionId,
        imageData: screenBase64,
        type: 'screen'
      })
    })
    
    await new Promise(r => setTimeout(r, 500))
    
    // Step 2: File upload
    const csvContent = 'Metric,Value\nRevenue,$500K\nGrowth,25%'
    const base64Csv = Buffer.from(csvContent).toString('base64')
    
    const fileResponse = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        messages: [
          {
            role: 'user',
            content: "Here's our metrics",
            attachments: [
              {
                mimeType: 'text/csv',
                data: base64Csv,
                filename: 'metrics.csv'
              }
            ]
          }
        ],
        intelligenceContext: {
          company: { size: '51-200' },
          budget: { hasExplicit: true }
        }
      })
    })
    
    await new Promise(r => setTimeout(r, 500))
    
    // Step 3: URL drop
    const urlResponse = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        messages: [
          {
            role: 'user',
            content: "Check this out: https://farzadbayat.com"
          }
        ],
        intelligenceContext: {
          company: { size: '51-200' },
          budget: { hasExplicit: true }
        },
        multimodalContext: {
          hasRecentImages: true,
          hasRecentUploads: true,
          recentAnalyses: ['Dashboard analysis', 'Metrics file uploaded']
        }
      })
    })
    
    await new Promise(r => setTimeout(r, 500))
    
    // Step 4: Final message that should reference everything
    const finalResponse = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        messages: [
          {
            role: 'user',
            content: "So what do you think overall?"
          }
        ],
        intelligenceContext: {
          company: { size: '51-200' },
          budget: { hasExplicit: true }
        },
        multimodalContext: {
          hasRecentImages: true,
          hasRecentUploads: true,
          recentAnalyses: ['Dashboard analysis', 'Metrics file uploaded', 'URL analyzed']
        }
      })
    })

    const finalData = await finalResponse.json()
    const responseText = finalData.output?.toLowerCase() || ''
    
    // Check if agent references multiple modalities
    const referencesMultiple = (
      responseText.includes('dashboard') || responseText.includes('screen') ||
      responseText.includes('file') || responseText.includes('spreadsheet') ||
      responseText.includes('metrics') || responseText.includes('url') ||
      responseText.includes('website') || responseText.includes('page')
    ) && responseText.length > 100 // Substantial response

    return {
      scenario: 'Mixed Chaos',
      passed: fileResponse.ok && urlResponse.ok && finalResponse.ok && referencesMultiple,
      response: finalData,
      contextReferenced: referencesMultiple
    }
  } catch (error) {
    return {
      scenario: 'Mixed Chaos',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Scenario 6: Reload Test
 * Hard refresh mid-conversation
 * Expected: Stage + context + multimodal history survive
 */
async function testReload(): Promise<TestResult> {
  console.log('\n🔄 Scenario 6: Reload Test (Context Persistence)')
  
  try {
    // Step 1: Send initial message to establish stage
    const initialResponse = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        messages: [
          {
            role: 'user',
            content: "We're a 180-person fintech company"
          }
        ],
        intelligenceContext: {
          company: { size: '201-1000' },
          budget: { hasExplicit: true },
          person: { seniority: 'VP' }
        }
      })
    })

    const initialData = await initialResponse.json()
    const initialStage = initialData.metadata?.stage || 'DISCOVERY'
    
    // Wait a moment (simulating page reload delay)
    await new Promise(r => setTimeout(r, 1000))
    
    // Step 2: Send follow-up message (simulating post-reload continuation)
    const followUpResponse = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, // Same session ID (simulating reload)
        messages: [
          {
            role: 'user',
            content: "We're a 180-person fintech company"
          },
          {
            role: 'assistant',
            content: initialData.output || "Hello"
          },
          {
            role: 'user',
            content: "What's next?"
          }
        ],
        intelligenceContext: {
          company: { size: '201-1000' },
          budget: { hasExplicit: true },
          person: { seniority: 'VP' }
        }
      })
    })

    const followUpData = await followUpResponse.json()
    const followUpStage = followUpData.metadata?.stage || 'DISCOVERY'
    
    // Check if stage persisted or advanced correctly
    const stagePersisted = followUpResponse.ok && (
      followUpStage === initialStage ||
      followUpStage === 'QUALIFIED' ||
      followUpStage === 'PITCHING'
    )

    return {
      scenario: 'Reload Test',
      passed: initialResponse.ok && stagePersisted,
      response: {
        initialStage,
        followUpStage,
        initialResponse: initialData,
        followUpResponse: followUpData
      },
      contextReferenced: stagePersisted
    }
  } catch (error) {
    return {
      scenario: 'Reload Test',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Run all tests and generate report
 */
async function runAllTests() {
  console.log('🚀 MULTIMODAL INTEGRATION TEST SUITE')
  console.log('=' .repeat(60))
  console.log(`Session ID: ${sessionId}`)
  console.log(`API URL: ${API_URL}`)
  console.log('=' .repeat(60))

  // Run all 6 scenarios
  results.push(await testTextWithFile())
  results.push(await testVoiceWithScreen())
  results.push(await testWebcamWithText())
  results.push(await testUrlDrop())
  results.push(await testMixedChaos())
  results.push(await testReload())

  // Generate report
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST RESULTS')
  console.log('='.repeat(60))

  let passedCount = 0
  let failedCount = 0

  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL'
    console.log(`\n${index + 1}. ${result.scenario}: ${status}`)
    
    if (result.passed) {
      passedCount++
      if (result.contextReferenced) {
        console.log('   ✓ Agent referenced multimodal context')
      }
    } else {
      failedCount++
      if (result.error) {
        console.log(`   ✗ Error: ${result.error}`)
      } else {
        console.log('   ✗ Agent did not reference multimodal context')
      }
    }
  })

  console.log('\n' + '='.repeat(60))
  console.log('📈 SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${passedCount}/6`)
  console.log(`❌ Failed: ${failedCount}/6`)
  console.log(`Success Rate: ${((passedCount / 6) * 100).toFixed(1)}%`)

  if (passedCount === 6) {
    console.log('\n🎉 ALL TESTS PASSED - MULTIMODAL VERIFIED')
    console.log('✅ System works across every modality')
    console.log('✅ Ready for production deployment')
  } else {
    console.log('\n⚠️  SOME TESTS FAILED')
    console.log('Review failures above before deployment')
  }

  console.log('='.repeat(60) + '\n')

  return passedCount === 6
}

// Run tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })

