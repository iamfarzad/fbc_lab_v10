export const SHARED_TOOL_NAMES = [
  'extract_action_items',
  'generate_summary_preview',
  'calculate_roi',
  'draft_follow_up_email',
  'generate_proposal_draft'
] as const

export type SharedToolName = typeof SHARED_TOOL_NAMES[number]

export function isSharedToolName(value: unknown): value is SharedToolName {
  return typeof value === 'string' && (SHARED_TOOL_NAMES as readonly string[]).includes(value)
}
