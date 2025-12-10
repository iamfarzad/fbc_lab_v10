import type { ContextSnapshot, Suggestion, IntentResult } from './types.js'

const CAPABILITY_BY_INTENT: Record<IntentResult['type'], Array<{ id: string; label: string; capability: string }>> = {
  consulting: [
    { id: 'roi', label: 'Estimate ROI', capability: 'roi' },
    { id: 'doc', label: 'Analyze a document', capability: 'doc' },
    { id: 'audit', label: 'Run workflow audit', capability: 'screenShare' },
    { id: 'finish', label: 'Finish & Email Summary', capability: 'exportPdf' },
    { id: 'memo', label: 'Write memo for your CFO', capability: 'exportPdf' },
  ],
  workshop: [
    { id: 'screen', label: 'Share screen for feedback', capability: 'screenShare' },
    { id: 'translate', label: 'Translate content', capability: 'translate' },
    { id: 'book', label: 'Schedule a workshop', capability: 'meeting' },
    { id: 'memo', label: 'Write memo for your CFO', capability: 'exportPdf' },
  ],
  other: [
    { id: 'search', label: 'Grounded web search', capability: 'search' },
    { id: 'video2app', label: 'Turn video into app blueprint', capability: 'video2app' },
    { id: 'pdf', label: 'Generate a PDF summary', capability: 'exportPdf' },
    { id: 'memo', label: 'Write memo for your CFO', capability: 'exportPdf' },
  ],
}

function rankByContext(pool: Array<{ id: string; label: string; capability: string }>, context: ContextSnapshot): Array<{ id: string; label: string; capability: string }> {
  const role = (context.role || '').toLowerCase()
  const industry = (context.company?.industry || '').toLowerCase()
  const boosts: Record<string, number> = {}
  // Simple heuristics: boost ROI/audit for leadership roles, boost translate for intl industries, etc.
  if (/(cto|vp|head|lead|founder|ceo|director|manager)/.test(role)) {
    boosts['roi'] = (boosts['roi'] || 0) + 2
    boosts['screenShare'] = (boosts['screenShare'] || 0) + 1
  }
  if (/(health|finance|legal|regulated)/.test(industry)) {
    boosts['exportPdf'] = (boosts['exportPdf'] || 0) + 1
    boosts['doc'] = (boosts['doc'] || 0) + 1
  }
  if (/(global|intl|international|europe|latam|apac|emea|translation|localization)/.test(industry)) {
    boosts['translate'] = (boosts['translate'] || 0) + 2
  }
  if (/(video|content|media|education)/.test(industry)) {
    boosts['video2app'] = (boosts['video2app'] || 0) + 1
  }

  return [...pool].sort((a, b) => (boosts[b.capability] || 0) - (boosts[a.capability] || 0))
}

export function suggestTools(context: ContextSnapshot, intent: IntentResult): Suggestion[] {
  const used = new Set(context.capabilities || [])
  const base = CAPABILITY_BY_INTENT[intent.type]
  const ranked = rankByContext(base, context)
  const suggestions: Suggestion[] = []
  
  // Check for budget/timing objections - suggest executive memo
  const intelligenceContext = context.intelligenceContext as { currentObjection?: 'price' | 'timing' | 'security' | null } | undefined
  const conversationFlow = context.conversationFlow as { covered?: { budget?: boolean } } | undefined
  const hasBudgetObjection = intelligenceContext?.currentObjection === 'price' || 
    (conversationFlow?.covered?.budget === true && !used.has('exportPdf'))
  
  // Education-aware nudge: if workshop intent and ROI not used, bias ROI first
  if (intent.type === 'workshop' && !used.has('roi')) {
    suggestions.push({ id: 'roi', label: 'Estimate ROI', action: 'run_tool', capability: 'roi' })
  }
  
  // Budget objection detection - prioritize executive memo
  if (hasBudgetObjection && !used.has('exportPdf')) {
    suggestions.push({ 
      id: 'memo', 
      label: 'I can write a memo for your CFO explaining why this will save money', 
      action: 'run_tool', 
      capability: 'exportPdf' 
    })
  }
  
  for (const item of ranked) {
    if (used.has(item.capability)) continue
    // Skip memo if already added above
    if (item.id === 'memo' && suggestions.some(s => s.id === 'memo')) continue
    suggestions.push({ id: item.id, label: item.label, action: 'run_tool', capability: item.capability })
    if (suggestions.length >= 3) break
  }
  return suggestions
}

