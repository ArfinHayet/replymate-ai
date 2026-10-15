# SupportMate Admin

A separate admin frontend for users, uploaded content, and contact messages. Sign in with an existing Supabase email/password account whose email is included in the backend's `SUPABASE_ADMIN_EMAILS` list. Authorization is enforced by the backend on every admin request.

## Local setup

1. Copy `.env.example` to `.env.local` and set the same Supabase URL and anon key used by the main frontend, plus the backend URL.
2. Set `SUPABASE_ADMIN_EMAILS` in `backend/.env` to a comma-separated list of authorized emails.
3. Run `npm install` and `npm run dev` in this directory. The admin app runs on port 5174.

The design imports the canonical theme tokens from `../frontend/public/theme-tokens.css`, so build the admin project from this repository with its sibling `frontend/` directory present. The Supabase service role key stays on the backend.

## Vercel deployment

Use the separate `supportmate-admin` Vercel project with **Production Branch** `deploy/admin-console`, **Root Directory** `admin`, **Framework Preset** Vite, **Node.js Version** 22.x, **Install Command** `npm ci`, **Build Command** `npm run build`, and **Output Directory** `dist`. Enable **Include source files outside of the Root Directory** so the shared theme import is available.

Set the production build variables `VITE_API_URL` to the public backend URL, and `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the matching Supabase project values. Do not add service-role credentials to the frontend. Vite embeds these public variables during the build; a change requires a new deployment.

Add `admin.supportmate.online` to this Vercel project and use the DNS record Vercel specifies for that domain. The included `vercel.json` serves the app for direct page requests. The backend must already expose `/admin` routes, allow the admin origin through CORS, and include authorized emails in `SUPABASE_ADMIN_EMAILS`.

The admin login uses Supabase email/password authentication without a CAPTCHA widget. If CAPTCHA is enabled in the Supabase project, integrate a matching widget and send its token before enabling this login in production.

## Contact messages

This focused admin release reads the existing production `public.contact_messages` table through the backend database connection. It does not add a public contact-submission endpoint or run database migrations. A separate contact-form release is responsible for creating that table in new environments and accepting submissions.

The **Contact messages** menu reads `GET /admin/contact-messages` using the existing admin authorization. Search by sender, subject, or message; filter by received date; select 10, 20, or 50 rows per page; and expand **View message** to read the full submission. Messages are displayed newest first. This inbox is read-only.
