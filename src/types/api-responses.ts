export interface AttachmentUploadResponse {
  ok: boolean
  attachments: Array<{ url: string; name: string; type: string }>
  prompt?: string
  error?: string
}

export interface ScreenAnalysisResponse {
  output?: {
    analysis?: string
    [key: string]: unknown
  }
  analysis?: string
  [key: string]: unknown
}

export interface WebcamAnalysisResponse {
  analysis?: string
  output?: {
    analysis?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

