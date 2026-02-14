import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { reply: "AI agent is not configured yet. Please set the N8N_WEBHOOK_URL in the environment variables." },
        { status: 200 }
      );
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ reply: data.output || data.response || data.text || data.message || JSON.stringify(data) });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { reply: "Sorry, I'm having trouble connecting right now. Please try again." },
      { status: 200 }
    );
  }
}
