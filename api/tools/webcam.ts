import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { GEMINI_MODELS } from '../../src/config/constants';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser to handle FormData
  },
};

// Simple in-memory rate limiting for demo purposes
let lastRequestTime = 0;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check API key before processing
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey || apiKey.includes('INSERT_API_KEY')) {
      return res.status(500).json({ 
        error: 'API key not configured. Please set GEMINI_API_KEY in Vercel environment variables.',
        success: false
      });
    }

    // Rate limiting (simple in-memory for demo)
    const now = Date.now()
    if (now - lastRequestTime < 2000) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait.' })
    }
    lastRequestTime = now

    // Manually parse JSON body since bodyParser is disabled
    let body: { image?: string; prompt?: string };
    try {
      body = JSON.parse(req.body as string) as { image?: string; prompt?: string };
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    const { image, prompt } = body || {};

    if (!image) {
      return res.status(400).json({ error: 'No image data provided' })
    }

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '')
    
    // Analyze with Gemini Vision
    const result = await generateText({
      model: google(GEMINI_MODELS.DEFAULT_VISION),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt || 'Analyze this webcam image and describe what you see relevant to a sales context.' },
            { type: 'image', image: base64Image }
          ]
        }
      ]
    })

    const analysis = result.text || '';

    return res.status(200).json({
      success: true,
      analysis: analysis,
      metadata: {
        timestamp: new Date().toISOString(),
        fileSize: base64Image.length,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[API /tools/webcam] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
