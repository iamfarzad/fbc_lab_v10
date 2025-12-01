/**
 * Token Usage Logger - Stub
 * TODO: Implement token usage logging
 */

export interface TokenUsageEntry {
  timestamp: string
  model: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost: number
  session_id?: string
}

export async function getTokenUsageByDateRange(
  _startDate: Date,
  _endDate: Date,
  _model?: string
): Promise<TokenUsageEntry[]> {
  // Stub: Return empty array
  console.warn('getTokenUsageByDateRange() called but not implemented')
  return []
}

