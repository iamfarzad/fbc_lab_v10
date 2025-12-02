import path from 'path'
import { fileURLToPath } from 'url'

/**
 * Generate PDF file path
 */
export function generatePdfPath(sessionId: string, leadName: string): string {
  const sanitizedName = leadName.replace(/[^a-zA-Z0-9]/g, '_') || 'lead'
  const timestamp = new Date().toISOString().split('T')[0]
  
  // In serverless environments, we don't use file paths
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return `FB-c_Summary_${sanitizedName}_${timestamp}_${sessionId}.pdf`
  } else {
    return `/tmp/FB-c_Summary_${sanitizedName}_${timestamp}_${sessionId}.pdf`
  }
}

/**
 * Resolve asset path (for Jest compatibility)
 */
export function resolveAssetPath(relativePath: string): string {
  // Use __dirname in CommonJS environments (Jest) or compute it from import.meta.url in ESM
  let currentDir: string
  
  if (typeof __dirname !== 'undefined') {
    // CommonJS environment (Jest)
    currentDir = __dirname
  } else if (typeof import.meta !== 'undefined' && import.meta.url) {
    // ESM environment
    const currentModuleUrl = import.meta.url
    const currentFilePath = fileURLToPath(currentModuleUrl)
    currentDir = path.dirname(currentFilePath)
  } else {
    // Fallback
    currentDir = process.cwd()
  }
  
  return path.resolve(currentDir, relativePath)
}

