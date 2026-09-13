import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Lazy initialization of Google Gen AI SDK
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return aiClient;
}

app.post('/api/ai/coach', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'AI is not configured. Missing GEMINI_API_KEY environment variable.' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(500).json({ error: 'AI client failed to initialize.' });
    }

    const systemInstruction = `
      You are the STREAK AI Coach, an intelligent personal growth assistant.
      The user is interacting with the STREAK app, focused on small actions every day.
      Your tone is calm, encouraging, concise, and highly actionable.
      Do not be overly enthusiastic. Analyze the user's habits if context is provided.
      Current context: ${JSON.stringify(context || {})}
    `;

    let responseText = '';
    // Use supported modern models (gemini-3.6-flash, gemini-3.8-flash, gemini-flash-latest)
    const candidateModels = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: message,
          config: {
            systemInstruction,
            temperature: 0.7,
          }
        });
        if (response?.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${model} attempt failed:`, err?.message || err);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('No response from AI model');
    }

    res.json({
      text: responseText,
    });
  } catch (error: any) {
    console.error('AI Coach Error:', error);
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('429')) {
      return res.status(429).json({ error: 'The AI Coach is currently at capacity due to high demand. Please try again in a few minutes!' });
    }
    res.status(500).json({ error: 'Failed to generate response. Please try again.' });
  }
});

// Serve static files in production
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;

