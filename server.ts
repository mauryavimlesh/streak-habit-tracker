import "dotenv/config";
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { generateFallbackCoaching } from './api/fallback-coach';

const app = express();

// Enable CORS for all origins and headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

app.post('/api/config', (req, res) => {
  res.json({ success: true, configured: Boolean(process.env.GEMINI_API_KEY) });
});

app.get('/api/ai-status', (req, res) => {
  res.json({
    status: 'ok',
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.8-flash',
  });
});

// Explicit SEO endpoints for robots.txt and sitemap.xml
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(process.cwd(), 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
});

// PWA Service Worker & Manifest routing with strict caching rules
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(process.cwd(), 'public', 'sw.js'));
});

app.get(['/manifest.webmanifest', '/manifest.json'], (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(path.join(process.cwd(), 'public', 'manifest.webmanifest'));
});

// Smart Study Plan Extraction from handwritten or printed photos
app.post('/api/ai-extract-plan', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[Plan Extractor] GEMINI_API_KEY is not set.');
      return res.status(500).json({ error: 'AI service configuration is incomplete.' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(500).json({ error: 'AI client failed to initialize.' });
    }

    // Clean base64 data header if present
    const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');

    const prompt = `Analyze this handwritten or printed student study plan.
Extract the subjects (e.g. Physics, Chemistry, Botany, Zoology, Math, etc.) and break down all lectures, tasks, questions, notes, and revision activities.
Format the output STRICTLY as raw JSON (no markdown fences, no explanatory text) with this exact schema:
{
  "goalTitle": "Student Study Plan",
  "subjects": ["Physics", "Chemistry", "Botany", "Zoology"],
  "dailyTarget": 4,
  "unit": "Lectures",
  "activities": [
    {
      "title": "Lecture 1",
      "subject": "Physics",
      "type": "Lecture",
      "targetQuantity": 1,
      "unit": "lecture"
    }
  ]
}
Supported types: "Lecture", "Notes", "Revision", "DPP", "Questions", "NCERT Reading", "Practice", "Preparation", "Other".
Be precise and thorough in capturing all items listed for each subject.`;

    let responseText = '';
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          config: {
            temperature: 0.2,
          },
        });

        if (response?.text) {
          responseText = response.text.trim();
          break;
        }
      } catch (err) {
        console.warn(`[Plan Extractor] Model ${model} failed, trying next:`, err);
      }
    }

    if (!responseText) {
      return res.status(502).json({ error: 'AI plan extraction failed to produce a response.' });
    }

    // Strip markdown code fences if model returned them
    const cleanJson = responseText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      const parsedPlan = JSON.parse(cleanJson);
      return res.json({ success: true, plan: parsedPlan });
    } catch (parseErr) {
      console.error('[Plan Extractor] JSON parse error:', parseErr, 'Raw:', responseText);
      return res.status(500).json({ error: 'Failed to parse extracted study plan JSON.' });
    }
  } catch (error: any) {
    console.error('[Plan Extractor] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error extracting plan.' });
  }
});

app.post('/api/ai-coach', async (req, res) => {
  try {
    const { message, messages, history, context } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      console.log('[AI Coach] GEMINI_API_KEY not configured, generating truthful deterministic coaching fallback.');
      const fallbackPrompt = message || (Array.isArray(messages) && messages[messages.length - 1]?.text) || 'How do I build consistency?';
      const fallbackText = generateFallbackCoaching(fallbackPrompt, context);
      return res.json({
        success: true,
        text: fallbackText,
        reply: fallbackText,
        fallback: true,
      });
    }

    if (!message && (!messages || !messages.length)) {
      return res.status(400).json({ error: 'A message is required.' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(500).json({ error: 'AI client failed to initialize.' });
    }

    const systemInstruction = `You are the STREAK AI Coach & Tactical Performance Mentor.
STREAK's core philosophy is "Small actions. Every day." grounded in atomic habits, deep study consistency, subject balance, and Stoic mindfulness.

CORE ARCHITECTURAL RULES:
1. Grounding in Real Application Data:
   The application deterministically calculates metrics (Momentum score, planned vs completed items, habits, tasks, goals, focus minutes, journals, calendar).
   Your job is to interpret these exact statistics. You must NEVER calculate fundamental metrics yourself or invent values.
   If insufficient data exists for a pattern or timeframe, state explicitly: "I don't have enough data yet to identify a reliable pattern."
2. Separation of Facts and Interpretations:
   Format responses by clearly separating:
   FACT:
   State the exact measured metric grounded in the numbers (e.g., "FACT: You completed 14 of 18 planned study sessions.").
   INTERPRETATION:
   Provide actionable tactical guidance based on that observation (e.g., "INTERPRETATION: Your consistency drops on Thursdays and Fridays. Consider scheduling lighter review blocks instead of heavy new lectures on those days.").
3. Style & Tone:
   Keep advice concrete, tactical, and grounded in the user's logged numbers.
   DO NOT use vague motivational quotes or exaggerated cheerleading.
${context ? `\nUSER & REAL ACTIVITY CONTEXT:\n${typeof context === 'string' ? context : JSON.stringify(context, null, 2)}\nPersonalize your response strictly using their context numbers.` : ''}`.trim();

    let contents: any;
    const conversationList = Array.isArray(messages) ? messages : Array.isArray(history) ? history : null;

    if (conversationList && conversationList.length > 0) {
      contents = conversationList.map((item: any) => {
        const role = (item.role === 'ai' || item.role === 'assistant' || item.role === 'model') ? 'model' : 'user';
        const text = item.text || item.content || '';
        return {
          role,
          parts: [{ text }],
        };
      });

      if (message && (!conversationList.length || conversationList[conversationList.length - 1]?.text !== message)) {
        contents.push({
          role: 'user',
          parts: [{ text: message }],
        });
      }
    } else {
      contents = message;
    }

    let responseText = '';
    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.6-flash',
    ];

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response?.text) {
          responseText = response.text.trim();
          break;
        }
      } catch (err: any) {
        // Silently proceed to next model or fallback if cloud model is at capacity
      }
    }

    if (!responseText) {
      // Generate insightful, personalized atomic habit coaching response
      const fallbackPrompt = message || (Array.isArray(messages) && messages[messages.length - 1]?.text) || 'How do I build consistency?';
      responseText = generateFallbackCoaching(fallbackPrompt, context);
    }

    res.json({
      success: true,
      text: responseText,
      reply: responseText,
    });
  } catch (error: any) {
    console.error('AI Coach Error:', error);
    const msg = error?.message?.toLowerCase() || '';

    if (msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('429') || msg.includes('503')) {
      return res.status(503).json({ error: 'AI service is temporarily rate-limited. Please try again shortly.' });
    }
    if (msg.includes('api_key') || msg.includes('unauthorized') || msg.includes('authentication') || msg.includes('forbidden')) {
      return res.status(401).json({ error: 'AI service authentication failed.' });
    }
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout')) {
      return res.status(502).json({ error: 'Unable to connect to AI Coach.' });
    }

    res.status(500).json({ error: 'AI Coach server error. Please try again.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
