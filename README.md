# SupportMate Ai

<p align="center">
  <img src="https://comp-bot-sntj.vercel.app/favicon.svg/" alt="SupportMate Ai logo" width="96" height="96" />
</p>

SupportMate Ai is a knowledge-based AI chatbot builder. It lets you upload PDFs, add images, and ingest website URLs into a private knowledge base, then chat with that knowledge from the dashboard or embed the assistant directly on your own website.

Live app: https://comp-bot-sntj.vercel.app/

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
```

Start the frontend:

```bash
npm run dev
```

The local app will run at:

```text
http://localhost:5173
```

### 4. Use The App Locally

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
