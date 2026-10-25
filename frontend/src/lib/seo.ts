export const SITE_URL = "https://www.supportmate.online";

export const PUBLIC_SEO = {
  "/": {
    title: "SupportMate AI - Your Personal AI Assistant",
    description:
      "Launch a smart AI chatbot in 5 minutes. SupportMate AI trains on your company's knowledge base and answers customer questions instantly - no coding required.",
  },
  "/terms": {
    title: "Terms of Service | SupportMate AI",
    description:
      "Read the terms governing your use of SupportMate AI, including accounts, subscriptions, acceptable use, and service availability.",
  },
  "/privacy": {
    title: "Privacy Policy | SupportMate AI",
    description:
      "Learn how SupportMate AI collects, uses, shares, and protects your account information and business content.",
  },
} satisfies Record<string, { title: string; description: string }>;

export function normalizeSeoPath(pathname: string) {
  return pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function renderSeoHead(pathname: string) {
  const path = normalizeSeoPath(pathname);
  const page = Object.hasOwn(PUBLIC_SEO, path)
    ? PUBLIC_SEO[path as keyof typeof PUBLIC_SEO]
    : undefined;
  const title = page?.title ?? "SupportMate AI";
  const description =
    page?.description ??
    "Manage your SupportMate AI account and customer support workspace.";
  const url = `${SITE_URL}${path}`;
  const image = `${SITE_URL}/social-preview.jpg?v=retro-1`;
  const imageAlt =
    "SupportMate — AI-Powered Support. Smarter Responses. Happier Customers. Retro maroon chatbot preview on cream graph paper.";

  const meta = (
    attribute: "name" | "property",
    key: string,
    value: string,
  ) =>
    `<meta data-seo ${attribute}="${key}" content="${escapeHtml(value)}">`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SupportMate AI",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/`,
    description:
      "SupportMate AI helps businesses launch an AI chatbot trained on their company knowledge base.",
    image,
    publisher: {
      "@type": "Organization",
      name: "SupportMate AI",
      url: `${SITE_URL}/`,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/favicon.svg`,
      },
    },
  };

  return [
    `<title data-seo>${escapeHtml(title)}</title>`,
    meta("name", "title", title),
    meta("name", "description", description),
    meta("name", "author", "SupportMate AI"),
    meta("name", "robots", page ? "index, follow" : "noindex, follow"),
    page
      ? `<link data-seo rel="canonical" href="${escapeHtml(url)}">`
      : "",
    meta("property", "og:type", "website"),
    meta("property", "og:site_name", "SupportMate AI"),
    meta("property", "og:title", title),
    meta("property", "og:description", description),
    ...(page ? [meta("property", "og:url", url)] : []),
    meta("property", "og:locale", "en_US"),
    meta("property", "og:image", image),
    meta("property", "og:image:secure_url", image),
    meta("property", "og:image:type", "image/jpeg"),
    meta("property", "og:image:width", "1200"),
    meta("property", "og:image:height", "630"),
    meta("property", "og:image:alt", imageAlt),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:site", "@SupportMateai"),
    meta("name", "twitter:title", title),
    meta("name", "twitter:description", description),
    meta("name", "twitter:image", image),
    meta("name", "twitter:image:alt", imageAlt),
    path === "/"
      ? `<script data-seo type="application/ld+json">${
          JSON.stringify(structuredData).replace(/</g, "\\u003c")
        }</script>`
      : "",
  ].join("\n");
}
