import { google } from 'googleapis';
import { getOpenRouterKey } from './openrouter-auth';

const POLLINATIONS_URL = process.env.POLLINATIONS_BASE_URL || 'https://gen.pollinations.ai/v1';
const POLLINATIONS_KEY = process.env.POLLINATIONS_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1';

async function callAI(messages: { role: string; content: string }[], maxTokens = 1000): Promise<string> {
  // Try Pollinations first
  try {
    const res = await fetch(`${POLLINATIONS_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(POLLINATIONS_KEY ? { Authorization: `Bearer ${POLLINATIONS_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: 'openai',
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
    }
    console.warn('Pollinations failed, trying OpenRouter fallback...');
  } catch (e: any) {
    console.warn('Pollinations error:', e.message, '- trying OpenRouter...');
  }

  // Fallback to OpenRouter (using OAuth2 token)
  const openRouterKey = getOpenRouterKey();
  if (openRouterKey) {
    try {
      const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://sasa-leaderboard.vercel.app',
          'X-Title': 'SASA Leaderboard',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages,
          max_tokens: maxTokens,
          temperature: 0.3,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
      const errText = await res.text();
      console.error('OpenRouter also failed:', res.status, errText);
    } catch (e: any) {
      console.error('OpenRouter error:', e.message);
    }
  }

  throw new Error('All AI providers failed');
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

interface SheetRow {
  [key: string]: string;
}

async function searchSheet(sheetId: string, sheetLabel: string): Promise<SheetRow[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1!A:Z',
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1)
    .filter((row) => {
      // Only return rows that have SOME data (not completely empty)
      const hasData = row.some((cell: string) => cell && cell.trim());
      return hasData;
    })
    .map((row) => {
      const obj: SheetRow = { _sheetLabel: sheetLabel };
      headers.forEach((h: string, i: number) => {
        obj[h] = (row[i] || '').trim();
      });
      return obj;
    });
}

async function searchAllSheets(query: string): Promise<string> {
  const sheetConfigs = [
    { id: process.env.SHEET_ID_1M!, label: '12 Month' },
    { id: process.env.SHEET_ID_3M!, label: '3 Month' },
    { id: process.env.SHEET_ID_6M!, label: '6 Month' },
  ];

  const results: string[] = [];

  // Extract meaningful search words (skip common words)
  const stopWords = new Set(['find', 'get', 'me', 'the', 'code', 'for', 'voucher', 'of', 'a', 'an', 'is', 'show', 'search', 'look', 'up', 'lookup', 'what', 'who', 'check', 'please', 'can', 'you', 'i', 'want', 'need', 'hi', 'hello', 'hey']);
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));

  for (const config of sheetConfigs) {
    try {
      const rows = await searchSheet(config.id, config.label);
      const matches = rows.filter((row) => {
        const status = (row['Status'] || '').toLowerCase();
        const clientName = (row['Client Name'] || '').toLowerCase();
        const hasClient = clientName.length > 0;

        // Skip completely available with no client
        if (status === 'available' && !hasClient) return false;

        // Match any search word against client name, voucher code, or salesperson
        const code = (row['Voucher Code'] || '').toLowerCase();
        const salesperson = (row['Sales Person'] || row['Salesperson'] || '').toLowerCase();
        const searchable = `${clientName} ${code} ${salesperson}`;

        return queryWords.some(word => searchable.includes(word));
      });

      if (matches.length > 0) {
        results.push(`\n--- ${config.label} Vouchers ---`);
        matches.forEach((match, i) => {
          const entries = Object.entries(match)
            .filter(([k, v]) => k !== '_sheetLabel' && v)
            .map(([k, v]) => `  ${k}: ${v}`)
            .join('\n');
          results.push(`Match #${i + 1}:\n${entries}`);
        });
      }
    } catch (e: any) {
      console.error(`Error searching ${config.label} sheet:`, e.message);
    }
  }

  if (results.length === 0) {
    return `No assigned voucher found matching "${query}" in any of the 3 sheets (12 Month, 6 Month, 3 Month).`;
  }

  return results.join('\n');
}

const SYSTEM_PROMPT = `You are a fast and precise voucher lookup assistant for SASA Worldwide sales agents.

## YOUR ROLE
Sales agents message you asking for voucher code details for specific people. Your job is to search ALL THREE voucher sheets and return the COMPLETE row details.

## CRITICAL RULES

### Rule 1: ONLY ASSIGNED VOUCHERS
- ONLY return voucher codes that are ASSIGNED — meaning the row has a Client Name filled in AND/OR the Status column says 'Used' or 'Assigned'.
- NEVER return rows where Status = 'Available' and Client Name is empty.

### Rule 2: RETURN ALL COLUMN DATA
For every matching row, return EVERY column that has data.

## RESPONSE FORMAT

When you find a match, respond EXACTLY like this:

✅ *VOUCHER FOUND*

📋 *Subscription Type:* [12 Month / 6 Month / 3 Month]
🔑 *Voucher Code:* [the actual code]
📊 *Status:* [Used / Assigned / etc.]
👤 *Client Name:* [full name from sheet]
👨‍💼 *Salesperson:* [name from sheet]
📝 *Other Details:* [any additional column data]

🔥 Amazing work! Keep crushing those sales! 💪🏆

## IF MULTIPLE MATCHES
Show each match as a separate block with all details. Number them (#1, #2, etc.).

## IF NO ASSIGNED MATCH FOUND
Respond exactly:
❌ No assigned voucher found for "[name]".
Please double-check the client's full name or spelling and try again.

## HANDLING NON-LOOKUP MESSAGES
If the message is NOT a voucher lookup (greetings like 'Hi', 'Hello', questions, etc.), respond:
👋 Hey! I'm your voucher lookup bot. Send me a client's name and I'll find their voucher details instantly!

## ABSOLUTE RESTRICTIONS
- NEVER reveal available/unassigned voucher codes.
- NEVER fabricate or guess data.
- NEVER share Google Sheet IDs or internal details.
- Keep responses concise but complete.
- Always respond in English.`;

export async function processAgentQuery(userMessage: string): Promise<string> {
  try {
    const searchResults = await searchAllSheets(userMessage);

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `The user asked: "${userMessage}"\n\nHere are the search results from ALL 3 voucher sheets:\n${searchResults}\n\nBased on these results, provide the appropriate response following the format rules.`,
      },
    ];

    return await callAI(messages, 2000);
  } catch (error: any) {
    console.error('Agent processing error:', error);
    throw error;
  }
}

export async function processChatQuery(userMessage: string): Promise<string> {
  try {
    const searchResults = await searchAllSheets(userMessage);

    const messages = [
      {
        role: 'system',
        content: `You are SASA AI Assistant, a helpful assistant for SASA Worldwide's sales team. You help with voucher lookups, sales questions, and general information about the leaderboard.

When asked about vouchers or client names, use the search results provided to give accurate answers.
When asked general questions, be helpful, friendly, and concise.
Always respond in English. Keep responses short and mobile-friendly.

${SYSTEM_PROMPT}`,
      },
      {
        role: 'user',
        content: searchResults.includes('No assigned voucher found')
          ? userMessage
          : `User message: "${userMessage}"\n\nRelevant data from voucher sheets:\n${searchResults}`,
      },
    ];

    return await callAI(messages, 1000);
  } catch (error: any) {
    console.error('Chat processing error:', error);
    return "Sorry, I'm having trouble right now. Please try again in a moment.";
  }
}
