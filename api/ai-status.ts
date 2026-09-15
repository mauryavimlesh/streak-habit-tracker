import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const isConfigured = Boolean(process.env.GEMINI_API_KEY);
  
  if (!isConfigured) {
    console.warn('[AI Status] Configuration missing: GEMINI_API_KEY is not set in the environment.');
  }

  return res.status(200).json({
    status: 'ok',
    configured: isConfigured,
    model: 'gemini-2.5-flash',
  });
}
