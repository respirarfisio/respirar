import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Altere 'respirar-app' para o nome exato do seu repositório no GitHub
export default defineConfig({
  plugins: [react()],
  base: '/respirar-app/',
})
