export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── READ — goes through our server-side API route (uses service account) ──
export async function sheetsBatchGet(ranges: string[]): Promise<string[][][]> {
  const q = ranges.map(r => 'ranges=' + encodeURIComponent(r)).join('&');
  const r = await fetch(`/api/sheets?${q}`);
  if (!r.ok) {
    const text = await r.text();
    let errorMsg = 'Failed to read from Google Sheets';
    try {
      const json = JSON.parse(text);
      if (json.error) errorMsg = json.error;
    } catch {
      if (text) errorMsg = text;
    }
    throw new Error(errorMsg);
  }
  const d = await r.json();
  return d.valueRanges ?? [];
}

// ── WRITE — goes through our server-side API route (uses service account) ─
async function sheetsWrite(body: object): Promise<void> {
  const r = await fetch('/api/sheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok || !d.ok) {
    const errorMsg = d.error || 'Failed to write to Google Sheets';
    throw new Error(errorMsg);
  }
}

export async function ensureSheets(): Promise<void> {
  await sheetsWrite({ action: 'ensureSheets' });
}

export async function sheetsAppend(sheetName: string, values: string[][]): Promise<void> {
  await sheetsWrite({ action: 'append', sheetName, values });
}

export async function sheetsRewrite(sheetName: string, rows: string[][]): Promise<void> {
  await sheetsWrite({ action: 'rewrite', sheetName, values: rows });
}