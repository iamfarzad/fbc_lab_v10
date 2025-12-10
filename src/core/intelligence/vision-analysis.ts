/**
 * Vision Analysis Service - Active vision investigation with focus prompts
 * 
 * Provides targeted image analysis using Gemini Vision API.
 * Used by capture_screen_snapshot and capture_webcam_snapshot tools
 * when focus_prompt is provided for active investigation.
 */

import { generateText } from 'ai'
import { google } from '../../lib/ai-client.js'
import { GEMINI_MODELS } from '../../config/constants.js'
import { logger } from '../../lib/logger.js'

export interface VisionAnalysisResult {
  analysis: string
  confidence?: number
}

/**
 * Analyze an image with a specific focus prompt
 * 
 * @param imageData - Base64 image data (with or without data URL prefix)
 * @param focusPrompt - Specific question about what to look for
 * @param modality - 'screen' or 'webcam' to provide context-aware default prompts
 * @returns Analysis result with confidence score
 */
export async function analyzeImageWithPrompt(
  imageData: string | Buffer,
  focusPrompt: string,
  modality: 'screen' | 'webcam' = 'screen'
): Promise<VisionAnalysisResult> {
  try {
    logger.debug('🔍 [Vision Analysis] Analyzing image with focus prompt', { 
      modality, 
      promptLength: focusPrompt.length 
    })

    // Convert Buffer to base64 string if needed
    let base64Image: string
    if (Buffer.isBuffer(imageData)) {
      base64Image = imageData.toString('base64')
    } else {
      // Remove data URL prefix if present
      base64Image = imageData.replace(/^data:image\/\w+;base64,/, '')
    }

    // Context-aware default prompt if none provided (shouldn't happen, but safety check)
    const defaultPrompt = modality === 'screen'
      ? 'Analyze this screen capture and describe what you see relevant to a sales or technical context.'
      : 'Analyze this webcam image and describe what you see relevant to a sales context, including user expression and environment.'

    const promptToUse = focusPrompt.trim() || defaultPrompt

    // Analyze with Gemini Vision
    const result = await generateText({
      model: google(GEMINI_MODELS.DEFAULT_VISION, {
        media_resolution: 'media_resolution_low',
        thinking_level: 'high'
      }),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptToUse },
            { type: 'image', image: base64Image }
          ]
        }
      ]
    })

    const analysis = result.text || ''

    // Estimate confidence based on response quality
    // Longer, more detailed responses typically indicate higher confidence
    const analysisLength = analysis.length
    const hasDetails = analysis.split('.').length > 2 // Multiple sentences
    const hasSpecifics = /(see|showing|displaying|contains|shows|reading|detected|identified)/i.test(analysis) // Specific observations
    const confidence = Math.min(
      0.3 + // Base confidence
      (analysisLength > 100 ? 0.3 : analysisLength / 500) + // Length factor
      (hasDetails ? 0.2 : 0) + // Detail factor
      (hasSpecifics ? 0.2 : 0), // Specificity factor
      1.0 // Cap at 1.0
    )

    logger.debug('✅ [Vision Analysis] Analysis complete', {
      modality,
      analysisLength,
      confidence: confidence.toFixed(2)
    })

    return {
      analysis,
      confidence
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('❌ [Vision Analysis] Failed to analyze image', err)
    throw err
  }
}
