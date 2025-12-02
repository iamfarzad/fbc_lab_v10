import { CONVERSATION_CATEGORIES, type CategoryInsight, type ConversationCategory, type ConversationFlowState } from 'src/types/conversation-flow-types'
import type { ConversationFlowSnapshot } from 'src/types/conversation-flow'

type FlowInput = ConversationFlowSnapshot | ConversationFlowState | Record<string, unknown> | null | undefined

const DEFAULT_COVERED: Record<ConversationCategory, boolean> = CONVERSATION_CATEGORIES
  .reduce((acc: Record<ConversationCategory, boolean>, category: ConversationCategory) => ({ ...acc, [category]: false }), {} as Record<ConversationCategory, boolean>)

const CATEGORY_LOOKUP = buildCategoryLookup()

function buildCategoryLookup(): Map<string, ConversationCategory> {
  const lookup = new Map<string, ConversationCategory>()
  for (const category of CONVERSATION_CATEGORIES) {
    lookup.set(category, category)
    lookup.set(category.toLowerCase(), category)
    lookup.set(category.replace(/s$/, ''), category)
    lookup.set(category.replace(/ies$/, 'y'), category)
  }
  lookup.set('goal', 'goals')
  lookup.set('painpoints', 'pain')
  lookup.set('readinesses', 'readiness')
  lookup.set('budgets', 'budget')
  lookup.set('successes', 'success')
  return lookup
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function createBaseState(): ConversationFlowState {
  const covered = { ...DEFAULT_COVERED }
  return {
    covered,
    recommendedNext: deriveRecommendedNext(covered),
    evidence: {},
    insights: {},
    coverageOrder: [],
    totalUserTurns: 0,
    firstUserTimestamp: null,
    latestUserTimestamp: null,
    shouldOfferRecap: false,
  }
}

function normalizeCategory(value: unknown): ConversationCategory | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const key = value.trim().toLowerCase()
  if (CATEGORY_LOOKUP.has(key)) {
    return CATEGORY_LOOKUP.get(key) ?? null
  }
  const singular = key.endsWith('s') ? key.slice(0, -1) : key
  return CATEGORY_LOOKUP.get(singular) ?? null
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true
    if (['false', '0', 'no', 'n'].includes(normalized)) return false
  }
  return Boolean(value)
}

function normalizeInsight(value: unknown, fallbackIndex: number): CategoryInsight | null {
  if (!isRecord(value)) return null
  const firstTurnIndexRaw = value.firstTurnIndex
  const firstTurnIndex = typeof firstTurnIndexRaw === 'number' && Number.isFinite(firstTurnIndexRaw)
    ? firstTurnIndexRaw
    : fallbackIndex
  const firstMessageIdRaw = value.firstMessageId
  const firstMessageId = typeof firstMessageIdRaw === 'string' && firstMessageIdRaw.trim().length > 0
    ? firstMessageIdRaw
    : `flow-${fallbackIndex}`
  const firstTimestampRaw = value.firstTimestamp
  const firstTimestamp = typeof firstTimestampRaw === 'number' && Number.isFinite(firstTimestampRaw)
    ? firstTimestampRaw
    : null

  return {
    firstTurnIndex,
    firstMessageId,
    firstTimestamp,
  }
}

function deriveRecommendedNext(covered: Record<ConversationCategory, boolean>): ConversationCategory | null {
  return CONVERSATION_CATEGORIES.find((category) => !covered[category]) ?? null
}

function cloneInsights(insights: Partial<Record<ConversationCategory, CategoryInsight>>): Partial<Record<ConversationCategory, CategoryInsight>> {
  const cloned: Partial<Record<ConversationCategory, CategoryInsight>> = {}
  for (const [category, insight] of Object.entries(insights) as Array<[ConversationCategory, CategoryInsight | undefined]>) {
    if (!insight) continue
    cloned[category] = { ...insight }
  }
  return cloned
}

