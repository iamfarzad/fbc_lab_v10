import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppConfig } from 'src/config';
import formidable from 'formidable';
import fs from 'fs';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_KEY || '');

export const config = {
  api: {
    bodyParser: false, // Disable default body parser to handle FormData
  },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-intelligence-session-id, x-voice-connection-id'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({});
    
    const [fields, files] = await form.parse(req);
    const webcamCapture = files.webcamCapture?.[0];

    if (!webcamCapture) {
      return res.status(400).json({ error: 'webcamCapture file is required' });
    }

    // Read file
    const fileData = fs.readFileSync(webcamCapture.filepath);
    const base64Data = fileData.toString('base64');

    // Analyze with Gemini Flash (fastest for vision)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = "Analyze this webcam frame. Describe what you see briefly, focusing on the user's expression, environment, and any visible objects or actions. Keep it under 50 words.";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    const analysis = result.response.text();

    return res.status(200).json({
      success: true,
      analysis: analysis,
      metadata: {
        timestamp: new Date().toISOString(),
        fileSize: webcamCapture.size,
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
