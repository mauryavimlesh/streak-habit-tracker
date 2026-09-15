import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { generateFallbackCoaching } from './fallback-coach';

export const maxDuration = 30;

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!aiClient && key) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'AI Coach configuration is incomplete. GEMINI_API_KEY is not set.',
    });
  }

  let bodyData = req.body;
  if (typeof bodyData === 'string') {
    try {
      bodyData = JSON.parse(bodyData);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid JSON payload in request body' });
    }
  }

  const { message, messages, history, context } = bodyData || {};

  if (!message && (!messages || !messages.length)) {
    return res.status(400).json({ success: false, error: 'A message is required.' });
  }

  const ai = getAiClient();
  if (!ai) {
    return res.status(500).json({ success: false, error: 'Failed to initialize AI engine.' });
  }

  const systemInstruction = `You are the STREAK AI Coach, a master habit strategist and empathetic personal performance mentor.
STREAK's core philosophy is "Small actions. Every day." grounded in atomic habits, behavioral momentum, and Stoic mindfulness.

Core Principles:
- Tone: Calm, encouraging, grounded, direct, and actionable. Never use hollow buzzwords or overly generic cheerleading.
- Methodology: Focus on reducing starting friction, habit stacking, identity-based habits, and rebounding quickly after missed days ("Never miss twice").
- Style: Provide crisp, practical guidance (2-4 paragraphs or concise bullet points). Format clearly for mobile viewing.
${context ? `\nUSER & HABIT CONTEXT:\n${typeof context === 'string' ? context : JSON.stringify(context, null, 2)}\nPersonalize your response by referencing their habits, streak count, or goals whenever relevant.` : ''}`.trim();

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

  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
  ];

  let responseText = '';
  let selectedModel = '';

  for (const model of candidateModels) {
    try {
      selectedModel = model;
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      if (response && response.text) {
        responseText = response.text.trim();
        break;
      }
    } catch (err: any) {
      // Silently move to next model if model is at capacity (503)
    }
  }

  if (!responseText) {
    const fallbackPrompt = message || (Array.isArray(messages) && messages[messages.length - 1]?.text) || 'How do I build consistency?';
    responseText = generateFallbackCoaching(fallbackPrompt, context);
    selectedModel = 'streak-offline-coach';
  }

  return res.status(200).json({
    success: true,
    text: responseText,
    reply: responseText,
    model_used: selectedModel,
  });
}
