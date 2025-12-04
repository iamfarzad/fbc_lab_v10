import { supabaseService } from './supabase/client.js'

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
  startDate: Date,
  endDate: Date,
  model?: string
): Promise<TokenUsageEntry[]> {
  let query = supabaseService
    .from('token_usage_log')
    .select('timestamp, model, input_tokens, output_tokens, total_tokens, cost, session_id')
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())

  if (model) {
    query = query.eq('model', model)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching token usage:', error)
  return []
}

  if (!data) return []

  // Type the raw data from Supabase
  type RawEntry = {
    timestamp: string
    model: string
    input_tokens: number
    output_tokens: number
    total_tokens: number | null
    cost: number
    session_id?: string
  }

  // Aggregate by date
  const aggregated = (data as RawEntry[]).reduce((acc: Record<string, TokenUsageEntry>, curr: RawEntry) => {
    // Use local date string for aggregation bucket
    // Handle undefined timestamp if necessary
    const timestamp = curr.timestamp || new Date().toISOString()
    const dateStr = new Date(timestamp).toISOString().split('T')[0] // YYYY-MM-DD
    if (!dateStr) {
      // Skip if date parsing fails
      return acc
    }
    const key = `${dateStr}_${curr.model}`

    if (!acc[key]) {
      const entry: TokenUsageEntry = {
        timestamp: new Date(dateStr).toISOString(),
        model: curr.model,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        cost: 0
      }
      // Only add session_id if it exists
      if (curr.session_id) {
        entry.session_id = curr.session_id
      }
      acc[key] = entry
    }

    const entry = acc[key]!
    entry.input_tokens += curr.input_tokens
    entry.output_tokens += curr.output_tokens
    // Handle potentially null total_tokens
    entry.total_tokens += (curr.total_tokens ?? (curr.input_tokens + curr.output_tokens))
    entry.cost += Number(curr.cost)

    return acc
  }, {} as Record<string, TokenUsageEntry>)

  const result: TokenUsageEntry[] = Object.values(aggregated)
  return result.sort((a: TokenUsageEntry, b: TokenUsageEntry) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}
