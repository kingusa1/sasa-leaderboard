import crypto from 'crypto';

// In-memory token store (persists during serverless function lifecycle)
let oauthApiKey: string | null = null;

export function getOpenRouterKey(): string {
  // Priority: OAuth-obtained key > env var
  return oauthApiKey || process.env.OPENROUTER_API_KEY || '';
}

export function setOpenRouterKey(key: string) {
  oauthApiKey = key;
}

// PKCE utilities
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Build the OAuth authorization URL
export function getAuthUrl(callbackUrl: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    callback_url: callbackUrl,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://openrouter.ai/auth?${params.toString()}`;
}

// Exchange authorization code for API key
export async function exchangeCodeForKey(
  code: string,
  codeVerifier: string
): Promise<{ key: string; user_id?: string }> {
  const res = await fetch('https://openrouter.ai/api/v1/auth/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      code_challenge_method: 'S256',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter OAuth exchange failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data;
}
