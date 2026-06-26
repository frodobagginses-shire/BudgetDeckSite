# Auth setup (F-5) — Google sign-in

The app code is done. To make sign-in actually work you need to (1) create a
Google OAuth client, (2) turn on the Google provider in Supabase, and (3) make
sure the public env vars are present. None of this requires code changes.

## 1. Create a Google OAuth client

1. Go to the **Google Cloud Console** → APIs & Services → **Credentials**.
2. Configure the **OAuth consent screen** (External; app name "Budget Deck Site";
   add your email). You can keep it in "Testing" while developing.
3. **Create Credentials → OAuth client ID → Web application**.
4. Under **Authorized redirect URIs**, add the Supabase callback (this is the
   value Supabase shows on its Google provider page — it looks like):
   ```
   https://slxrifipsxpmnzdsuhuk.supabase.co/auth/v1/callback
   ```
5. Copy the **Client ID** and **Client secret**.

800714161480-0as950ac5o7hruutfo39ahicmr8pgqgh.apps.googleusercontent.com

## 2. Enable Google in Supabase

1. Supabase dashboard → **Authentication → Providers → Google** → enable.
2. Paste the **Client ID** and **Client secret** from step 1, and save.
3. Under **Authentication → URL Configuration**, set:
   - **Site URL**: your production URL (your Vercel domain), e.g.
     `https://budget-deck-site.vercel.app`
   - **Redirect URLs**: add both
     `http://localhost:3000/**` and `https://YOUR-VERCEL-DOMAIN/**`
     so the app's `/auth/callback` route is allowed in dev and prod.

## 3. Public env vars

The app needs these in **both** Vercel (already set) and your local `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://slxrifipsxpmnzdsuhuk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
```

Get the anon key from Supabase → Project Settings → API → `anon` `public`.
Locally, the fastest path is `npx vercel env pull .env.local --environment=production`,
which writes all of them at once.

## 4. Try it

```bash
npm run dev
```

- Visit `http://localhost:3000/login` → click **Continue with Google**.
- After approving, you land on `/account` showing your handle/email.
- A row is auto-created in `public.users` (via the `on_auth_user_created`
  trigger from migration 0001) — no extra code needed.
- `/account` redirects to `/login` when signed out; sign-out returns you to
  `/login`.

## How it fits together (for reference)

- `src/lib/supabase/{client,server,middleware}.ts` — Supabase clients.
- `src/middleware.ts` — refreshes the session on every request.
- `src/app/auth/callback/route.ts` — exchanges the OAuth code for a session.
- `src/app/login/page.tsx` + `src/components/auth/*` — sign-in / sign-out UI.
- `src/app/account/page.tsx` — example protected page.
