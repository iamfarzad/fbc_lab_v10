import type { VercelRequest, VercelResponse } from '@vercel/node'
import { contextStorage } from '../src/core/context/context-storage.js'
import { logger } from '../src/lib/logger.js'

type ConsentRecord = {
  allowResearch: boolean
  allowedDomains: string[]
  ts: number
  policyVersion?: string
  name?: string
  email?: string
  companyDomain?: string
}

const GENERIC_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
])

function inferDomainFromEmail(email?: string): string | null {
  if (!email || !email.includes('@')) return null
  const domain = email.split('@')[1]?.toLowerCase().trim()
  if (!domain || GENERIC_DOMAINS.has(domain)) return null
  return domain
}

function inferDomainFromCompanyUrl(companyUrl?: string): string | null {
  if (!companyUrl) return null
  try {
    const url = new URL(companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`)
    const hostname = url.hostname.toLowerCase().trim()
    if (!hostname) return null
    return hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function buildAllowedDomains(email?: string, companyUrl?: string): string[] {
  const domains = new Set<string>()
  const emailDomain = inferDomainFromEmail(email)
  const urlDomain = inferDomainFromCompanyUrl(companyUrl)
  if (emailDomain) domains.add(emailDomain)
  if (urlDomain) domains.add(urlDomain)
  if (domains.size > 0) domains.add('linkedin.com')
  return Array.from(domains)
}

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const sessionId =
    (typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined) ||
    (typeof (req.body as any)?.sessionId === 'string' ? (req.body as any).sessionId : undefined)

  if (!sessionId) {
    return res.status(400).json({ ok: false, error: 'sessionId is required' })
  }

  try {
    if (req.method === 'GET') {
      const stored = await contextStorage.get(sessionId)
      const intelligence = stored?.intelligence_context && typeof stored.intelligence_context === 'object'
        ? (stored.intelligence_context as any)
        : undefined
      const consent = intelligence?.consent as ConsentRecord | undefined
      return res.status(200).json({
        ok: true,
        allowResearch: consent?.allowResearch === true,
        allowedDomains: Array.isArray(consent?.allowedDomains) ? consent!.allowedDomains : [],
        ts: typeof consent?.ts === 'number' ? consent.ts : undefined,
      })
    }

    if (req.method === 'DELETE') {
      const stored = await contextStorage.get(sessionId)
      const intelligence =
        stored?.intelligence_context && typeof stored.intelligence_context === 'object'
          ? (stored.intelligence_context as Record<string, unknown>)
          : {}

      await contextStorage.updateWithVersionCheck(
        sessionId,
        {
          intelligence_context: {
            ...intelligence,
            consent: { allowResearch: false, allowedDomains: [], ts: Date.now() } satisfies ConsentRecord,
          } as any,
        },
        { attempts: 2, backoff: 50 }
      )

      return res.status(200).json({ ok: true })
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    const body = req.body && typeof req.body === 'object' ? (req.body as any) : {}
    const email = typeof body.email === 'string' ? body.email.trim() : undefined
    const name = typeof body.name === 'string' ? body.name.trim() : undefined
    const companyUrl = typeof body.companyUrl === 'string' ? body.companyUrl.trim() : undefined
    const allowResearch = body.allowResearch === true
    const policyVersion = typeof body.policyVersion === 'string' ? body.policyVersion : undefined

    const allowedDomains = allowResearch ? buildAllowedDomains(email, companyUrl) : []
    const companyDomain = allowedDomains.find((d) => d !== 'linkedin.com')

    const stored = await contextStorage.get(sessionId)
    const intelligence =
      stored?.intelligence_context && typeof stored.intelligence_context === 'object'
        ? (stored.intelligence_context as Record<string, unknown>)
        : {}

    const consent: ConsentRecord = {
      allowResearch,
      allowedDomains,
      ts: Date.now(),
      ...(policyVersion ? { policyVersion } : {}),
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(companyDomain ? { companyDomain } : {}),
    }

    await contextStorage.updateWithVersionCheck(
      sessionId,
      {
        intelligence_context: {
          ...intelligence,
          consent,
        } as any,
        ...(email ? { email } : {}),
        ...(name ? { name } : {}),
        ...(companyUrl ? { company_url: companyUrl } : {}),
      },
      { attempts: 2, backoff: 50 }
    )

    return res.status(200).json({ ok: true, consent })
  } catch (error) {
    logger.error('[API /consent] Failed', error instanceof Error ? error : undefined, { sessionId })
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Internal error' })
  }
}

