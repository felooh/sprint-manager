# Authentication Setup Guide

This guide will help you set up Google OAuth authentication for your Sprint Manager application.

## Overview

The authentication system uses:
- **NextAuth.js** for session management
- **Google OAuth** for user authentication
- **Email whitelist** for access control
- **Next.js 16 Proxy** for route protection (replaces deprecated middleware)

## Setup Steps

### 1. Generate NextAuth Secret

First, generate a secure random string for `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

Copy the output and update `.env.local`:

```env
NEXTAUTH_SECRET=your-generated-secret-here
```

### 2. Configure Google OAuth

#### Step 1: Create Google Cloud Project (if not already done)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select your existing `sprint-manager` project

#### Step 2: Enable Google+ API

1. In your Google Cloud project, go to **APIs & Services** → **Library**
2. Search for "Google+ API" or "Google Identity"
3. Click **Enable**

#### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **Internal** (if using Google Workspace) or **External**
3. Fill in the required fields:
   - **App name**: Sprint Manager
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **Save and Continue**
5. On the Scopes page, click **Save and Continue** (no additional scopes needed)
6. Review and click **Back to Dashboard**

#### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: Sprint Manager Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for local development)
     - `https://your-app.vercel.app` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (for local)
     - `https://your-app.vercel.app/api/auth/callback/google` (for production)
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

#### Step 5: Update Environment Variables

Update your `.env.local`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. Configure Allowed Emails

Allowed emails are now managed directly in your Google Sheet!

1. When you first run the app, it will automatically create an **AllowedEmails** sheet
2. The sheet will have these initial emails:
   - `you@gmail.com`
   - `yourteammember@gmail.com`
   - `gathagefelix@gmail.com`

To add or remove users, simply edit the **AllowedEmails** sheet in Google Sheets:
- Add a new email on a new row in column A
- Remove an email by deleting the row
- Changes take effect immediately on next login attempt

**Important**: Make sure at least one of these initial emails is yours, or update them in the sheet before testing!

### 4. Vercel Deployment

When deploying to Vercel, add these environment variables:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add:
   - `NEXTAUTH_SECRET` (use the same value from Step 1)
   - `NEXTAUTH_URL` (set to `https://your-app.vercel.app`)
   - `GOOGLE_CLIENT_ID` (from Step 2.4)
   - `GOOGLE_CLIENT_SECRET` (from Step 2.4)

**Important**: Make sure to also update the Google OAuth authorized redirect URIs to include your Vercel URL.

## How It Works

1. User visits your app URL
2. Middleware checks if they're authenticated
3. If not, redirects to `/login`
4. User clicks "Sign in with Google"
5. Google handles authentication
6. App checks if email is in `ALLOWED_EMAILS`
7. If yes → user gets access
8. If no → redirected to `/access-denied`

## Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000`
3. You should be redirected to the login page
4. Click "Sign in with Google"
5. Complete the Google sign-in flow
6. If your email is in the whitelist, you'll be logged in

## Troubleshooting

### "Access denied" error
- Make sure your email is in the `ALLOWED_EMAILS` array in `lib/auth.ts`

### "Invalid client" error
- Verify your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check that your redirect URIs match exactly in Google Cloud Console

### Redirect URI mismatch
- Ensure the authorized redirect URIs in Google Cloud Console match:
  - `http://localhost:3000/api/auth/callback/google` (development)
  - `https://your-vercel-app.vercel.app/api/auth/callback/google` (production)

### Session issues
- Clear your browser cookies and try again
- Verify `NEXTAUTH_SECRET` is set and is at least 32 characters

## Security Notes

- Never commit `.env.local` to git (it's already in `.gitignore`)
- Rotate your `NEXTAUTH_SECRET` periodically
- Keep `GOOGLE_CLIENT_SECRET` secure
- Only add trusted email addresses to the whitelist
- Consider using Google Workspace domain restriction for additional security

## Adding/Removing Users

Allowed emails are managed directly in Google Sheets - no code changes or deployments needed!

### To add a new user:
1. Open your Google Sheet
2. Go to the **AllowedEmails** tab
3. Add their email address in a new row in column A
4. That's it! They can sign in immediately

### To remove a user:
1. Open your Google Sheet
2. Go to the **AllowedEmails** tab
3. Delete the row with their email
4. They'll be denied access on their next login attempt

**Pro tip**: You can add a note or comment next to the email explaining who it belongs to (column B) for easier management.
