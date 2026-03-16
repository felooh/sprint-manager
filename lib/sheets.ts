const API_KEY  = process.env.NEXT_PUBLIC_SHEETS_API_KEY!;
const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID!;
const BASE     = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function sheetsGet(range: string): Promise<string[][]> {
  const r = await fetch(`${BASE}/values/${encodeURIComponent(range)}?key=${API_KEY}`);
  if (!r.ok) throw new Error(`Sheets GET error: ${await r.text()}`);
  const d = await r.json();
  return d.values ?? [];
}

export async function sheetsBatchGet(ranges: string[]): Promise<string[][][]> {
  const q = ranges.map(r => 'ranges=' + encodeURIComponent(r)).join('&');
  const r = await fetch(`${BASE}/values:batchGet?${q}&key=${API_KEY}`);
  if (!r.ok) throw new Error(`Sheets batchGet error: ${await r.text()}`);
  const d = await r.json();
  return (d.valueRanges ?? []).map((vr: { values?: string[][] }) => vr.values ?? []);
}

export async function sheetsAppend(sheetName: string, values: string[][]): Promise<void> {
  const r = await fetch(
    `${BASE}/values/${encodeURIComponent(sheetName + '!A1')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS&key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values }) }
  );
  if (!r.ok) throw new Error(`Sheets append error: ${await r.text()}`);
}

export async function sheetsClear(range: string): Promise<void> {
  await fetch(
    `${BASE}/values/${encodeURIComponent(range)}:clear?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  );
}

export async function sheetsRewrite(sheetName: string, rows: string[][]): Promise<void> {
  await sheetsClear(`${sheetName}!A2:Z`);
  if (!rows.length) return;
  const r = await fetch(
    `${BASE}/values/${encodeURIComponent(sheetName + '!A2')}?valueInputOption=RAW&key=${API_KEY}`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: rows }) }
  );
  if (!r.ok) throw new Error(`Sheets rewrite error: ${await r.text()}`);
}

export async function ensureSheets(): Promise<void> {
  const meta = await fetch(`${BASE}?key=${API_KEY}`).then(r => r.json());
  const existing = (meta.sheets ?? []).map((s: { properties: { title: string } }) => s.properties.title);
  const needed   = ['Members', 'Sprints', 'Tasks'];
  const toCreate = needed.filter(n => !existing.includes(n));
  if (!toCreate.length) return;

  const requests = toCreate.map(title => ({ addSheet: { properties: { title } } }));
  await fetch(`${BASE}:batchUpdate?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });

  if (toCreate.includes('Members'))
    await sheetsAppend('Members', [['ID','Name','Role','Product']]);
  if (toCreate.includes('Sprints'))
    await sheetsAppend('Sprints', [['ID','Name','Start','End','Active']]);
  if (toCreate.includes('Tasks'))
    await sheetsAppend('Tasks',   [['ID','Title','Product','SprintID','Status','Priority','AssigneeID','Description']]);
}
