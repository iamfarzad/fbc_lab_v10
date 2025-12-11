import { safeGenerateText } from '../../../lib/gemini-safe.js'
import { GEMINI_MODELS } from '../../../config/constants.js'
import type { IntelligenceContext } from '../types.js'

export interface CorrectionData {
  name?: string
  company?: {
    name?: string
    domain?: string
  }
  role?: string
  person?: {
    fullName?: string
    role?: string
  }
  confidence: number
}

/**
 * Detect if user is correcting information about themselves
 * Returns extracted corrected information if detected
 */
export async function detectAndExtractCorrections(
  userMessage: string,
  currentContext: IntelligenceContext | undefined
): Promise<CorrectionData | null> {
  if (!userMessage || !currentContext) {
    return null
  }

  // Quick pattern check for common correction phrases
  const correctionPhrases = [
    /that'?s (wrong|incorrect|not right|not correct)/i,
    /(no|nope),? (that'?s|it'?s) (not|wrong)/i,
    /i'?m (not|don'?t) (a|an|the)/i,
    /(my|the) (name|company|role) (is|isn'?t|'?s)/i,
    /(actually|actually,?|correction)/i,
  ]

  const hasCorrectionPhrase = correctionPhrases.some(pattern => pattern.test(userMessage))
  
  if (!hasCorrectionPhrase && !currentContext.company?.name && !currentContext.person?.fullName) {
    // No correction phrase and no existing context to correct
    return null
  }

  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/6378de97-2617-4621-b4d2-3d0f07a3e0c3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'initial',
      hypothesisId: 'H2',
      location: 'src/core/agents/utils/detect-corrections.ts:52',
      message: 'detectAndExtractCorrections trigger',
      data: {
        hasPhrase: hasCorrectionPhrase,
        msgLen: userMessage.length,
        msgSnippet: userMessage.slice(0, 120),
        hasCompany: !!currentContext.company?.name,
        hasPerson: !!currentContext.person?.fullName
      },
      timestamp: Date.now()
    })
  }).catch(() => {})
  // #endregion

  try {
    const prompt = `You are analyzing a user message to detect if they are correcting information about themselves.

Current context (may be incorrect):
${currentContext.name ? `Name: ${currentContext.name}` : 'Name: Not provided'}
${currentContext.company?.name ? `Company: ${currentContext.company.name}` : 'Company: Not provided'}
${currentContext.person?.role ? `Role: ${currentContext.person.role}` : 'Role: Not provided'}
${currentContext.person?.fullName ? `Full Name: ${currentContext.person.fullName}` : 'Full Name: Not provided'}

User message: "${userMessage}"

Analyze if the user is correcting any of this information. Extract ONLY the corrected information they provide.

Return JSON with this structure:
{
  "isCorrection": boolean,
  "correctedName": string | null,
  "correctedCompany": string | null,
  "correctedRole": string | null,
  "correctedFullName": string | null,
  "confidence": number (0-1)
}

Rules:
- Only return corrected fields if user explicitly provides new information
- If user says "that's wrong" but doesn't provide correct info, set confidence to 0.3
- If user provides specific corrected info, set confidence to 0.9
- If user is just clarifying (not correcting), set isCorrection to false
- Return null for fields that weren't corrected`

    const response = await safeGenerateText({
      system: prompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.1,
      modelId: GEMINI_MODELS.DEFAULT_CHAT,
    })

    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/6378de97-2617-4621-b4d2-3d0f07a3e0c3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'initial',
        hypothesisId: 'H2',
        location: 'src/core/agents/utils/detect-corrections.ts:82',
        message: 'LLM response meta',
        data: {
          hasText: !!response?.text,
          textLen: response?.text?.length || 0,
          textSnippet: response?.text?.slice(0, 120) || ''
        },
        timestamp: Date.now()
      })
    }).catch(() => {})
    // #endregion

    if (!response || !response.text) {
      return null
    }

    // Parse JSON response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/6378de97-2617-4621-b4d2-3d0f07a3e0c3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'initial',
          hypothesisId: 'H2',
          location: 'src/core/agents/utils/detect-corrections.ts:94',
          message: 'no JSON match in response',
          data: { textSnippet: response.text.slice(0, 120) },
          timestamp: Date.now()
        })
      }).catch(() => {})
      // #endregion
      return null
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      isCorrection?: boolean
      correctedName?: string | null
      correctedCompany?: string | null
      correctedRole?: string | null
      correctedFullName?: string | null
      confidence?: number
    }

    if (!parsed.isCorrection || (parsed.confidence ?? 0) < 0.3) {
      return null
    }

    const correction: CorrectionData = {
      confidence: parsed.confidence ?? 0.5,
    }

    if (parsed.correctedName) {
      correction.name = parsed.correctedName
    }
    if (parsed.correctedFullName) {
      correction.person = { fullName: parsed.correctedFullName }
      // Also update name if fullName provided
      if (!correction.name) {
        correction.name = parsed.correctedFullName.split(' ')[0] || parsed.correctedFullName
      }
    }
    if (parsed.correctedCompany) {
      correction.company = { name: parsed.correctedCompany }
    }
    if (parsed.correctedRole) {
      correction.role = parsed.correctedRole
      if (!correction.person) {
        correction.person = {}
      }
      correction.person.role = parsed.correctedRole
    }

    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/6378de97-2617-4621-b4d2-3d0f07a3e0c3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'initial',
        hypothesisId: 'H2',
        location: 'src/core/agents/utils/detect-corrections.ts:134',
        message: 'detectAndExtractCorrections parsed',
        data: {
          isCorrection: parsed.isCorrection ?? false,
          confidence: parsed.confidence ?? 0,
          nameLen: correction.name?.length || 0,
          companyLen: correction.company?.name?.length || 0,
          roleLen: correction.role?.length || 0
        },
        timestamp: Date.now()
      })
    }).catch(() => {})
    // #endregion

    return correction.confidence >= 0.3 ? correction : null
  } catch (error) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/6378de97-2617-4621-b4d2-3d0f07a3e0c3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'initial',
        hypothesisId: 'H2',
        location: 'src/core/agents/utils/detect-corrections.ts:142',
        message: 'detectAndExtractCorrections error',
        data: { error: error instanceof Error ? error.message : String(error) },
        timestamp: Date.now()
      })
    }).catch(() => {})
    // #endregion
    console.warn('[detectAndExtractCorrections] Failed to detect corrections', error)
    return null
  }
}

/**
 * Apply corrections to intelligence context
 */
export function applyCorrectionsToContext(
  context: IntelligenceContext,
  corrections: CorrectionData
): IntelligenceContext {
  const updated = { ...context }

  if (corrections.name) {
    updated.name = corrections.name
  }

  if (corrections.person?.fullName) {
    updated.person = {
      fullName: corrections.person.fullName,
      ...updated.person,
    }
  }

  if (corrections.role || corrections.person?.role) {
    const role = corrections.role || corrections.person?.role
    if (role) {
      updated.role = role
      updated.person = {
        fullName: updated.person?.fullName || updated.name || '',
        ...updated.person,
        role,
      }
    }
  }

  if (corrections.company?.name) {
    updated.company = {
      ...updated.company,
      name: corrections.company.name,
      domain: updated.company?.domain || '',
    }
  }

  if (corrections.company?.domain) {
    updated.company = {
      ...updated.company,
      domain: corrections.company.domain,
    }
  }

  // Mark as corrected
  updated.lastUpdated = new Date().toISOString()

  return updated
}
