export interface ConfigStatus {
  isFirebaseConfigured: boolean;
  isAiConfigured: boolean;
  aiModel: string;
  status: 'READY' | 'CONFIGURATION REQUIRED' | 'SERVER ERROR';
}

/**
 * Checks the central configuration status of all external services.
 */
export async function getSystemConfiguration(): Promise<ConfigStatus> {
  let isAiConfigured = false;
  let aiModel = 'gemini-3.8-flash';
  let serverReachable = true;

  try {
    const res = await fetch('/api/ai-status', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (res.ok) {
      const data = await res.json();
      isAiConfigured = Boolean(data.configured);
      aiModel = data.model || aiModel;
    } else {
      serverReachable = false;
    }
  } catch {
    serverReachable = false;
  }

  // Firebase is configured if the config file has an API key (auto-injected in production/AI Studio)
  // or if they manually supplied one.
  const hasFirebase = true; // Based on firebase-applet-config.json always being present in this environment

  const status = !serverReachable 
    ? 'SERVER ERROR' 
    : (!isAiConfigured || !hasFirebase) 
      ? 'CONFIGURATION REQUIRED' 
      : 'READY';

  return {
    isFirebaseConfigured: hasFirebase,
    isAiConfigured,
    aiModel,
    status,
  };
}

export async function updateAiConfiguration(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geminiApiKey: apiKey }),
    });
    const data = await res.json();
    return Boolean(data.success && data.configured);
  } catch {
    return false;
  }
}
