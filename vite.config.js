import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Many students use budget Android phones with an older Chrome/WebView. Without this, Vite writes media
    // queries as "(width<=860px)", which those browsers ignore, so every mobile layout rule silently disappears.
    target: ['es2019', 'chrome87', 'safari14', 'firefox91'],
    cssTarget: ['chrome87', 'safari14', 'firefox91'],
  },
})
