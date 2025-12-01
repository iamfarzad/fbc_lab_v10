import { vi } from 'vitest'

export function createMockFetch(response: any, ok: boolean = true, status: number = 200) {
  return vi.fn(() =>
    Promise.resolve({
      ok,
      status,
      json: async () => response,
      text: async () => JSON.stringify(response),
      headers: new Headers(),
      statusText: ok ? 'OK' : 'Error'
    } as Response)
  )
}

export function createMockFetchError(message: string = 'Network error') {
  return vi.fn(() => Promise.reject(new Error(message)))
}

