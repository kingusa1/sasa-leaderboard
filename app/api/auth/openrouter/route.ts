import { NextResponse } from 'next/server';
import { generateCodeVerifier, generateCodeChallenge, getAuthUrl } from '@/lib/openrouter-auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store code_verifier in a cookie so the callback can use it
  const cookieStore = await cookies();
  cookieStore.set('openrouter_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  // Redirect to OpenRouter auth
  const callbackUrl = `${origin}/api/auth/openrouter/callback`;
  const authUrl = getAuthUrl(callbackUrl, codeChallenge);

  return NextResponse.redirect(authUrl);
}
