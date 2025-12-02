#!/usr/bin/env node

/**
 * Real-time log monitoring script
 * Watches and tails all JSONL log files in logs/live/
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOGS_DIR = path.resolve(__dirname, '..', 'logs', 'live')
const POLL_INTERVAL = 500 // Poll every 500ms
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
}

const args = process.argv.slice(2)
const sessionId = args.find(arg => arg.startsWith('--session='))?.split('=')[1]
const filterEvent = args.find(arg => arg.startsWith('--event='))?.split('=')[1]
const filterError = args.includes('--errors') || args.includes('-e')

const watchedFiles = new Map()

function formatTimestamp(ts) {
  const date = new Date(ts)
  return date.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  })
}

function formatEvent(event) {
  const eventColors = {
    connected: '\x1b[32m',
    disconnected: '\x1b[31m',
    error: '\x1b[31m',
    session_started: '\x1b[36m',
    session_ready: '\x1b[36m',
    realtime_input_sent: '\x1b[33m',
    realtime_output_received: '\x1b[35m',
    conversation_message: '\x1b[34m',
    default: '\x1b[37m'
  }
  return (eventColors[event] || eventColors.default) + event + '\x1b[0m'
}

function formatLogEntry(entry) {
  try {
    const data = JSON.parse(entry)
    const { ts, event, connectionId, data: eventData } = data
    
    // Filter by session if specified
    if (sessionId && connectionId !== sessionId) return null
    
    // Filter by event type if specified
    if (filterEvent && event !== filterEvent) return null
    
    // Filter errors if requested
    if (filterError && !event.toLowerCase().includes('error')) return null
    
    const timestamp = formatTimestamp(ts)
    const eventColored = formatEvent(event)
    const connId = connectionId ? connectionId.substring(0, 8) : 'unknown'
    
    let output = `${colors.dim}[${timestamp}]${colors.reset} ${eventColored}`
    output += ` ${colors.dim}(${connId})${colors.reset}`
    
    if (eventData) {
      const dataStr = JSON.stringify(eventData, null, 2)
      if (dataStr.length > 200) {
        output += `\n${colors.dim}${dataStr.substring(0, 200)}...${colors.reset}`
      } else {
        output += `\n${colors.dim}${dataStr}${colors.reset}`
      }
    }
    
    return output
  } catch (err) {
    return `${colors.red}[PARSE ERROR]${colors.reset} ${entry}`
  }
}

function readNewLines(filePath) {
  const info = watchedFiles.get(filePath)
  if (!info) return
  
  try {
    const stats = fs.statSync(filePath)
    
    if (stats.size > info.position) {
      const fd = fs.openSync(filePath, 'r')
      const buffer = Buffer.alloc(stats.size - info.position)
      fs.readSync(fd, buffer, 0, buffer.length, info.position)
      fs.closeSync(fd)
      
      const newContent = buffer.toString()
      const lines = newContent.split('\n')
      
      lines.forEach(line => {
        if (line.trim()) {
          const formatted = formatLogEntry(line)
          if (formatted) {
            console.log(formatted)
          }
        }
      })
      
      info.position = stats.size
    }
  } catch (err) {
    // File might have been deleted or is being written to
    if (err.code !== 'ENOENT') {
      // Ignore other errors during read
    }
  }
}

function scanForNewFiles() {
  if (!fs.existsSync(LOGS_DIR)) return
  
  try {
    const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.jsonl'))
    
    files.forEach(file => {
      const filePath = path.join(LOGS_DIR, file)
      const connectionId = path.basename(file, '.jsonl')
      
      if (!watchedFiles.has(filePath)) {
        const stats = fs.statSync(filePath)
        watchedFiles.set(filePath, {
          connectionId,
          position: stats.size // Start from end for existing files
        })
        console.log(`${colors.green}Started watching: ${file}${colors.reset}`)
      }
    })
    
    // Remove files that no longer exist
    for (const [filePath] of watchedFiles.entries()) {
      if (!fs.existsSync(filePath)) {
        watchedFiles.delete(filePath)
      }
    }
  } catch (err) {
    // Ignore directory read errors
  }
}

function pollFiles() {
  scanForNewFiles()
  
  for (const [filePath] of watchedFiles.entries()) {
    readNewLines(filePath)
  }
}

async function watchDirectory() {
  if (!fs.existsSync(LOGS_DIR)) {
    console.log(`${colors.yellow}Logs directory doesn't exist yet: ${LOGS_DIR}${colors.reset}`)
    console.log(`${colors.dim}Creating directory and waiting for logs...${colors.reset}\n`)
    fs.mkdirSync(LOGS_DIR, { recursive: true })
  }
  
  console.log(`${colors.bright}=== Real-time Log Monitor ===${colors.reset}`)
  console.log(`${colors.dim}Watching: ${LOGS_DIR}${colors.reset}`)
  if (sessionId) console.log(`${colors.dim}Session filter: ${sessionId}${colors.reset}`)
  if (filterEvent) console.log(`${colors.dim}Event filter: ${filterEvent}${colors.reset}`)
  if (filterError) console.log(`${colors.dim}Errors only${colors.reset}`)
  console.log(`${colors.dim}Press Ctrl+C to stop${colors.reset}\n`)
  
  // Initial scan
  scanForNewFiles()
  
  // Poll for changes
  setInterval(pollFiles, POLL_INTERVAL)
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.dim}Stopping log monitor...${colors.reset}`)
  process.exit(0)
})

// Start monitoring
watchDirectory().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err)
  process.exit(1)
})

// Keep process alive
process.stdin.resume()

