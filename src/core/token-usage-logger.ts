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

  // Aggregate by date
  const aggregated = data.reduce((acc, curr) => {
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
      acc[key] = {
        timestamp: new Date(dateStr).toISOString(),
        model: curr.model,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        cost: 0,
        session_id: curr.session_id
      }
    }

    acc[key].input_tokens += curr.input_tokens
    acc[key].output_tokens += curr.output_tokens
    // Handle potentially null total_tokens
    acc[key].total_tokens += (curr.total_tokens ?? (curr.input_tokens + curr.output_tokens))
    acc[key].cost += Number(curr.cost)

    return acc
  }, {} as Record<string, TokenUsageEntry>)

  return Object.values(aggregated).sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}
