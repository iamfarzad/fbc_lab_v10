import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert a Blob to base64 string (without data URL prefix)
 * Matches prototype implementation for Gemini Live API compatibility
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const parts = base64String.split(',')
      resolve(parts[1] || base64String)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

