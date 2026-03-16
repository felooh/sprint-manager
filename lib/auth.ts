import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// ── Fetch allowed emails from Google Sheets ──────────────────────────────
async function getAllowedEmails(): Promise<string[]> {
  try {
    const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID!;
    const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

    // Get access token using service account
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
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
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Token error:', tokenData);
      return []; // Return empty array on error
    }

    // Fetch allowed emails from sheet
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenData.access_token}`,
    };

    const range = encodeURIComponent('AllowedEmails!A2:A');
    const response = await fetch(`${BASE}/values/${range}`, { headers });

    if (!response.ok) {
      console.error('Failed to fetch allowed emails from Google Sheets');
      return [];
    }

    const data = await response.json();
    const emails = (data.values ?? [])
      .flat()
      .filter((email: string) => email && email.trim())
      .map((email: string) => email.trim().toLowerCase());

    return emails;
  } catch (error) {
    console.error('Error fetching allowed emails:', error);
    return [];
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Fetch allowed emails from Google Sheets
      const allowedEmails = await getAllowedEmails();

      // Check if the user's email is in the allowed list
      if (user.email && allowedEmails.includes(user.email.toLowerCase())) {
        return true;
      }

      // Redirect to access denied page
      return '/access-denied';
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/access-denied',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
