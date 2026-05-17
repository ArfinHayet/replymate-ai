<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  # NestJS RAG PDF Chatbot (MCP Tool Retrieval)

A NestJS backend that lets an admin upload PDFs as a knowledge base and lets
users chat with an AI that answers **strictly** from those documents.

**Architecture highlight:** Document retrieval is LLM-driven via an MCP
`search_documents` tool. The model decides when and how to search, results
arrive as structured `function_response` messages (never in the system prompt),
eliminating prompt injection via PDF content.

## Stack
- NestJS + TypeORM
- Supabase (PostgreSQL + pgvector)
- Google `text-embedding-004` + `gemini-2.5-flash`
- LangChain (ingestion only), Axios (Gemini REST)

## Prerequisites
- Node.js 20+
- Supabase project (free tier works)
- Google AI API key (https://aistudio.google.com/apikey)

## Setup

### 1. Get your Supabase Transaction Pooler URI
Dashboard → Project Settings → Database → **Connection string** → Transaction pooler.

### 2. Configure environment
```bash
cp .env.example .env
# Fill in DATABASE_URL and GOOGLE_API_KEY
```

### 3. Install & run
```bash
npm install
npm run start:dev
```

Three tables are auto-created on first start:
`document_chunks`, `chat_messages`, `cached_answers`.

## API

### Upload a PDF
```bash
curl -X POST http://localhost:3000/admin/upload \
  -F "file=@document.pdf"
```
```json
{ "message": "PDF ingested successfully", "fileName": "document.pdf", "chunksCreated": 42 }
```

### Chat
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{ "message": "What is the refund policy?", "sessionId": "user-abc" }'
```
```json
{ "answer": "According to the documents...", "cached": false }
```

On a semantically equivalent follow-up:
```json
{ "answer": "According to the documents...", "cached": true }
```

## How MCP tool retrieval works

1. User sends a question.
2. The question is embedded and checked against the semantic cache first.
3. On a cache miss, Gemini receives the system prompt, conversation history,
   and the `search_documents` tool definition.
4. Gemini decides to call `search_documents(query)` — once or multiple times
   for complex questions.
5. `RetrievalService` executes the pgvector query and returns matching chunks
   as a `function_response` message.
6. Gemini reads the tool results and produces a final answer.
7. The answer is saved to the semantic cache and chat history.

Document content **never enters the system prompt** — it cannot override
instructions or hijack behaviour.

## Semantic cache
Cosine distance **< 0.25** = cache hit → served instantly, no LLM call.
Cache is permanent. Fallback (no-answer) responses are never cached.

## Customising AI behaviour
Edit `src/chat/prompts/system.prompt.txt`. Controls rules, tone, and the fallback
message — no code change needed.

## Production checklist
- Set `synchronize: false`, switch to TypeORM migrations.
- Add `class-validator` to DTOs.
- Add `@nestjs/throttler` rate limiting on `/chat`.
- Monitor agentic loop iteration counts to tune `MAX_TOOL_ITERATIONS`.
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
