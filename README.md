# SupportMate Ai

<p align="center">
  <img src="https://www.supportmate.online/favicon.svg/" alt="SupportMate Ai logo" width="96" height="96" />
</p>

SupportMate Ai is a knowledge-based AI chatbot builder. It lets you upload PDFs, add images, and ingest website URLs into a private knowledge base, then chat with that knowledge from the dashboard or embed the assistant directly on your own website.

Live app: https://www.supportmate.online/

## What SupportMate Ai Does

SupportMate Ai turns your business content into a website-ready AI assistant.

- Upload PDF files and ask questions based on their content.
- Add images with AI-generated titles and descriptions so they can be used as knowledge.
- Ingest web pages by URL and turn page content into searchable knowledge.
- Chat with your saved knowledge base from the dashboard.
- Keep chat history so previous conversations are easy to review.
- Create embeddable chatbot widgets for your websites.
- Add allowed domains so only approved websites can use your widget.
- Manage uploaded PDFs, images, web pages, company profile details, and widget keys from one dashboard.

## How It Works

1. Create an account and sign in.
2. Add knowledge by uploading PDFs, saving images, or ingesting website URLs.
3. SupportMate Ai reads that content and prepares it for AI search.
4. Ask questions in the chat page, or let website visitors ask questions through the embedded widget.
5. The assistant searches your knowledge base and answers from the information you provided.

If the answer is not available in your uploaded knowledge, the assistant is designed to avoid making things up and will tell the user it does not have enough information.

## Main Features

### Knowledge Base

The knowledge base is the content SupportMate Ai uses to answer questions.

You can add:

- PDFs such as product guides, service documents, FAQs, contracts, manuals, or policy files.
- Website URLs such as help articles, landing pages, documentation, or public company pages.
- Images with descriptions, useful for products, visual references, catalogs, and assets.

Each user has their own knowledge base, so uploaded content and chat results stay tied to the signed-in account.

### PDF Uploads

Upload a PDF from the dashboard. SupportMate Ai extracts the readable text, breaks it into searchable sections, and stores it as knowledge for future answers.

You can also view, rename, and delete PDFs after upload.

### URL Ingestion

Paste one or more URLs into the web pages section. SupportMate Ai fetches the page content and adds it to your knowledge base.

This is useful when your chatbot needs to answer from public pages such as:

- Product pages
- Documentation
- Pricing pages
- Help center articles
- Company information pages

You can also refetch a saved web page later if the original page changes.

### Image Knowledge

SupportMate Ai can analyze uploaded images and suggest a title and description. Once saved, those details become part of the knowledge base.

This helps the assistant answer questions about visual items such as products, screenshots, designs, or reference images.

### Chat

The chat page lets you test your assistant before embedding it on a website. Ask questions naturally, and SupportMate Ai will search your uploaded knowledge to generate an answer.

The app also stores chat history, making it easier to review past conversations and understand what users are asking.

### Website Embed

SupportMate Ai can be embedded on any approved website with a small script tag.

From the Embed page:

1. Create a widget key.
2. Add your website domain to the allowed domains list.
3. Copy the generated embed code.
4. Paste it into your website.

The generated code looks like this:

```html
<script
  src="https://your-api-url.com/widget.js"
  data-key="YOUR_WIDGET_KEY"
  data-api="https://your-api-url.com">
</script>
```

For local testing, the API URL is usually:

```html
<script
  src="http://localhost:3000/widget.js"
  data-key="YOUR_WIDGET_KEY"
  data-api="http://localhost:3000">
</script>
```

Use the exact snippet shown inside the app because it includes your real widget key.

## Local Setup

### Requirements

Before running the project locally, install or create:

- Node.js
- npm
- A Supabase project
- A Google AI API key

### 1. Clone The Project

```bash
git clone <your-repository-url>
cd Comp-bot
```

### 2. Set Up The Backend

Go into the backend folder:

```bash
cd backend
npm install
```

Create your backend environment file:

```bash
copy .env.example .env
```

On macOS or Linux, use:

```bash
cp .env.example .env
```

Fill in the important values in `backend/.env`:

```env
DATABASE_URL=your_supabase_database_connection_string
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

LLM_CHAT_API_KEY=your_google_ai_api_key
LLM_EMBEDDING_API_KEY=your_google_ai_api_key
GOOGLE_API_KEY=your_google_ai_api_key

APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
PORT=3000
```

