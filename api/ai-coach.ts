import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { getAdminAuth, getAdminDb } from './firebase-admin';

export const maxDuration = 60; // Max timeout for Vercel Hobby/Pro

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const logs: string[] = [];
  const addLog = (msg: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[AI-COACH ${timestamp}] ${msg}`);
    logs.push(msg);
  };

  try {
    addLog('Lifecycle: Request received');
    
    if (req.method !== 'POST') {
      addLog(`Validation failed: Invalid method ${req.method}`);
      return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
    addLog(`Validation: API key exists: ${hasApiKey}`);
    if (!hasApiKey) {
      addLog('Validation failed: Missing API key');
      return res.status(500).json({
        success: false,
        error: 'AI Coach configuration is incomplete.',
        details: 'API key not configured in environment.'
      });
    }

    let bodyData = req.body;
    if (typeof req.body === 'string') {
      try {
        bodyData = JSON.parse(req.body);
      } catch (e) {
        addLog('Validation failed: Failed to parse request body as JSON');
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
      }
    }

    const { message, messages, history, context } = bodyData || {};
    
    if (!message && (!messages || !messages.length)) {
      addLog('Validation failed: A message is required');
      return res.status(400).json({ success: false, error: 'A message is required.' });
    }
    
    addLog('Lifecycle: Request validation passed');

    const authHeader = req.headers.authorization || req.headers.Authorization;
    let userId = null;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await getAdminAuth().verifyIdToken(idToken);
        userId = decodedToken.uid;
        addLog('Authentication: User verified');
      } catch (err) {
        addLog('Authentication: Invalid ID token');
      }
    }

    let fetchedContext = context;
    if (userId) {
      try {
        const habitsSnapshot = await getAdminDb().collection('users').doc(userId).collection('habits').get();
        const habits = habitsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        fetchedContext = {
          ...fetchedContext,
          userId,
          habits,
          activeHabitCount: habits.length
        };
        addLog('Context: Fetched user habits from Firestore');
      } catch (err) {
        addLog('Context: Warning - Failed to fetch user habits from Firestore');
      }
    }

    const ai = getAiClient();
    if (!ai) {
      addLog('Lifecycle: Failed to initialize AI client');
      return res.status(500).json({ success: false, error: 'AI client failed to initialize.' });
    }

    const systemInstruction = `You are the STREAK AI Coach, a master habit strategist and empathetic personal performance mentor.
STREAK's core philosophy is "Small actions. Every day." grounded in atomic habits, behavioral momentum, and Stoic mindfulness.
Core Principles:
- Tone: Calm, encouraging, grounded, direct, and actionable. Never use hollow buzzwords or overly generic cheerleading.
- Methodology: Focus on reducing starting friction, habit stacking, identity-based habits, and rebounding quickly after missed days ("Never miss twice").
- Style: Provide crisp, practical guidance (2-4 paragraphs or concise bullet points). Format clearly for mobile viewing.
${fetchedContext ? `USER & HABIT CONTEXT:\n${typeof fetchedContext === 'string' ? fetchedContext : JSON.stringify(fetchedContext, null, 2)}\nPersonalize your response by referencing their habits, streak count, or goals whenever relevant.` : ''}`.trim();

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
    let selectedModel = '';

    addLog('Lifecycle: Model selection and API call started');
    
    for (const model of candidateModels) {
      addLog(`Lifecycle: Attempting model: ${model}`);
      selectedModel = model;
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        
        addLog(`Lifecycle: API call completed with model: ${model}`);
        
        addLog('Lifecycle: Parsing started');
        if (response && response.text) {
          responseText = response.text.trim();
          addLog('Lifecycle: Parsing completed successfully');
          break;
        } else {
          addLog('Lifecycle: Parsing warning - No text returned');
        }
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        addLog(`API Call: Model ${model} attempt failed: ${errorMsg}`);
        lastError = err;
        if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
          addLog('API Call: Quota exhausted, propagating error directly');
          throw err;
        }
      }
    }

    if (!responseText) {
      addLog('Lifecycle: All models failed to return a valid response');
      throw lastError || new Error('No response from AI model after exhausting candidates');
    }

    addLog(`Lifecycle: Status 200 (Success)`);
    return res.status(200).json({
      success: true,
      text: responseText,
      reply: responseText,
      model_used: selectedModel
    });

  } catch (error: any) {
    const errName = error?.name || 'UnknownError';
    const errMessage = error?.message || String(error);
    addLog(`Error caught: name=${errName}, message=${errMessage}`);
    
    const safeErrorMsg = errMessage.replace(/key=[^&\s]+/gi, 'key=HIDDEN');
    addLog(`Lifecycle: Status Error (Catch Block Fallback)`);
    
    if (safeErrorMsg.includes('resource_exhausted') || safeErrorMsg.includes('quota') || safeErrorMsg.includes('429') || safeErrorMsg.includes('503')) {
      return res.status(503).json({ success: false, error: 'AI service is temporarily rate-limited. Please try again shortly.' });
    }
    if (safeErrorMsg.includes('api_key') || safeErrorMsg.includes('unauthorized') || safeErrorMsg.includes('authentication') || safeErrorMsg.includes('forbidden')) {
      return res.status(401).json({ success: false, error: 'AI service authentication failed.' });
    }
    
    return res.status(500).json({
      success: false,
      error: 'AI Coach request failed',
      details: safeErrorMsg || 'An unexpected runtime error occurred'
    });
  }
}
