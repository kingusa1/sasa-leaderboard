import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForKey, setOpenRouterKey } from '@/lib/openrouter-auth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new NextResponse(
      html('OpenRouter OAuth Failed', '<p style="color:#ef4444">No authorization code received from OpenRouter.</p>'),
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Get the code_verifier from cookie
  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get('openrouter_code_verifier')?.value;

  if (!codeVerifier) {
    return new NextResponse(
      html('OAuth Session Expired', '<p style="color:#ef4444">Session expired. Please try connecting again.</p>'),
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    // Exchange the code for an API key
    const result = await exchangeCodeForKey(code, codeVerifier);

    // Store the key in memory for immediate use
    setOpenRouterKey(result.key);

    // Clear the verifier cookie
    cookieStore.delete('openrouter_code_verifier');

    // Store the key in a secure cookie for persistence across serverless invocations
    cookieStore.set('openrouter_oauth_key', result.key, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });

    return new NextResponse(
      html('OpenRouter Connected!', `
        <div style="text-align:center">
          <div style="font-size:48px;margin-bottom:16px">✅</div>
          <h2 style="color:#10b981;margin-bottom:8px">OpenRouter Connected Successfully</h2>
          <p style="color:#6b7280;margin-bottom:24px">OAuth2 authentication complete. OpenRouter is now available as a fallback AI provider.</p>
          <a href="/" style="display:inline-block;padding:12px 24px;background:#002E59;color:white;border-radius:8px;text-decoration:none;font-weight:600">Back to Dashboard</a>
        </div>
      `),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error: any) {
    console.error('OpenRouter OAuth exchange error:', error);
    return new NextResponse(
      html('OAuth Exchange Failed', `
        <p style="color:#ef4444">Failed to exchange code for API key.</p>
        <p style="color:#6b7280;font-size:14px">${error.message}</p>
      `),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

function html(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: system-ui, sans-serif; max-width: 480px; margin: 80px auto; padding: 24px; }
  h2 { margin-top: 0; }
</style>
</head><body>${body}</body></html>`;
}
