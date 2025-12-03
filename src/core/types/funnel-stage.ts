/**
 * Funnel Stage Types
 * 
 * Simplified funnel stages for the 2026 architecture.
 * Collapsed from 12 stages to 7 intelligent stages.
 */

export type FunnelStage =
  | 'DISCOVERY'     // First 1–8 messages
  | 'QUALIFIED'     // We have size + budget + authority + (URL or strong signals)
  | 'PITCHING'      // Active pitch (auto-detects workshop vs consulting)
  | 'OBJECTION'     // Objection detected → micro-agent
  | 'CLOSING'       // High interest → final push
  | 'BOOKED'        // Calendar used
  | 'SUMMARY';      // Conversation ended

