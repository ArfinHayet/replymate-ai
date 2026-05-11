export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  google: {
    apiKey: process.env.GOOGLE_API_KEY,
  },
  rag: {
    chunkSize: parseInt(process.env.CHUNK_SIZE ?? '1000', 10) || 1000,
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP ?? '200', 10) || 200,
    topK: parseInt(process.env.TOP_K_RESULTS ?? '15', 10) || 15,
    maxToolIterations: parseInt(process.env.MAX_TOOL_ITERATIONS ?? '10', 10) || 10,
    // Cosine distance threshold for semantic cache hits.
    // Lower = stricter (only near-identical phrasings hit the cache).
    // Recommended range: 0.05–0.10. Default: 0.07
    cacheThreshold: parseFloat(process.env.CACHE_THRESHOLD ?? '0.07'),
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
  },
});
