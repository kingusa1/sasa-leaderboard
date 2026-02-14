import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { processChatQuery } from '@/lib/ai-agent';
import { setOpenRouterKey } from '@/lib/openrouter-auth';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Restore OAuth key from cookie (serverless functions are stateless)
    const cookieStore = await cookies();
    const oauthKey = cookieStore.get('openrouter_oauth_key')?.value;
    if (oauthKey) {
      setOpenRouterKey(oauthKey);
    }

    const reply = await processChatQuery(message);
    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { reply: "Sorry, I'm having trouble connecting right now. Please try again." },
      { status: 200 }
    );
  }
}
