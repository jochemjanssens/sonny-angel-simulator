import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// Per brand: the app name, colours and icon used when it's installed as an app.
const APPS = {
  sonny: { name: 'Sonny Angel Simulator', short: 'Sonny Angel', theme: '#E4002B', background: '#FFF9F3', icon: 'sonny' },
  smiski: { name: 'Smiski Simulator', short: 'Smiski', theme: '#11131B', background: '#11131B', icon: 'smiski' },
}

// Makes each build an installable app (PWA): a web manifest, the right title,
// icons and theme colour in index.html, and a service worker.
function pwa(brand) {
  const app = APPS[brand]
  const icons = (sizes) => sizes.map((s) => ({ src: `icons/${app.icon}-${s}.png`, sizes: `${s}x${s}`, type: 'image/png', purpose: 'any maskable' }))
  return {
    name: 'pwa',
    transformIndexHtml(html) {
      return html
        .replace(/<title>.*<\/title>/, `<title>${app.name}</title>`)
        .replace('href="icons/sonny-192.png"', `href="icons/${app.icon}-192.png"`)
        .replace(
          '</head>',
          `    <link rel="manifest" href="manifest.webmanifest" />
    <meta name="theme-color" content="${app.theme}" />
    <link rel="apple-touch-icon" href="icons/${app.icon}-180.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="${app.short}" />
  </head>`,
        )
    },
    generateBundle() {
      const manifest = {
        name: app.name,
        short_name: app.short,
        id: './',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: app.theme,
        background_color: app.background,
        icons: icons([192, 512]),
      }
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: JSON.stringify(manifest, null, 2) })
      // a new cache name for every build, so an update replaces the old files
      const sw = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8').replace('__BRAND__', brand).replace('__BUILD__', String(Date.now()))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw })
    },
  }
}

export default defineConfig(({ mode }) => {
  const brand = loadEnv(mode, process.cwd(), 'VITE_').VITE_BRAND === 'smiski' || process.env.VITE_BRAND === 'smiski' ? 'smiski' : 'sonny'
  return {
    plugins: [react(), pwa(brand)],
    // Relative asset paths so the build works under any sub-path (e.g. GitHub Pages).
    base: './',
    // Listen on all interfaces so other devices on the local network can open it.
    server: { host: true, port: 5173 },
    preview: { host: true, port: 4173 },
  }
})
