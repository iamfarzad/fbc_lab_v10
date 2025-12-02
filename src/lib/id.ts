export function createPrefixedId(prefix: string, randomLength = 12): string {
  const sanitizedPrefix = prefix.trim()
  const uuid = globalThis.crypto?.randomUUID?.()

  if (uuid) {
    return sanitizedPrefix ? `${sanitizedPrefix}_${uuid}` : uuid
  }

  const random = Math.random().toString(36).slice(2, 2 + randomLength)
  const timestamp = Date.now().toString(36)

  return sanitizedPrefix ? `${sanitizedPrefix}_${timestamp}_${random}` : `${timestamp}_${random}`
}