export function normalizeFlow(flow?: FlowInput): ConversationFlowState {
  const baseState = createBaseState()
  if (!isRecord(flow)) {
    return baseState
  }

  const covered: Record<ConversationCategory, boolean> = { ...baseState.covered }
  if (isRecord(flow.covered)) {
    for (const [rawCategory, value] of Object.entries(flow.covered)) {
      const category = normalizeCategory(rawCategory)
      if (!category) continue
      covered[category] = normalizeBoolean(value)
    }
  }

  const evidence: Partial<Record<ConversationCategory, string[]>> = {}
  if (isRecord(flow.evidence)) {
    for (const [rawCategory, items] of Object.entries(flow.evidence)) {
      const category = normalizeCategory(rawCategory)
      if (!category) continue
      if (Array.isArray(items)) {
        const strings = items.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        if (strings.length > 0) {
          evidence[category] = strings
        }
      }
    }
  }

  const insights: Partial<Record<ConversationCategory, CategoryInsight>> = {}
  const coverageOrder: Array<CategoryInsight & { category: ConversationCategory }> = []
  const rawCoverageOrder = (flow as { coverageOrder?: unknown }).coverageOrder
  if (Array.isArray(rawCoverageOrder)) {
    rawCoverageOrder.forEach((entry, index) => {
      if (!isRecord(entry)) return
      const category = normalizeCategory(entry.category)
      if (!category) return
      const normalizedInsight = normalizeInsight(entry, index)
      if (!normalizedInsight) return
      coverageOrder.push({ category, ...normalizedInsight })
      insights[category] = normalizedInsight
    })
  }

  if (isRecord((flow as unknown as ConversationFlowState).insights)) {
    for (const [rawCategory, insight] of Object.entries((flow as unknown as ConversationFlowState).insights)) {
      const category = normalizeCategory(rawCategory)
      if (!category) continue
      const normalized = normalizeInsight(insight, coverageOrder.length)
      if (normalized) {
        insights[category] = normalized
      }
    }
  }

  const totalUserTurnsRaw = (flow as unknown as ConversationFlowState).totalUserTurns ?? (flow as unknown as ConversationFlowSnapshot).totalUserTurns
  let totalUserTurns = baseState.totalUserTurns
  if (typeof totalUserTurnsRaw === 'number' && Number.isFinite(totalUserTurnsRaw)) {
    totalUserTurns = totalUserTurnsRaw
  } else if (typeof totalUserTurnsRaw === 'string' && !isNaN(Number(totalUserTurnsRaw))) {
    totalUserTurns = Number(totalUserTurnsRaw)
  }

  const recommendedNextRaw = (flow as unknown as ConversationFlowState).recommendedNext ?? (flow as unknown as ConversationFlowSnapshot).recommendedNext
  const recommendedNext = normalizeCategory(recommendedNextRaw) ?? deriveRecommendedNext(covered)

  const shouldOfferRecapRaw = (flow as unknown as ConversationFlowState).shouldOfferRecap ?? (flow as unknown as ConversationFlowSnapshot).shouldOfferRecap
  const shouldOfferRecap = typeof shouldOfferRecapRaw === 'boolean'
    ? shouldOfferRecapRaw
    : totalUserTurns >= 6

  const firstUserTimestampRaw = (flow as unknown as ConversationFlowState).firstUserTimestamp
  const firstUserTimestamp = typeof firstUserTimestampRaw === 'number' || firstUserTimestampRaw === null
    ? firstUserTimestampRaw
    : baseState.firstUserTimestamp

  const latestUserTimestampRaw = (flow as unknown as ConversationFlowState).latestUserTimestamp
  const latestUserTimestamp = typeof latestUserTimestampRaw === 'number' || latestUserTimestampRaw === null
    ? latestUserTimestampRaw
    : baseState.latestUserTimestamp

  const lastResearchTurnRaw = (flow as unknown as ConversationFlowState).lastResearchTurn ?? (flow as unknown as ConversationFlowSnapshot).lastResearchTurn
  const lastResearchTurn = typeof lastResearchTurnRaw === 'number' && Number.isFinite(lastResearchTurnRaw)
    ? lastResearchTurnRaw
    : undefined

  const normalizedState: ConversationFlowState = {
    covered,
    recommendedNext,
    evidence,
    insights: cloneInsights(insights),
    coverageOrder: coverageOrder.map((entry) => ({ ...entry })),
    totalUserTurns,
    firstUserTimestamp,
    latestUserTimestamp,
    shouldOfferRecap,
  }

  if (typeof lastResearchTurn === 'number') {
    normalizedState.lastResearchTurn = lastResearchTurn
  }

  return normalizedState
}

