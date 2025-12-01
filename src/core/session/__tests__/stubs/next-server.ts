export class NextRequest {
  url: string
  headers: Headers
  nextUrl: URL
  cookies: { get: (name: string) => { value: string } | undefined }

  constructor(url: string, init?: { headers?: Record<string, string> }) {
    this.url = url
    this.headers = new Headers(init?.headers || {})
    this.nextUrl = new URL(url)

    const cookieHeader = () => this.headers.get('cookie')
    this.cookies = {
      get: (name: string) => {
        const header = cookieHeader()
        if (!header) return undefined
        const parts = header.split(';').map((p) => p.trim())
        for (const part of parts) {
          const [n, v] = part.split('=')
          if (n === name && typeof v === 'string')
            return { value: decodeURIComponent(v) }
        }
        return undefined
      }
    }
  }
}

export const NextResponse = {
  json: (body: unknown, init?: any) => ({ body, init })
}

