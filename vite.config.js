import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const frontendPkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const mobilePkg = JSON.parse(readFileSync('../Merge_mobile/package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    // Inject version from package.json at build time — use __APP_VERSION__ anywhere in JS
    __APP_VERSION__: JSON.stringify(frontendPkg.version),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(frontendPkg.version),
    'import.meta.env.VITE_DESKTOP_APP_VERSION': JSON.stringify(frontendPkg.version),
    'import.meta.env.VITE_MOBILE_APP_VERSION': JSON.stringify(mobilePkg.version),
  },
})
