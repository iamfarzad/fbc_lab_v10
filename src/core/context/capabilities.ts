import { getSupabaseService } from 'src/lib/supabase'
import { toJson } from 'src/types/json-guards'
import type { Json } from 'src/core/database.types'
import { contextStorage } from './context-storage'

/**
 * Records first-time capability usage for a session by calling the DB RPC
 * append_capability_if_missing(session_id, capability). This dedupes and
 * updates conversation_contexts.ai_capabilities_shown, and logs to
 * capability_usage_log per your Supabase setup.
 * If the RPC is missing (older DB), falls back to legacy upsert pattern.
 * 
 * @param sessionId - Session ID
 * @param capabilityName - Name of the capability being used
 * @param usageData - Optional usage data to attach
 * @param agent - Optional agent name (e.g., "Discovery", "Summary"). If not provided, will fetch from conversation_contexts.last_agent
 */
export async function recordCapabilityUsed(
  sessionId: string, 
  capabilityName: string, 
  usageData?: unknown,
  agent?: string | null
) {
  const supabaseClient = getSupabaseService()
  if (!supabaseClient) {
    console.warn('[capabilities] Supabase not available, cannot record capability usage')
    return
  }
  
  // Get agent if not provided
  let resolvedAgent = agent
  if (resolvedAgent === undefined && sessionId && sessionId !== 'anonymous') {
    try {
      const context = await contextStorage.get(sessionId)
      resolvedAgent = context?.last_agent || null
    } catch (error) {
      console.warn(`[capabilities] Failed to fetch agent for session ${sessionId}`, error)
    }
  }
  
  try {
    // Preferred path: server-side RPC handles dedupe + logging
    const { error: rpcError } = await supabaseClient.rpc('append_capability_if_missing', {
      p_session_id: sessionId,
      p_capability: capabilityName, // Cast to string to handle enum/text type mismatch
    })
    if (!rpcError) {
      // Update the capability_usage_log row with agent field
      // The RPC creates/updates the row, so we update the most recent one for this session+capability
      if (resolvedAgent) {
        try {
          const { data: logRow } = await supabaseClient
            .from('capability_usage_log')
            .select('id')
            .eq('session_id', sessionId)
            .eq('capability', capabilityName)
            .order('first_used_at', { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle()
          
          if (logRow?.id) {
            await supabaseClient
              .from('capability_usage_log')
              .update({ agent: resolvedAgent })
              .eq('id', logRow.id)
          } else {
            // Row doesn't exist yet (shouldn't happen if RPC worked), insert it
            await supabaseClient
              .from('capability_usage_log')
              .insert({
                session_id: sessionId,
                capability: capabilityName,
                agent: resolvedAgent,
                context: usageData ? (toJson(usageData) as Json) : null,
                first_used_at: new Date().toISOString()
              })
          }
        } catch (updateError) {
          console.warn(`[capabilities] Failed to update agent field for ${capabilityName}`, updateError)
        }
      }
      return
    }
    // Warning log removed - could add proper error handling here
  } catch (error) {
    console.warn(`[capabilities] RPC append_capability_if_missing failed for ${capabilityName}`, error)
  }

  // Fallback (legacy): write to capability_usage (if exists) and update array locally
  // Also write to capability_usage_log with agent field
  try {
    // Write to capability_usage_log with agent
    await supabaseClient
      .from('capability_usage_log')
      .insert({
        session_id: sessionId,
        capability: capabilityName,
        agent: resolvedAgent || null,
        context: usageData ? (toJson(usageData) as Json) : null,
        first_used_at: new Date().toISOString()
      })
      .select()
      .single()

    // Legacy: also write to capability_usage if it exists
    await supabaseClient
      .from('capability_usage')
      .insert({ 
        session_id: sessionId, 
        capability_name: capabilityName, 
        usage_data: usageData ? (toJson(usageData) as Json) : null 
      })
      .then(() => {}) // Ignore errors if table doesn't exist

    const { data: context } = await supabaseClient
      .from('conversation_contexts')
      .select('ai_capabilities_shown')
      .eq('session_id', sessionId)
      .single()
    if (context) {
      const current = Array.isArray(context.ai_capabilities_shown) ? context.ai_capabilities_shown : []
      const updated = [...new Set([...current, capabilityName])]
      await supabaseClient
        .from('conversation_contexts')
        .update({ ai_capabilities_shown: updated, updated_at: new Date().toISOString() })
        .eq('session_id', sessionId)
    }
  } catch (error) {
    console.error(`❌ Failed to record capability usage (fallback): ${capabilityName}`, error)
  }
}

export async function getCapabilitiesUsed(sessionId: string): Promise<string[]> {
  const supabaseClient = getSupabaseService()
  if (!supabaseClient) {
    console.warn('[capabilities] Supabase not available, cannot get capabilities')
    return []
  }
  try {
    const { data: context } = await supabaseClient
      .from('conversation_contexts')
      .select('ai_capabilities_shown')
      .eq('session_id', sessionId)
      .single()
    return context?.ai_capabilities_shown || []
  } catch (error) {
    console.error(`❌ Failed to get capabilities for session: ${sessionId}`, error)
    return []
  }
}

