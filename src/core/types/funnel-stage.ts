/**
 * Funnel Stage Types
 * 
 * Full funnel stages for comprehensive sales pipeline.
 * Expanded from v8 for complete agent routing support.
 */

export type FunnelStage =
  // Discovery & Qualification
  | 'DISCOVERY'              // Initial discovery, first 1-8 messages
  | 'QUALIFIED'              // Lead has been qualified, ready for pitch
  | 'SCORING'                // Lead scoring & fit calculation
  | 'INTELLIGENCE_GATHERING' // Gathering additional context
  
  // Pitching (differentiated by offering type)
  | 'WORKSHOP_PITCH'         // Workshop-specific pitch
  | 'CONSULTING_PITCH'       // Consulting-specific pitch
  | 'PITCHING'               // Generic pitch (fallback)
  
  // Proposal & Closing
  | 'PROPOSAL'               // Generating formal proposal
  | 'OBJECTION'              // Handling objections
  | 'CLOSING'                // Final push to close
  | 'BOOKING_REQUESTED'      // User requested calendar booking
  | 'BOOKED'                 // Calendar booking confirmed
  
  // Post-conversation
  | 'SUMMARY'                // End of conversation summary
  | 'RETARGETING'            // Re-engaging cold leads
  
  // Special
  | 'ADMIN'                  // Admin-only interactions
  | 'FORCE_EXIT';            // Forced exit after frustration

/**
 * Stage metadata for UI display
 */
export interface StageMetadata {
  id: FunnelStage;
  label: string;
  description: string;
  color: string;
  shape: string; // For canvas visualization
  order: number;
}

/**
 * Default stage progression order
 */
export const STAGE_ORDER: FunnelStage[] = [
  'DISCOVERY',
  'SCORING',
  'INTELLIGENCE_GATHERING',
  'WORKSHOP_PITCH',
  'CONSULTING_PITCH',
  'PROPOSAL',
  'OBJECTION',
  'CLOSING',
  'BOOKING_REQUESTED',
  'BOOKED',
  'SUMMARY',
];

/**
 * Get stage metadata for UI display
 */
export function getStageMetadata(stage: FunnelStage): StageMetadata {
  const metadata: Record<FunnelStage, StageMetadata> = {
    DISCOVERY: { id: 'DISCOVERY', label: 'Discovery', description: 'Understanding your needs', color: 'blue', shape: 'discovery', order: 1 },
    QUALIFIED: { id: 'QUALIFIED', label: 'Qualified', description: 'Lead qualified', color: 'green', shape: 'scoring', order: 2 },
    SCORING: { id: 'SCORING', label: 'Scoring', description: 'Evaluating fit', color: 'indigo', shape: 'scoring', order: 3 },
    INTELLIGENCE_GATHERING: { id: 'INTELLIGENCE_GATHERING', label: 'Research', description: 'Gathering context', color: 'violet', shape: 'brain', order: 3 },
    WORKSHOP_PITCH: { id: 'WORKSHOP_PITCH', label: 'Workshop', description: 'Workshop offering', color: 'purple', shape: 'workshop', order: 4 },
    CONSULTING_PITCH: { id: 'CONSULTING_PITCH', label: 'Consulting', description: 'Consulting offering', color: 'fuchsia', shape: 'consulting', order: 4 },
    PITCHING: { id: 'PITCHING', label: 'Pitching', description: 'Presenting solution', color: 'pink', shape: 'orb', order: 4 },
    PROPOSAL: { id: 'PROPOSAL', label: 'Proposal', description: 'Formal proposal', color: 'rose', shape: 'proposal', order: 5 },
    OBJECTION: { id: 'OBJECTION', label: 'Discussion', description: 'Addressing concerns', color: 'amber', shape: 'shield', order: 6 },
    CLOSING: { id: 'CLOSING', label: 'Closing', description: 'Final steps', color: 'orange', shape: 'closer', order: 7 },
    BOOKING_REQUESTED: { id: 'BOOKING_REQUESTED', label: 'Booking', description: 'Schedule meeting', color: 'green', shape: 'star', order: 8 },
    BOOKED: { id: 'BOOKED', label: 'Booked', description: 'Meeting scheduled', color: 'emerald', shape: 'heart', order: 9 },
    SUMMARY: { id: 'SUMMARY', label: 'Summary', description: 'Conversation complete', color: 'teal', shape: 'summary', order: 10 },
    RETARGETING: { id: 'RETARGETING', label: 'Follow-up', description: 'Re-engagement', color: 'cyan', shape: 'retargeting', order: 0 },
    ADMIN: { id: 'ADMIN', label: 'Admin', description: 'Admin mode', color: 'gray', shape: 'admin', order: 0 },
    FORCE_EXIT: { id: 'FORCE_EXIT', label: 'Exit', description: 'Session ended', color: 'red', shape: 'vortex', order: 0 },
  };
  return metadata[stage];
}

