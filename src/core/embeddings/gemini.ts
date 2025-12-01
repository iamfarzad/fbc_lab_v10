import { EMBEDDING_MODELS } from 'src/config/constants'
import { createGoogleGenAI } from 'src/config/env'

export async function embedTexts(texts: string[], dims: 768 | 1536 = 1536): Promise<number[][]> {
  const ai = createGoogleGenAI()
  const res = await ai.models.embedContent({
    model: EMBEDDING_MODELS.DEFAULT,
    contents: texts,
    config: { outputDimensionality: dims },
  })
  const vectors = (res.embeddings || []).map((e: { values?: number[] }) => (e.values as number[]) || [])
  return vectors
}

// Export the functions for compatibility
export { embedTexts as embedText }


