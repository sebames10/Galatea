import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => ({
  // npm run dev:https sirve con un certificado autofirmado: el celular solo deja usar
  // la cámara (escáner del QR de la mesa) en HTTPS. La primera vez hay que aceptar la advertencia.
  plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],
  server: {
    // La API (galatea-api) corre en el puerto 3000. Con el proxy el navegador
    // la ve en el mismo origen: no hace falta CORS y funciona desde el celular (--host).
    proxy: { '/api': 'http://localhost:3000' },
  },
}))
