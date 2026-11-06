import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

// 빌드 결과의 JS·CSS를 index.html 안에 넣어 dist/index.html을 더블클릭(file://)으로 열 수 있게 한다.
function inlineAssets(): Plugin {
  return {
    name: 'inline-assets',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = bundle['index.html']
      if (!html || html.type !== 'asset') return
      let source = String(html.source)
      for (const [fileName, item] of Object.entries(bundle)) {
        if (item.type === 'chunk' && item.isEntry) {
          const code = item.code.replace(/<\/script/gi, '<\\/script')
          source = source.replace(
            new RegExp(`<script[^>]*src="[^"]*${fileName}"[^>]*></script>`),
            () => `<script type="module">${code}</script>`,
          )
          delete bundle[fileName]
        } else if (item.type === 'asset' && fileName.endsWith('.css')) {
          source = source.replace(
            new RegExp(`<link[^>]*href="[^"]*${fileName}"[^>]*>`),
            () => `<style>${String(item.source)}</style>`,
          )
          delete bundle[fileName]
        }
      }
      html.source = source
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), inlineAssets()],
  test: {
    environment: 'node',
  },
})
