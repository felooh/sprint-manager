import { NextRequest, NextResponse } from 'next/server';

const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID!;
const BASE     = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

// ── JWT / Service Account auth ────────────────────────────────────────────
async function getAccessToken(): Promise<string> {
  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const header = { alg: 'RS256', typ: 'JWT' };

  function b64(obj: object) {
    return Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  const signingInput = `${b64(header)}.${b64(payload)}`;

  // Import the private key using Web Crypto API (available in Next.js edge/node)
  const keyData = privateKey
    .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
    .replace(/-----END RSA PRIVATE KEY-----/, '')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryKey = Buffer.from(keyData, 'base64');

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(signingInput)
  );

  const sig = Buffer.from(signature)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signingInput}.${sig}`;

  // Exchange JWT for access token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Auth error: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ── Route handler ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ranges = searchParams.getAll('ranges');

    if (!ranges.length) {
      return NextResponse.json({ error: 'No ranges provided' }, { status: 400 });
    }

    const token = await getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const q = ranges.map(r => 'ranges=' + encodeURIComponent(r)).join('&');
    const r = await fetch(`${BASE}/values:batchGet?${q}`, { headers });

    if (!r.ok) {
      const errorText = await r.text();
      throw new Error(`Sheets batchGet error: ${errorText}`);
    }

    const data = await r.json();
    const valueRanges = (data.valueRanges ?? []).map(
      (vr: { values?: string[][] }) => vr.values ?? []
    );

    return NextResponse.json({ valueRanges });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Sheets batchGet error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, sheetName, values } = await req.json();
    const token = await getAccessToken();
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    if (action === 'append') {
      const r = await fetch(
        `${BASE}/values/${encodeURIComponent(sheetName + '!A1')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        { method: 'POST', headers, body: JSON.stringify({ values }) }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(d));
      return NextResponse.json({ ok: true });
    }

    if (action === 'rewrite') {
      // Clear data rows first
      await fetch(
        `${BASE}/values/${encodeURIComponent(sheetName + '!A2:Z')}:clear`,
        { method: 'POST', headers }
      );
      // Write new rows if any
      if (values && values.length > 0) {
        const r = await fetch(
          `${BASE}/values/${encodeURIComponent(sheetName + '!A2')}?valueInputOption=RAW`,
          { method: 'PUT', headers, body: JSON.stringify({ values }) }
        );
        const d = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(d));
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'ensureSheets') {
      const meta = await fetch(`${BASE}`, { headers }).then(r => r.json());
      const existing = (meta.sheets ?? []).map(
        (s: { properties: { title: string } }) => s.properties.title
      );
      const needed   = ['Members', 'Sprints', 'Tasks', 'AllowedEmails'];
      const toCreate = needed.filter(n => !existing.includes(n));

      if (toCreate.length > 0) {
        const requests = toCreate.map(title => ({ addSheet: { properties: { title } } }));
        await fetch(`${BASE}:batchUpdate`, {
          method: 'POST', headers, body: JSON.stringify({ requests }),
        });

        // Write headers for new sheets
        const headerMap: Record<string, string[]> = {
          Members: ['ID','Name','Role','Product'],
          Sprints: ['ID','Name','Start','End','Active'],
          Tasks:   ['ID','Title','Product','SprintID','Status','Priority','AssigneeID','Description'],
          AllowedEmails: ['Email'],
        };
        for (const name of toCreate) {
          await fetch(
            `${BASE}/values/${encodeURIComponent(name + '!A1')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
            { method: 'POST', headers, body: JSON.stringify({ values: [headerMap[name]] }) }
          );
        }

        // Add initial allowed emails if creating AllowedEmails sheet
        if (toCreate.includes('AllowedEmails')) {
          const initialEmails = [
            ['you@gmail.com'],
            ['yourteammember@gmail.com'],
            ['gathagefelix@gmail.com'],
          ];
          await fetch(
            `${BASE}/values/${encodeURIComponent('AllowedEmails!A2')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
            { method: 'POST', headers, body: JSON.stringify({ values: initialEmails }) }
          );
        }
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Sheets API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}