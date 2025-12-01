// TODO: Import when hooks are imported (Phase 4+)
// import type { VoiceToolCall, ToolResult } from 'src/hooks/voice/voice-tool-types'
import type { ConversationFlowSnapshot } from 'src/types/conversation-flow'

// Temporary types until hooks are imported
export type VoiceToolCall = any
export type ToolResult = any

export type LiveServerEvent =
  | { type: 'connected'; payload: { connectionId: string } }
  | { type: 'start_ack'; payload: { connectionId: string } }
  | { type: 'session_started'; payload: { connectionId: string; languageCode?: string; voiceName?: string; mock?: boolean } }
  | { type: 'session_closed'; payload?: { reason?: string } }
  | { type: 'input_transcript'; payload: { text: string; isFinal?: boolean } }
  | { type: 'output_transcript'; payload: { text: string; isFinal?: boolean } }
  | { type: 'model_text'; payload: { text: string } }
  | { type: 'text'; payload: { content: string } }
  | { type: 'audio'; payload: { audioData: string; mimeType?: string } }
  | { type: 'heartbeat'; payload?: { timestamp: number } }
  | { type: 'turn_complete'; payload?: { turnComplete?: boolean } }
  | { type: 'setup_complete'; payload: { setupComplete: boolean } }
  | { type: 'interrupted'; payload: { interrupted: boolean } }
  | { type: 'tool_call'; payload: VoiceToolCall }
  | { type: 'tool_result'; payload: ToolResult }
  | { type: 'tool_call_cancellation'; payload: VoiceToolCall }
  | { type: 'stage_update'; payload: { stage: string; agent: string; flow?: ConversationFlowSnapshot | Record<string, unknown> } }
  | { type: 'error'; payload: { message: string; code?: string; detail?: unknown } }

export type LiveClientEventMap = {
  open: () => void
  close: (reason?: string) => void
  error: (message: string) => void
  connected: (connectionId: string) => void
  start_ack: (payload: { connectionId: string }) => void
  session_started: (data: { connectionId: string; languageCode?: string; voiceName?: string }) => void
  session_closed: (reason?: string) => void
  input_transcript: (text: string, isFinal: boolean) => void
  output_transcript: (text: string, isFinal: boolean) => void
  text: (content: string) => void
  audio: (base64Pcm16: string, mimeType?: string) => void
  heartbeat: (timestamp?: number) => void
  turn_complete: () => void
  setup_complete: () => void
  interrupted: () => void
  tool_call: (payload: VoiceToolCall) => void
  tool_result: (payload: ToolResult) => void
  stage_update: (payload: { stage: string; agent: string; flow?: ConversationFlowSnapshot | Record<string, unknown> }) => void
}
