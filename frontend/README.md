# SupportMate AI frontend

## SEO

The canonical production domain is `https://www.supportmate.online`. Only `/`,
`/terms`, and `/privacy` are included in `public/sitemap.xml`. The sitemap is
published at `https://www.supportmate.online/sitemap.xml` and advertised in
`public/robots.txt`.

Edit public page titles and descriptions in `src/lib/seo.ts`. The same module
provides canonical URLs, Open Graph and Twitter metadata, and homepage-only
software structured data. Keep the sitemap and Vercel rewrites in sync when
adding public pages. Canonical URLs exclude queries, fragments, and trailing
slashes (except the homepage).

`npm run build` generates `dist/index.html`, `dist/terms.html`, and
`dist/privacy.html` with page-specific metadata available before JavaScript runs.
The `seo:start` and `seo:end` markers in `index.html` must remain in place.
Vercel rewrites the public URLs to those files. Page content still renders with
React; this is metadata generation, not content prerendering.

`RouteSeo` updates metadata during browser navigation. All other paths receive
`noindex, follow` and no canonical. Vercel also sends `X-Robots-Tag: noindex, follow`
on account and dashboard routes so exclusion does not depend on JavaScript.
These headers apply on Vercel, not the local Vite development or preview server.
Crawling remains allowed in `robots.txt` so crawlers can read the indexing rules.

After deployment, verify the sitemap and robots URLs return XML and plain text,
and that `/terms` and `/privacy` return their own metadata in the HTML source.
In Google Search Console, select or verify the production domain property,
open **Sitemaps**, and submit `https://www.supportmate.online/sitemap.xml`.
Use **URL Inspection** to check the three public pages and their canonical URLs.
Submitting the sitemap does not guarantee indexing.

## Google Analytics

The production frontend uses Google Analytics 4 property **SupportMate AI**
(`560594440`), web stream **SupportMate AI Frontend** (`16199271228`), and
measurement ID `G-PTP6T5RXK3`. The property uses Bangladesh time and USD reporting.
It is separate from the Noor AI property within the existing Analytics account.

`src/lib/analytics.ts` loads the Google tag only in production on
`www.supportmate.online` or `supportmate.online`. `RouteAnalytics` sends one
manual page view per pathname change after `RouteSeo` updates the title. Keep
enhanced measurement disabled in the web stream to avoid duplicate automatic
page views and automatic form tracking.

Only known frontend routes are tracked. Password recovery, password reset,
OAuth callbacks, and unknown routes disable collection. Page locations exclude
query strings and fragments; external referrers are reduced to their origin.
No account IDs, user emails, chat messages, uploaded content, or form values are
added to events. Advertising personalization and Google signals are disabled.
Development, preview deployments, and localhost do not load the tag.

For loading diagnostics, inspect the `supportmate-google-analytics` script in
the browser's document head. Its `data-status` reports `loading`, `loaded`, or
`error`; `data-last-processed-page` records the last sanitized path processed by
the Google tag callback. These attributes do not confirm report ingestion.

To verify collection after deployment, visit the production frontend and open
the SupportMate AI property's **Realtime** report. Standard reports can take
time to populate. Search Console is available under the existing verified
`supportmate.online` domain property, with the frontend sitemap submitted.

## Vite template reference

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
