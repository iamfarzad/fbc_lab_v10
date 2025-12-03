/**
 * Load Test Script - Day 5
 * 
 * Simulates 100 concurrent users sending realistic conversation flows.
 * Tests system stability under production-like load.
 * 
 * Usage: tsx scripts/load-test-2026.ts
 */

import { v4 as uuidv4 } from 'uuid'

const CONCURRENT_USERS = 100
const MESSAGES_PER_USER = 12
const API_URL = process.env.API_URL || 'http://localhost:3000/api/chat'

interface TestResult {
  sessionId: string
  success: boolean
  error?: string
  responseTime?: number
}

async function simulateRealUser(sessionId: string): Promise<TestResult> {
  const messages = [
    "Hey",
    "We're a 180-person fintech",
    "Budget $150K–$300K",
    "https://acme.com/platform",
    "Here's our dashboard", // triggers screen analysis
    "What do you think?",
    "Sounds good but expensive",
    "Who else would be involved?",
    "When can we jump on a call?",
    "Actually let's book it",
    "Thanks!",
    "Goodbye"
  ]

  const results: TestResult[] = []

  for (const msg of messages) {
    // Random human-like delay (2-6 seconds)
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 4000))

    const startTime = Date.now()
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: [{ role: 'user', content: msg }],
          intelligenceContext: { 
            company: { size: '201-1000' },
            person: { seniority: 'VP' },
            budget: { hasExplicit: true, minUsd: 150, maxUsd: 300 }
          }
        })
      })

      const responseTime = Date.now() - startTime
      const data = await response.json()

      if (response.ok && data.success) {
        results.push({
          sessionId,
          success: true,
          responseTime
        })
      } else {
        results.push({
          sessionId,
          success: false,
          error: data.error || `HTTP ${response.status}`,
          responseTime
        })
      }
    } catch (error) {
      results.push({
        sessionId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      })
    }
  }

  // Return aggregate result
  const successCount = results.filter(r => r.success).length
  const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length
  const errors = results.filter(r => !r.success).map(r => r.error).filter(Boolean) as string[]

  const result: TestResult = {
    sessionId,
    success: successCount === messages.length,
    responseTime: avgResponseTime
  }
  
  if (errors.length > 0) {
    result.error = errors.join('; ')
  }
  
  return result
}

async function runLoadTest() {
  console.log(`🚀 Launching ${CONCURRENT_USERS} concurrent users...`)
  console.log(`📡 API URL: ${API_URL}`)
  console.log(`📊 Messages per user: ${MESSAGES_PER_USER}`)
  console.log(`⏱️  Estimated duration: ~${Math.ceil((MESSAGES_PER_USER * 4) / 60)} minutes\n`)

  const start = Date.now()
  const sessionIds = Array.from({ length: CONCURRENT_USERS }, () => uuidv4())

  try {
    const results = await Promise.all(
      sessionIds.map(sessionId => simulateRealUser(sessionId))
    )

    const duration = (Date.now() - start) / 1000
    const successCount = results.filter(r => r.success).length
    const totalMessages = results.length * MESSAGES_PER_USER
    const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length
    const errors = results.filter(r => !r.success && r.error).map(r => r.error)

    console.log('\n' + '='.repeat(60))
    console.log('📈 LOAD TEST RESULTS')
    console.log('='.repeat(60))
    console.log(`✅ Successful users: ${successCount}/${CONCURRENT_USERS} (${((successCount / CONCURRENT_USERS) * 100).toFixed(1)}%)`)
    console.log(`📨 Total messages sent: ${totalMessages}`)
    console.log(`⏱️  Total duration: ${duration.toFixed(1)}s`)
    console.log(`⚡ Average response time: ${avgResponseTime.toFixed(0)}ms`)
    console.log(`❌ Errors: ${errors.length}`)
    
    if (errors.length > 0) {
      console.log('\n🔍 Error samples:')
      errors.slice(0, 5).forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`)
      })
    }

    console.log('\n' + '='.repeat(60))
    if (successCount === CONCURRENT_USERS) {
      console.log('🎉 System survived 100 concurrent users — READY FOR PRODUCTION')
    } else {
      console.log(`⚠️  System handled ${successCount} users successfully. Review errors above.`)
    }
    console.log('='.repeat(60) + '\n')
  } catch (error) {
    console.error('❌ Load test failed:', error)
    process.exit(1)
  }
}

// Run the test
runLoadTest().catch(console.error)

