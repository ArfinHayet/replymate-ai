# SupportMate Admin

A separate admin frontend for users, uploaded content, and contact messages. Sign in with an existing Supabase email/password account whose email is included in the backend's `SUPABASE_ADMIN_EMAILS` list. Authorization is enforced by the backend on every admin request.

## Local setup

1. Copy `.env.example` to `.env.local` and set the same Supabase URL and anon key used by the main frontend, plus the backend URL.
2. Set `SUPABASE_ADMIN_EMAILS` in `backend/.env` to a comma-separated list of authorized emails.
3. Run `npm install` and `npm run dev` in this directory. The admin app runs on port 5174.

The design imports the canonical theme tokens from `../frontend/public/theme-tokens.css`, so build the admin project from this repository with its sibling `frontend/` directory present. The Supabase service role key stays on the backend.

## Contact messages

Run `npm run migration:run` from `backend/` before enabling contact submissions. The public `POST /contact-messages` endpoint saves the landing form's name, email, optional subject, and message; it does not send email notifications. The table is protected by row-level security and is accessed through the backend database connection.

The **Contact messages** menu reads `GET /admin/contact-messages` using the existing admin authorization. Search by sender, subject, or message; filter by received date; select 10, 20, or 50 rows per page; and expand **View message** to read the full submission. Messages are displayed newest first. This inbox is read-only.
