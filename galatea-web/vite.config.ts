import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // La API (galatea-api) corre en el puerto 3000. Con el proxy el navegador
    // la ve en el mismo origen: no hace falta CORS y funciona desde el celular (--host).
    proxy: { '/api': 'http://localhost:3000' },
  },
})
