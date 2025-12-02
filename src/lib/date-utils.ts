export function parseTimeRange(range: string): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()

  switch (range) {
    case '24h':
      start.setHours(start.getHours() - 24)
      break
    case '7d':
      start.setDate(start.getDate() - 7)
      break
    case '30d':
      start.setDate(start.getDate() - 30)
      break
    case '90d':
      start.setDate(start.getDate() - 90)
      break
    default:
      // Default to 7d if invalid
      start.setDate(start.getDate() - 7)
  }

  return { start, end }
}

