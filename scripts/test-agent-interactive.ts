/**
 * Interactive Agent Testing Script
 * Type messages in terminal and see agent responses in real-time
 * Perfect for fine-tuning agent behavior
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { routeToAgent } from '../src/core/agents/orchestrator.js'
import { leadIntelligenceAgent } from '../src/core/agents/lead-intelligence-agent.js'
import { summaryAgent } from '../src/core/agents/summary-agent.js'
import { generatePdfWithPuppeteer, generatePdfPath } from '../src/core/pdf/generator.js'
import type { ChatMessage, FunnelStage } from '../src/core/agents/types.js'
import type { SummaryData } from '../src/core/pdf/utils/types.js'
import * as readline from 'readline'
import { writeFile } from 'fs/promises'
import { join } from 'path'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Conversation state
let messages: ChatMessage[] = []
let currentStage: FunnelStage = 'DISCOVERY'
let sessionId = `test-${Date.now()}`
let intelligenceContext: any = {} // Store research results here
let shouldExit = false // Only exit when /exit is used

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
}

function printHeader() {
  const hasIntel = Object.keys(intelligenceContext).length > 0
  const intelInfo = hasIntel 
    ? ` | Intel: ${intelligenceContext.name || intelligenceContext.email || 'Loaded'}` 
    : ''
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`)
  console.log(`${colors.bright}${colors.cyan}Agent Flow Tester${colors.reset}`)
  console.log(`${colors.dim}Session: ${sessionId} | Stage: ${currentStage}${intelInfo}${colors.reset}`)
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`)
}

function printHelp() {
  console.log(`\n${colors.yellow}Commands:${colors.reset}`)
  console.log(`  ${colors.green}/reset${colors.reset}        - Reset conversation`)
  console.log(`  ${colors.green}/stage <stage>${colors.reset} - Set stage (DISCOVERY, SCORING, etc.)`)
  console.log(`  ${colors.green}/history${colors.reset}       - Show conversation history`)
  console.log(`  ${colors.green}/agents${colors.reset}        - List all agents`)
  console.log(`  ${colors.green}/stages${colors.reset}       - List all stages`)
  console.log(`  ${colors.green}/intel${colors.reset}        - Show current intelligence context`)
  console.log(`\n${colors.yellow}Special Triggers (test specific agents):${colors.reset}`)
  console.log(`  ${colors.green}/admin${colors.reset}         - Test Admin Agent`)
  console.log(`  ${colors.green}/booking${colors.reset}       - Test Closer Agent (booking trigger)`)
  console.log(`  ${colors.green}/proposal${colors.reset}      - Test Proposal Agent`)
  console.log(`  ${colors.green}/retargeting${colors.reset}  - Test Retargeting Agent`)
  console.log(`  ${colors.green}/end${colors.reset}           - Test Summary Agent (conversation end)`)
  console.log(`  ${colors.green}/research <email> [name] [companyUrl]${colors.reset} - Test Lead Intelligence Agent (Google Grounded Search)`)
  console.log(`  ${colors.green}/pdf${colors.reset}           - Generate PDF summary from conversation`)
  console.log(`  ${colors.green}/prompts${colors.reset}       - View system prompts for all agents`)
  console.log(`\n  ${colors.green}/help${colors.reset}         - Show this help`)
  console.log(`  ${colors.green}/exit${colors.reset}         - Exit`)
  console.log(`\n${colors.dim}Type a message to test agent response...${colors.reset}\n`)
}

function printAgentResponse(result: any) {
  console.log(`\n${colors.blue}${'─'.repeat(60)}${colors.reset}`)
  console.log(`${colors.bright}${colors.green}Agent:${colors.reset} ${colors.bright}${result.agent}${colors.reset}`)
  console.log(`${colors.bright}${colors.magenta}Stage:${colors.reset} ${colors.bright}${result.metadata?.stage || currentStage}${colors.reset}`)
  
  if (result.metadata?.leadScore) {
    console.log(`${colors.bright}${colors.yellow}Lead Score:${colors.reset} ${result.metadata.leadScore}`)
  }
  
  if (result.metadata?.fitScore) {
    console.log(`${colors.bright}${colors.yellow}Fit Scores:${colors.reset} Workshop: ${result.metadata.fitScore.workshop?.toFixed(2) || 'N/A'}, Consulting: ${result.metadata.fitScore.consulting?.toFixed(2) || 'N/A'}`)
  }
  
  if (result.metadata?.tools && result.metadata.tools.length > 0) {
    console.log(`${colors.bright}${colors.cyan}Tools Used:${colors.reset} ${result.metadata.tools.map((t: any) => t.name).join(', ')}`)
  }
  
  console.log(`${colors.blue}${'─'.repeat(60)}${colors.reset}`)
  console.log(`${colors.white}${result.output}${colors.reset}`)
  console.log(`${colors.blue}${'─'.repeat(60)}${colors.reset}\n`)
  
  // Update current stage
  if (result.metadata?.stage) {
    currentStage = result.metadata.stage as FunnelStage
  }
}

async function processMessage(input: string) {
  input = input.trim()
  
  if (!input) return
  
  // Check for special trigger commands FIRST (before regular commands)
  let trigger: string | undefined = 'chat'
  let messageContent = input
  
  if (input.startsWith('/admin')) {
    trigger = 'admin'
    messageContent = input.replace('/admin', '').trim() || 'Show me analytics'
  } else if (input.startsWith('/booking')) {
    trigger = 'booking'
    messageContent = input.replace('/booking', '').trim() || 'I want to book a meeting'
  } else if (input.startsWith('/proposal')) {
    trigger = 'proposal_request'
    messageContent = input.replace('/proposal', '').trim() || 'Can you send me a proposal?'
  } else if (input.startsWith('/retargeting')) {
    trigger = 'retargeting'
    messageContent = input.replace('/retargeting', '').trim() || 'Follow up email'
  } else if (input.startsWith('/end')) {
    trigger = 'conversation_end'
    messageContent = input.replace('/end', '').trim() || 'Thanks, bye'
  }
  
  // If it's a trigger command, process it as a message (skip command handler)
  if (trigger !== 'chat') {
    messages.push({ role: 'user', content: messageContent })
    console.log(`${colors.dim}Processing... (trigger: ${trigger})${colors.reset}`)
    
    try {
      const result = await routeToAgent({
        messages,
        sessionId,
        currentStage,
        intelligenceContext: intelligenceContext,
        multimodalContext: {
          hasRecentImages: false,
          hasRecentAudio: false,
          hasRecentUploads: false,
          recentAnalyses: [],
          recentUploads: []
        },
        trigger,
        thinkingLevel: 'low',
        conversationFlow: {
          covered: {
            goals: messages.length > 2,
            pain: messages.length > 2,
            data: false,
            readiness: false,
            budget: false,
            success: false
          },
          totalUserTurns: messages.filter(m => m.role === 'user').length
        }
      })
      
      messages.push({ role: 'assistant', content: result.output })
      printAgentResponse(result)
      
    } catch (error) {
      console.error(`\n${colors.red}Error:${colors.reset} ${error instanceof Error ? error.message : String(error)}\n`)
    }
    return
  }
  
  // Handle regular commands
  if (input.startsWith('/')) {
    const [cmd, ...args] = input.slice(1).split(' ')
    
    switch (cmd) {
      case 'reset':
        messages = []
        currentStage = 'DISCOVERY'
        sessionId = `test-${Date.now()}`
        intelligenceContext = {}
        console.log(`${colors.green}OK: conversation reset${colors.reset}\n`)
        return
        
      case 'stage':
        if (args[0]) {
          currentStage = args[0] as FunnelStage
          console.log(`${colors.green}OK: stage set to: ${currentStage}${colors.reset}\n`)
        } else {
          console.log(`${colors.red}ERR: usage: /stage <STAGE_NAME>${colors.reset}\n`)
        }
        return
        
      case 'history':
        console.log(`\n${colors.cyan}Conversation History:${colors.reset}`)
        messages.forEach((msg, i) => {
          const role = msg.role === 'user' ? colors.green : colors.blue
          console.log(`  ${i + 1}. [${role}${msg.role}${colors.reset}]: ${msg.content.substring(0, 80)}${msg.content.length > 80 ? '...' : ''}`)
        })
        console.log('')
        return
        
      case 'intel':
        console.log(`\n${colors.cyan}Intelligence Context:${colors.reset}`)
        if (Object.keys(intelligenceContext).length === 0) {
          console.log(`  ${colors.dim}No intelligence context loaded. Use /research to gather data.${colors.reset}\n`)
        } else {
          console.log(`  ${colors.yellow}Email:${colors.reset} ${intelligenceContext.email || 'N/A'}`)
          console.log(`  ${colors.yellow}Name:${colors.reset} ${intelligenceContext.name || 'N/A'}`)
          if (intelligenceContext.company) {
            console.log(`  ${colors.yellow}Company:${colors.reset} ${intelligenceContext.company.name || 'N/A'}`)
            console.log(`  ${colors.yellow}Industry:${colors.reset} ${intelligenceContext.company.industry || 'N/A'}`)
            console.log(`  ${colors.yellow}Size:${colors.reset} ${intelligenceContext.company.size || 'N/A'}`)
          }
          if (intelligenceContext.role) {
            console.log(`  ${colors.yellow}Role:${colors.reset} ${intelligenceContext.role}`)
          }
          if (intelligenceContext.fitScore) {
            console.log(`  ${colors.yellow}Fit Scores:${colors.reset} Workshop: ${(intelligenceContext.fitScore.workshop * 100).toFixed(0)}%, Consulting: ${(intelligenceContext.fitScore.consulting * 100).toFixed(0)}%`)
          }
          console.log('')
        }
        return
        
      case 'agents':
        console.log(`\n${colors.cyan}Available Agents:${colors.reset}`)
        console.log(`  ${colors.green}Core Pipeline:${colors.reset}`)
        console.log(`    1. Discovery Agent (DISCOVERY stage)`)
        console.log(`    2. Scoring Agent (SCORING stage)`)
        console.log(`    3. Pitch Agent (PITCHING, WORKSHOP_PITCH, CONSULTING_PITCH)`)
        console.log(`    4. Objection Agent (OBJECTION stage or auto-detected)`)
        console.log(`    5. Proposal Agent (PROPOSAL stage or /proposal trigger)`)
        console.log(`    6. Closer Agent (CLOSING, BOOKING_REQUESTED, BOOKED or /booking trigger)`)
        console.log(`    7. Summary Agent (SUMMARY stage or /end trigger)`)
        console.log(`  ${colors.yellow}Special Agents:${colors.reset}`)
        console.log(`    8. Admin Agent (/admin trigger)`)
        console.log(`    9. Retargeting Agent (/retargeting trigger)`)
        console.log(`    10. Lead Intelligence Agent (/research command - Google Grounded Search)`)
        console.log('')
        return
        
      case 'research':
        if (!args[0]) {
          console.log(`${colors.red}ERR: usage: /research <email> [name] [companyUrl]${colors.reset}`)
          console.log(`${colors.dim}Example: /research john@example.com "John Doe" https://example.com${colors.reset}\n`)
          return
        }
        
        // Parse arguments - handle quoted strings properly
        let email = args[0]
        let name: string | undefined = undefined
        let companyUrl: string | undefined = undefined
        
        // If email doesn't contain @, it's probably the name and email is in args[1]
        if (!email.includes('@') && args[1] && args[1].includes('@')) {
          name = email
          email = args[1]
          companyUrl = args[2] || undefined
        } else {
          name = args[1] || undefined
          companyUrl = args[2] || undefined
        }
        
        // Remove quotes if present
        email = email.replace(/^["']|["']$/g, '')
        if (name) name = name.replace(/^["']|["']$/g, '')
        if (companyUrl) companyUrl = companyUrl.replace(/^["']|["']$/g, '')
        
        console.log(`${colors.dim}Starting Lead Intelligence research...${colors.reset}`)
        console.log(`${colors.dim}   Email: ${email}${colors.reset}`)
        if (name) console.log(`${colors.dim}   Name: ${name}${colors.reset}`)
        if (companyUrl) console.log(`${colors.dim}   Company URL: ${companyUrl}${colors.reset}`)
        console.log(`${colors.dim}   Using Google Grounded Search...${colors.reset}\n`)
        
        try {
          const result = await leadIntelligenceAgent({
            email,
            name,
            companyUrl,
            sessionId
          })
          
          console.log(`\n${colors.blue}${'─'.repeat(60)}${colors.reset}`)
          console.log(`${colors.bright}${colors.green}Agent:${colors.reset} ${colors.bright}${result.agent}${colors.reset}`)
          console.log(`${colors.bright}${colors.magenta}Stage:${colors.reset} ${colors.bright}${result.metadata?.stage || 'INTELLIGENCE_GATHERING'}${colors.reset}`)
          
          if (result.metadata?.research) {
            const research = result.metadata.research as any
            console.log(`\n${colors.bright}${colors.cyan}Research Results:${colors.reset}`)
            console.log(`  ${colors.yellow}Company:${colors.reset} ${research.company?.name || 'Unknown'}`)
            console.log(`  ${colors.yellow}Industry:${colors.reset} ${research.company?.industry || 'Unknown'}`)
            console.log(`  ${colors.yellow}Size:${colors.reset} ${research.company?.size || 'Unknown'}`)
            console.log(`  ${colors.yellow}Person:${colors.reset} ${research.person?.fullName || name || 'Unknown'}`)
            console.log(`  ${colors.yellow}Role:${colors.reset} ${research.role || 'Unknown'}`)
            console.log(`  ${colors.yellow}Seniority:${colors.reset} ${research.person?.seniority || 'Unknown'}`)
            console.log(`  ${colors.yellow}Confidence:${colors.reset} ${((research.confidence || 0) * 100).toFixed(0)}%`)
            
            if (result.metadata?.fitScore) {
              console.log(`  ${colors.yellow}Fit Scores:${colors.reset} Workshop: ${(result.metadata.fitScore.workshop * 100).toFixed(0)}%, Consulting: ${(result.metadata.fitScore.consulting * 100).toFixed(0)}%`)
            }
            
            if (research.citations && research.citations.length > 0) {
              console.log(`  ${colors.yellow}Sources Found:${colors.reset} ${research.citations.length}`)
              research.citations.slice(0, 3).forEach((cite: any, i: number) => {
                console.log(`    ${i + 1}. ${cite.title || cite.uri}`)
              })
            }
            
            if (research.strategic) {
              console.log(`  ${colors.yellow}Strategic Insights:${colors.reset}`)
              if (research.strategic.competitors?.length > 0) {
                console.log(`    Competitors: ${research.strategic.competitors.slice(0, 3).join(', ')}`)
              }
              if (research.strategic.pain_points?.length > 0) {
                console.log(`    Pain Points: ${research.strategic.pain_points.slice(0, 2).join(', ')}`)
              }
            }
          }
          
          if (result.metadata?.chainOfThought?.steps) {
            console.log(`\n${colors.bright}${colors.cyan}Research Steps:${colors.reset}`)
            result.metadata.chainOfThought.steps.forEach((step: any, i: number) => {
              const status = step.status === 'complete' ? 'DONE' : step.status === 'active' ? 'ACTIVE' : 'PENDING'
              const color = step.status === 'complete' ? colors.green : step.status === 'active' ? colors.yellow : colors.dim
              console.log(`  ${color}${status}${colors.reset} ${step.label}${step.description ? ` - ${step.description}` : ''}`)
            })
          }
          
          console.log(`${colors.blue}${'─'.repeat(60)}${colors.reset}\n`)
          
          // Store research results in intelligence context for use in conversations
          if (result.metadata?.research) {
            const research = result.metadata.research as any
            intelligenceContext = {
              email: email,
              name: name || research.person?.fullName,
              company: research.company,
              person: research.person,
              role: research.role,
              fitScore: result.metadata.fitScore,
              leadScore: research.leadScore,
              researchConfidence: research.confidence
            }
            console.log(`${colors.green}OK: intelligence context updated (used in conversations)${colors.reset}\n`)
          }
          
        } catch (error) {
          console.error(`\n${colors.red}Error:${colors.reset} ${error instanceof Error ? error.message : String(error)}\n`)
        }
        return
        
      case 'stages':
        console.log(`\n${colors.cyan}Available Stages:${colors.reset}`)
        const stages = [
          'DISCOVERY', 'SCORING', 'QUALIFIED', 'INTELLIGENCE_GATHERING',
          'WORKSHOP_PITCH', 'CONSULTING_PITCH', 'PITCHING',
          'PROPOSAL', 'OBJECTION', 'CLOSING',
          'BOOKING_REQUESTED', 'BOOKED', 'SUMMARY', 'RETARGETING', 'ADMIN', 'FORCE_EXIT'
        ]
        stages.forEach((stage, i) => {
          console.log(`  ${i + 1}. ${stage}`)
        })
        console.log('')
        return
        
      case 'pdf':
        if (messages.length === 0) {
          console.log(`${colors.red}ERR: no conversation to summarize. Have a conversation first.${colors.reset}\n`)
          return
        }
        
        console.log(`${colors.dim}Generating PDF summary...${colors.reset}`)
        console.log(`${colors.dim}   Messages: ${messages.length}${colors.reset}`)
        console.log(`${colors.dim}   Session: ${sessionId}${colors.reset}\n`)
        
        try {
          // Call summary agent to get summary JSON
          const summaryResult = await summaryAgent(messages, {
            sessionId,
            intelligenceContext: intelligenceContext,
            conversationFlow: {
              covered: {
                goals: messages.length > 2,
                pain: messages.length > 2,
                data: false,
                readiness: false,
                budget: false,
                success: false
              },
              totalUserTurns: messages.filter(m => m.role === 'user').length
            },
            multimodalContext: {
              hasRecentImages: false,
              hasRecentAudio: false,
              hasRecentUploads: false,
              recentAnalyses: [],
              recentUploads: []
            }
          })
          
          // Parse summary JSON
          let summaryJson: any
          try {
            summaryJson = JSON.parse(summaryResult.output)
          } catch {
            console.log(`${colors.yellow}WARN: summary agent returned non-JSON, using fallback${colors.reset}`)
            summaryJson = {
              executiveSummary: summaryResult.output.substring(0, 200),
              keyFindings: {},
              recommendedSolution: 'workshop'
            }
          }
          
          // Build SummaryData from conversation and summary
          const leadName = intelligenceContext?.name || intelligenceContext?.person?.fullName || 'Lead'
          const leadEmail = intelligenceContext?.email || 'unknown@example.com'
          
          const summaryData: SummaryData = {
            leadInfo: {
              name: leadName,
              email: leadEmail,
              company: intelligenceContext?.company?.name,
              role: intelligenceContext?.role || intelligenceContext?.person?.role
            },
            conversationHistory: messages.map((msg, i) => ({
              role: msg.role,
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
              timestamp: new Date(Date.now() - (messages.length - i) * 60000).toISOString()
            })),
            leadResearch: {
              conversation_summary: summaryJson.executiveSummary || summaryResult.output,
              consultant_brief: summaryJson.solutionRationale || '',
              lead_score: intelligenceContext?.leadScore,
              ai_capabilities_shown: summaryJson.multimodalInteractionSummary?.engagementScore || 'Medium'
            },
            sessionId,
            proposal: summaryJson.recommendedSolution ? {
              recommendedSolution: summaryJson.recommendedSolution,
              pricingBallpark: summaryJson.pricingBallpark,
              solutionRationale: summaryJson.solutionRationale,
              expectedROI: summaryJson.expectedROI,
              nextSteps: summaryJson.nextSteps
            } : undefined,
            multimodalContext: {
              visualAnalyses: [],
              voiceTranscripts: [],
              uploadedFiles: [],
              summary: {
                totalMessages: messages.length,
                modalitiesUsed: [],
                recentVisualAnalyses: 0,
                recentAudioEntries: 0,
                recentUploads: 0
              }
            }
          }
          
          // Generate PDF - save to current directory for easy access
          const sanitizedName = (leadName || 'Lead').replace(/[^a-zA-Z0-9]/g, '_')
          const timestamp = new Date().toISOString().split('T')[0]
          const pdfFilename = `FB-c_Summary_${sanitizedName}_${timestamp}_${sessionId}.pdf`
          const fullPath = join(process.cwd(), pdfFilename)
          
          console.log(`${colors.dim}   Generating PDF...${colors.reset}`)
          const pdfBuffer = await generatePdfWithPuppeteer(summaryData, fullPath, 'client', 'en')
          
          // Save PDF
          await writeFile(fullPath, pdfBuffer)
          
          console.log(`\n${colors.blue}${'─'.repeat(60)}${colors.reset}`)
          console.log(`${colors.bright}${colors.green}OK: PDF summary generated${colors.reset}`)
          console.log(`${colors.bright}${colors.cyan}File:${colors.reset} ${fullPath}`)
          console.log(`${colors.bright}${colors.cyan}Size:${colors.reset} ${(pdfBuffer.length / 1024).toFixed(2)} KB`)
          console.log(`${colors.bright}${colors.cyan}Summary:${colors.reset} ${summaryJson.executiveSummary?.substring(0, 100) || 'N/A'}...`)
          if (summaryJson.recommendedSolution) {
            console.log(`${colors.bright}${colors.yellow}Recommended:${colors.reset} ${summaryJson.recommendedSolution}`)
          }
          console.log(`${colors.blue}${'─'.repeat(60)}${colors.reset}\n`)
          
        } catch (error) {
          console.error(`\n${colors.red}Error generating PDF:${colors.reset} ${error instanceof Error ? error.message : String(error)}\n`)
        }
        return
        
      case 'prompts':
        console.log(`\n${colors.cyan}System Prompts for All Agents:${colors.reset}\n`)
        
        console.log(`${colors.bright}${colors.green}1. Discovery Agent${colors.reset}`)
        console.log(`${colors.dim}   File: src/core/agents/discovery-agent.ts${colors.reset}`)
        console.log(`   ${colors.yellow}Identity:${colors.reset} F.B/c Discovery AI - laidback, sharp consultant`)
        console.log(`   ${colors.yellow}Key Rules:${colors.reset}`)
        console.log(`     - Be conversational, friendly, relaxed`)
        console.log(`     - Handle off-topic questions gracefully`)
        console.log(`     - Only use company name/role when the user explicitly confirms them`)
        console.log(`     - Detect and acknowledge user corrections`)
        console.log(`     - Cover 6 categories: goals, pain, data, readiness, budget, success\n`)
        
        console.log(`${colors.bright}${colors.green}2. Scoring Agent${colors.reset}`)
        console.log(`${colors.dim}   File: src/core/agents/scoring-agent.ts${colors.reset}`)
        console.log(`   ${colors.yellow}Identity:${colors.reset} F.B/c Scoring AI - calculate lead scores`)
        console.log(`   ${colors.yellow}Output:${colors.reset} Lead score (0-100), Workshop fit (0-1), Consulting fit (0-1)\n`)
        
        console.log(`${colors.bright}${colors.green}3. Pitch Agent${colors.reset}`)
        console.log(`${colors.dim}   File: src/core/agents/pitch-agent.ts${colors.reset}`)
        console.log(`   ${colors.yellow}Identity:${colors.reset} Elite AI sales closer`)
        console.log(`   ${colors.yellow}Key Rules:${colors.reset}`)
        console.log(`     - Auto-detects workshop vs consulting based on fit scores`)
        console.log(`     - Uses calculated ROI (never makes up numbers)`)
        console.log(`     - References multimodal experience as social proof`)
        console.log(`     - Creates urgency, removes friction\n`)
        
        console.log(`${colors.bright}${colors.green}4. Objection Agent${colors.reset}`)
        console.log(`${colors.dim}   File: src/core/agents/objection-agent.ts${colors.reset}`)
        console.log(`   ${colors.yellow}Identity:${colors.reset} Micro-agent for handling objections`)
        console.log(`   ${colors.yellow}Types:${colors.reset} price, timing, authority, need, trust`)
        console.log(`   ${colors.yellow}Activation:${colors.reset} Only when confidence > 0.6\n`)
        
        console.log(`${colors.bright}${colors.green}5. Proposal Agent${colors.reset}`)
        console.log(`${colors.dim}   File: src/core/agents/proposal-agent.ts${colors.reset}`)
        console.log(`   ${colors.yellow}Identity:${colors.reset} Generates formal consulting proposals`)
        console.log(`   ${colors.yellow}Output:${colors.reset} Structured JSON (executive summary, scope, timeline, investment, ROI)\n`)
        
        console.log(`${colors.bright}${colors.green}6. Closer Agent${colors.reset}`)
        console.log(`${colors.dim}   File: src/core/agents/closer-agent.ts${colors.reset}`)
        console.log(`   ${colors.yellow}Identity:${colors.reset} F.B/c Closer AI - close the deal`)
        console.log(`   ${colors.yellow}Tools:${colors.reset} calculate_roi, create_chart, create_calendar_widget`)
        console.log(`   ${colors.yellow}Key Rules:${colors.reset}`)
        console.log(`     - Reference multimodal experience`)
        console.log(`     - Create urgency, remove friction`)
        console.log(`     - Use tools for ROI discussions\n`)
        
        console.log(`${colors.bright}${colors.green}7. Summary Agent${colors.reset}`)
        console.log(`${colors.dim}   File: src/core/agents/summary-agent.ts${colors.reset}`)
        console.log(`   ${colors.yellow}Identity:${colors.reset} F.B/c Summary AI - create executive summaries`)
        console.log(`   ${colors.yellow}Output:${colors.reset} Structured JSON for PDF generation`)
        console.log(`   ${colors.yellow}Includes:${colors.reset} Executive summary, key findings, recommended solution, ROI, next steps\n`)
        
        console.log(`${colors.bright}${colors.green}8. Admin Agent${colors.reset}`)
        console.log(`${colors.dim}   File: src/core/agents/admin-agent.ts${colors.reset}`)
        console.log(`   ${colors.yellow}Identity:${colors.reset} F.B/c Agent - Jarvis meets Elon Musk`)
        console.log(`   ${colors.yellow}Personality:${colors.reset} Sophisticated, technically sharp, laid-back`)
        console.log(`   ${colors.yellow}Tools:${colors.reset} Lead search, email drafting, performance analysis, Google grounding search\n`)
        
        console.log(`${colors.bright}${colors.green}9. Retargeting Agent${colors.reset}`)
        console.log(`${colors.dim}   File: src/core/agents/retargeting-agent.ts${colors.reset}`)
        console.log(`   ${colors.yellow}Identity:${colors.reset} F.B/c Retargeting AI - generate follow-up emails`)
        console.log(`   ${colors.yellow}Scenarios:${colors.reset} email_failed, no_booking_high_score, no_booking_low_score, proposal_sent\n`)
        
        console.log(`${colors.bright}${colors.green}10. Lead Intelligence Agent${colors.reset}`)
        console.log(`${colors.dim}   File: src/core/agents/lead-intelligence-agent.ts${colors.reset}`)
        console.log(`   ${colors.yellow}Identity:${colors.reset} Background research worker`)
        console.log(`   ${colors.yellow}Purpose:${colors.reset} Research leads using Google Grounded Search`)
        console.log(`   ${colors.yellow}Output:${colors.reset} Intelligence context with company, person, strategic data\n`)
        
        console.log(`${colors.dim}Note: All prompts are dynamically built with context (intelligence, conversation flow, multimodal data)${colors.reset}\n`)
        return
        
      case 'help':
        printHelp()
        return
        
      case 'exit':
        shouldExit = true
        console.log(`${colors.yellow}Goodbye!${colors.reset}\n`)
        rl.close()
        return
        
      default:
        console.log(`${colors.red}Unknown command: ${cmd}. Type /help for commands.${colors.reset}\n`)
        return
    }
  }
  
  // Regular message (not a command or trigger)
  messages.push({ role: 'user', content: input })
  
  console.log(`${colors.dim}Processing...${colors.reset}`)
  
  try {
    const result = await routeToAgent({
      messages,
      sessionId,
      currentStage,
      intelligenceContext: intelligenceContext, // Use stored research results
      multimodalContext: {
        hasRecentImages: false,
        hasRecentAudio: false,
        hasRecentUploads: false,
        recentAnalyses: [],
        recentUploads: []
      },
      trigger: 'chat',
      thinkingLevel: 'low',
      conversationFlow: {
        covered: {
          goals: messages.length > 2,
          pain: messages.length > 2,
          data: false,
          readiness: false,
          budget: false,
          success: false
        },
        totalUserTurns: messages.filter(m => m.role === 'user').length
      }
    })
    
    // Add assistant response
    messages.push({ role: 'assistant', content: result.output })
    
    printAgentResponse(result)
    
  } catch (error) {
    console.error(`\n${colors.red}Error:${colors.reset} ${error instanceof Error ? error.message : String(error)}\n`)
  }
}

async function main() {
  printHeader()
  printHelp()
  
  rl.setPrompt(`${colors.green}>${colors.reset} `)
  rl.prompt()

  // Ensure inputs are processed sequentially (important for piped tests).
  let processing: Promise<void> = Promise.resolve()
  
  rl.on('line', (input) => {
    processing = processing
      .then(() => processMessage(input))
      .then(() => {
        if (!(rl as any).closed && process.stdin.isTTY) {
          rl.prompt()
        }
      })
      .catch((err) => {
        console.error(`${colors.red}Unhandled error:${colors.reset}`, err)
        if (!(rl as any).closed && process.stdin.isTTY) {
          rl.prompt()
        }
      })
  })
  
  rl.on('close', async () => {
    try {
      await processing
    } catch {
      // already logged
    }
    if (shouldExit) {
      process.exit(0)
    }
    if (!process.stdin.isTTY) {
      process.exit(0)
    }
    console.log(`${colors.dim}Input closed. Use /exit to terminate.${colors.reset}\n`)
  })
}

main().catch(console.error)
