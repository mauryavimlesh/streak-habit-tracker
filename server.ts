
import "dotenv/config";
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';


import { adminAuth, adminDb } from './api/firebase-admin.js';




const app = express();
app.use(express.json());

// Lazy initialization of Google Gen AI SDK
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

// Configuration endpoint for development preview
app.post('/api/config', (req, res) => {
  const { geminiApiKey } = req.body;
  if (geminiApiKey) {
    process.env.GEMINI_API_KEY = geminiApiKey;
    // Reset the aiClient so it re-initializes with the new key
    aiClient = null;
  }
  res.json({ success: true, configured: Boolean(process.env.GEMINI_API_KEY) });
});

// Status endpoint for AI Coach availability
app.get('/api/ai-status', (req, res) => {
  res.json({
    status: 'ok',
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-2.5-flash',
  });
});

app.post('/api/ai-coach', async (req, res) => {
  try {
    const { message, messages, history, context } = req.body;
    
    // Secure session validation using Firebase Admin
    const authHeader = req.headers.authorization;
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        userId = decodedToken.uid;
      } catch (err) {
        console.warn('Invalid ID token provided:', err);
      }
    }

    let fetchedContext = context;
    if (userId) {
      try {
        const habitsSnapshot = await adminDb.collection('users').doc(userId).collection('habits').get();
        const habits = habitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedContext = {
          ...fetchedContext,
          userId,
          habits,
          activeHabitCount: habits.length
        };
      } catch (err) {
        console.warn('Failed to fetch user habits from Firestore (might require service account credentials):', err);
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[AI Coach] Configuration missing: GEMINI_API_KEY is not set in the environment.');
      return res.status(500).json({
        error: 'AI Coach configuration is incomplete.',
      });
    }

    if (!message && (!messages || !messages.length)) {
      return res.status(400).json({ error: 'A message is required.' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(500).json({ error: 'AI client failed to initialize.' });
    }

    const systemInstruction = `
You are the STREAK AI Coach, a master habit strategist and empathetic personal performance mentor.
STREAK's core philosophy is "Small actions. Every day." grounded in atomic habits, behavioral momentum, and Stoic mindfulness.

Core Principles:
- Tone: Calm, encouraging, grounded, direct, and actionable. Never use hollow buzzwords or overly generic cheerleading.
- Methodology: Focus on reducing starting friction, habit stacking, identity-based habits, and rebounding quickly after missed days ("Never miss twice").
- Style: Provide crisp, practical guidance (2-4 paragraphs or concise bullet points). Format clearly for mobile viewing.
${fetchedContext ? `
USER & HABIT CONTEXT:
${typeof fetchedContext === 'string' ? fetchedContext : JSON.stringify(fetchedContext, null, 2)}
Personalize your response by referencing their habits, streak count, or goals whenever relevant.` : ''}
`.trim();

    // Prepare contents: support multi-turn history or single message
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

      // If a new message string was sent separately, append it
      if (message && (!conversationList.length || conversationList[conversationList.length - 1].text !== message)) {
        contents.push({
          role: 'user',
          parts: [{ text: message }],
        });
      }
    } else {
      contents = message;
    }

    let responseText = '';
    const candidateModels = ['gemini-3.1-pro-preview', 'gemini-3.6-flash', 'gemini-3.8-flash'];
    let lastError: any = null;

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
        console.warn(`Model ${model} attempt failed:`, err?.message || err);
        lastError = err;
      }
    }

    if (!responseText) {
      throw new Error(`All models failed. Last error: ${lastError?.message || lastError}`);
    }

    res.json({
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
    if (msg.includes('no response') || msg.includes('invalid') || msg.includes('parse')) {
      return res.status(502).json({ error: 'AI Coach received an invalid response.' });
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
