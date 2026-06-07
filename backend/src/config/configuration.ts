export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  cors: {
    origins: process.env.CORS_ORIGINS ?? 'http://localhost:5173',
  },
  databaseUrl: process.env.DATABASE_URL,
  llm: {
    chat: {
      provider: process.env.LLM_CHAT_PROVIDER ?? 'gemini',
      apiKey:   process.env.LLM_CHAT_API_KEY ?? process.env.GOOGLE_API_KEY,
      model:    process.env.LLM_CHAT_MODEL ?? 'gemini-2.5-flash',
    },
    embedding: {
      provider: process.env.LLM_EMBEDDING_PROVIDER ?? process.env.LLM_CHAT_PROVIDER ?? 'gemini',
      apiKey:   process.env.LLM_EMBEDDING_API_KEY ?? process.env.LLM_CHAT_API_KEY ?? process.env.GOOGLE_API_KEY,
      model:    process.env.LLM_EMBEDDING_MODEL ?? 'gemini-embedding-001',
    },
  },
  rag: {
    chunkSize: parseInt(process.env.CHUNK_SIZE ?? '1000', 10) || 1000,
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP ?? '200', 10) || 200,
    topK: parseInt(process.env.TOP_K_RESULTS ?? '15', 10) || 15,
    maxToolIterations: parseInt(process.env.MAX_TOOL_ITERATIONS ?? '10', 10) || 10,
    graph: {
      maxChunksPerSource:
        parseInt(process.env.GRAPH_RAG_MAX_CHUNKS_PER_SOURCE ?? '30', 10) || 30,
    },
    // Cosine distance threshold for semantic cache hits.
    // Lower = stricter (only near-identical phrasings hit the cache).
    // Recommended range: 0.05–0.10. Default: 0.07
    cacheThreshold: parseFloat(process.env.CACHE_THRESHOLD ?? '0.07'),
  },
  web: {
    crawlMaxPages: parseInt(process.env.WEB_CRAWL_MAX_PAGES ?? '30', 10) || 30,
    scrapingAnt: {
      apiKey: process.env.SCRAPINGANT_API_KEY,
      enabled:
        process.env.SCRAPINGANT_ENABLED == null
          ? Boolean(process.env.SCRAPINGANT_API_KEY)
          : process.env.SCRAPINGANT_ENABLED !== 'false',
      timeoutSeconds: parseInt(process.env.SCRAPINGANT_TIMEOUT_SECONDS ?? '30', 10) || 30,
      maxPagesPerIngest:
        parseInt(process.env.SCRAPINGANT_MAX_PAGES_PER_INGEST ?? '10', 10) || 10,
    },
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
    imagesBucket: process.env.SUPABASE_IMAGES_BUCKET ?? 'images',
  },
  appUrl: process.env.APP_URL ?? `http://localhost:${parseInt(process.env.PORT ?? '3000', 10) || 3000}`,
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  creem: {
    apiKey: process.env.CREEM_API_KEY,
    webhookSecret: process.env.CREEM_WEBHOOK_SECRET,
    testMode: process.env.CREEM_TEST_MODE !== 'false',
  },
  whatsapp: {
    credentialEncryptionKey: process.env.WHATSAPP_CREDENTIAL_ENCRYPTION_KEY,
    graphVersion: process.env.WHATSAPP_GRAPH_VERSION ?? 'v24.0',
  },
});
