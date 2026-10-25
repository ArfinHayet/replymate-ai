import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFile, writeFile } from 'node:fs/promises'
import { PUBLIC_SEO, renderSeoHead } from './src/lib/seo'

const seoBlock = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/

function withSeo(html: string, pathname: string) {
  if (!seoBlock.test(html)) {
    throw new Error('Missing SEO markers in index.html')
  }

  return html.replace(
    seoBlock,
    () => `<!-- seo:start -->\n${renderSeoHead(pathname)}\n<!-- seo:end -->`,
  )
}

function seoPages(): Plugin {
  let outputDirectory = ''

  return {
    name: 'supportmate-seo',
    configResolved(config) {
      outputDirectory = path.resolve(config.root, config.build.outDir)
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return withSeo(html, '/')
      },
    },
    async writeBundle() {
      const html = await readFile(path.join(outputDirectory, 'index.html'), 'utf8')

      for (const pathname of Object.keys(PUBLIC_SEO)) {
        if (pathname === '/') continue

        await writeFile(
          path.join(outputDirectory, `${pathname.slice(1)}.html`),
          withSeo(html, pathname),
        )
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), seoPages()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
