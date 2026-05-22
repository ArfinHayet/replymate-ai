export const apiRoutes = {
  auth: {
    login: "/auth/login",
    signup: "/auth/signup",
    refresh: "/auth/refresh",
    me: "/auth/me",
    callbackPath: "/auth/callback",
  },
  chat: {
    send: "/chat",
    history: "/chat/history",
  },
  company: {
    list: "/company",
    byId: (id: string) => `/company/${id}`,
  },
  embed: {
    widgetKeys: "/widget/keys",
    widgetKeyById: (id: string) => `/widget/keys/${id}`,
    allowedDomains: "/widget/domains",
    allowedDomainById: (id: string) => `/widget/domains/${id}`,
  },
  images: {
    list: "/images",
    byId: (id: string) => `/images/${id}`,
    analyze: "/images/analyze",
  },
  pdfs: {
    list: "/pdfs",
    byId: (id: string) => `/pdfs/${id}`,
  },
  payments: {
    checkout: "/payments/checkout",
    config: "/payments/config",
  },
  upload: {
    pdf: "/admin/upload",
    urls: "/admin/ingest-urls",
  },
  webPages: {
    list: "/web-pages",
    byId: (id: string) => `/web-pages/${id}`,
    refetch: (id: string) => `/web-pages/${id}/refetch`,
  },
} as const;
