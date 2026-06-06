import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const versionFile = resolve(__dirname, 'public/version.json')
const buildVersion: string = JSON.parse(readFileSync(versionFile, 'utf8')).version

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
})