Start the backend:

```bash
npm run start:dev
```

The backend will run at:

```text
http://localhost:3000
```

### 3. Set Up The Frontend

Open a new terminal and go into the frontend folder:

```bash
cd frontend
npm install
```

Create or update `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

Start the frontend:

```bash
npm run dev
```

The local app will run at:

```text
http://localhost:5173
```

### 4. Configure Cloudflare Turnstile

Contact us, email/password login, and registration require a Turnstile security check. The frontend needs a public site key; the backend and Supabase need its matching secret key. Google OAuth, password recovery, and confirmation resend keep their current UI.

1. In the [Cloudflare dashboard](https://dash.cloudflare.com/), open **Turnstile**, add a widget, choose **Managed**, and allow `supportmate.online` and `www.supportmate.online` for production. Keep pre-clearance disabled. Use a separate widget for other environments.
2. Set `VITE_TURNSTILE_SITE_KEY` in the frontend build environment. Set these backend variables in `.env` locally and `.env.lambda` for deployment:

   ```dotenv
   TURNSTILE_SECRET_KEY=your_turnstile_secret_key
   TURNSTILE_ALLOWED_HOSTNAMES=supportmate.online,www.supportmate.online
   ```

3. Build/deploy the frontend and backend together before changing the live Supabase CAPTCHA setting. Vite embeds the public key at build time, so changing it requires rebuilding the frontend. Lambda already loads the backend variables from `.env.lambda` during deployment.
4. After both deployments contain the integration, open **Authentication → Bot and Abuse Protection** in the intended Supabase project, enable CAPTCHA, select **Cloudflare Turnstile**, and enter the matching secret key. The [Supabase CAPTCHA guide](https://supabase.com/docs/guides/auth/auth-captcha) describes this setting. Supabase verifies login and signup tokens; the backend verifies contact tokens directly with Cloudflare. A token must never be verified by both. Authentication CAPTCHA enforcement is not active until this dashboard setting is enabled.
5. Verify all three forms with real production keys. Check that direct anonymous Supabase password-login and signup requests without a CAPTCHA token fail. Also check Google OAuth, password reset, confirmation resend, and token refresh.

The backend deliberately uses its isolated service-role client for password-reset emails and confirmation resends so those existing buttons still work after Supabase enables CAPTCHA. Login and signup continue to use the anonymous client and require CAPTCHA. Keep service-role credentials exclusively on the backend.

For local development, configure an **isolated development Supabase project or local instance** with Cloudflare's public test secret and use:

```dotenv
# frontend/.env.local
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA

# backend/.env, and the development Supabase CAPTCHA setting
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
TURNSTILE_ALLOWED_HOSTNAMES=localhost,127.0.0.1
```

Never replace the live Supabase CAPTCHA secret with a test secret. The backend rejects test secrets in production. Test keys still call Cloudflare but bypass contact action/hostname matching because their metadata is synthetic. See [Cloudflare's test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) for failing and expired-token scenarios.

Cloudflare displays **“For testing only. If seen, report to site owner.”** when these demo keys are used. This notice is expected in local development and is absent with a real widget key. To use a real widget locally, create a separate development widget allowing `localhost` and `127.0.0.1`, configure its matching site/secret keys, and keep it separate from the production widget.

If the site key is missing or the widget cannot load, these forms stay disabled and show an error. Rejected or expired tokens require a fresh check. Missing backend configuration or a Cloudflare outage returns a retryable error without saving a contact message. Tokens and secret keys are never persisted with contact messages.

### 5. Use The App Locally

After both servers are running:

1. Open `http://localhost:5173`.
2. Sign up or log in.
3. Add company details if needed.
4. Upload PDFs, add images, or ingest URLs.
5. Ask questions in the chat page.
6. Create a widget key from the Embed page.
7. Add your website domain.
8. Copy the embed script into your website.

## Project Structure

```text
backend/   API, authentication, knowledge ingestion, chat, and widget script
frontend/  Dashboard, upload pages, chat page, and embed settings
```

## Notes

- The dashboard requires login.
- Widget visitors do not need an account.
- Localhost is allowed for widget testing.
- For a live website, add the website origin in Widget Settings, for example `https://example.com`.
- The embed code should be copied from the app so it includes the correct widget key and API URL.
