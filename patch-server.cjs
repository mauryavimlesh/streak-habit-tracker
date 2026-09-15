const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newEndpoint = `app.post('/api/ai-coach', async (req, res) => {
  const logs = [];
  const addLog = (msg) => {
    const timestamp = new Date().toISOString();
    console.log(\`[AI-COACH \${timestamp}] \${msg}\`);
    logs.push(msg);
  };

  try {
    addLog('Request received');
    const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
    addLog(\`API key exists: \${hasApiKey}\`);

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
        addLog('Failed to parse request body as JSON');
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
      }
    }

    const { message, messages, history, context } = bodyData || {};
    
    if (!message && (!messages || !messages.length)) {
      addLog('Validation failed: A message is required');
      return res.status(400).json({ success: false, error: 'A message is required.' });
    }
    addLog('Request validation result: Passed');

    const authHeader = req.headers.authorization || req.headers.Authorization;
    let userId = null;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        userId = decodedToken.uid;
        addLog('User authentication verified');
      } catch (err) {
        addLog('User authentication warning: Invalid ID token');
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
        addLog('Fetched user context from Firestore');
      } catch (err) {
        addLog('Warning: Failed to fetch user habits from Firestore');
      }
    }

    const ai = getAiClient();
    if (!ai) {
      addLog('Failed to initialize AI client');
      return res.status(500).json({ success: false, error: 'AI client failed to initialize.' });
    }

    const systemInstruction = \`You are the STREAK AI Coach, a master habit strategist and empathetic personal performance mentor.
STREAK's core philosophy is "Small actions. Every day." grounded in atomic habits, behavioral momentum, and Stoic mindfulness.
Core Principles:
- Tone: Calm, encouraging, grounded, direct, and actionable. Never use hollow buzzwords or overly generic cheerleading.
- Methodology: Focus on reducing starting friction, habit stacking, identity-based habits, and rebounding quickly after missed days ("Never miss twice").
- Style: Provide crisp, practical guidance (2-4 paragraphs or concise bullet points). Format clearly for mobile viewing.
\${fetchedContext ? \`USER & HABIT CONTEXT:\\n\${typeof fetchedContext === 'string' ? fetchedContext : JSON.stringify(fetchedContext, null, 2)}\\nPersonalize your response by referencing their habits, streak count, or goals whenever relevant.\` : ''}\`.trim();

    let contents;
    const conversationList = Array.isArray(messages) ? messages : Array.isArray(history) ? history : null;
    
    if (conversationList && conversationList.length > 0) {
      contents = conversationList.map((item) => {
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
    const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash'];
    let lastError = null;
    let selectedModel = '';

    addLog('Gemini request started');
    
    for (const model of candidateModels) {
      addLog(\`Attempting model: \${model}\`);
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
        
        addLog(\`Gemini request completed with model: \${model}\`);
        
        addLog('Response parsing started');
        if (response && response.text) {
          responseText = response.text.trim();
          addLog('Response parsing completed');
          break;
        } else {
          addLog('Response parsing warning: No text returned');
        }
      } catch (err) {
        const errorMsg = err?.message || String(err);
        addLog(\`Model \${model} attempt failed: \${errorMsg}\`);
        lastError = err;
      }
    }

    if (!responseText) {
      addLog('All models failed to return a valid response');
      throw lastError || new Error('No response from AI model after exhausting candidates');
    }

    addLog(\`Final response status: 200 (Success)\`);
    return res.status(200).json({
      success: true,
      text: responseText,
      reply: responseText,
      model_used: selectedModel
    });

  } catch (error) {
    const errName = error?.name || 'UnknownError';
    const errMessage = error?.message || String(error);
    addLog(\`Exact caught error name: \${errName}, message: \${errMessage}\`);
    
    const safeErrorMsg = errMessage.replace(/key=[^&\\s]+/gi, 'key=HIDDEN');

    addLog(\`Final response status: 500 (Catch Block Fallback)\`);
    return res.status(500).json({
      success: false,
      error: 'AI Coach request failed',
      details: safeErrorMsg || 'An unexpected runtime error occurred'
    });
  }
});`;

// Find the start of the app.post('/api/ai-coach' function
const startIndex = code.indexOf("app.post('/api/ai-coach', async (req, res) => {");
if (startIndex !== -1) {
  // Find the end of it (the next app.use or listen, or the end)
  const appListenIndex = code.indexOf("if (process.env.NODE_ENV !== 'production')", startIndex);
  if (appListenIndex !== -1) {
    code = code.substring(0, startIndex) + newEndpoint + '\n\n  ' + code.substring(appListenIndex);
    fs.writeFileSync('server.ts', code);
    console.log('Successfully patched server.ts');
  }
}

