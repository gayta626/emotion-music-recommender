import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  // Chia se web cho nguoi khac (npm run share + Cloudflare Tunnel): ban build goi backend qua "/api" cung dia chi
  // voi trang (.env.production) -> vite preview chuyen tiep sang backend may nay. Nho vay chi can 1 link HTTPS
  // (camera / micro chi mo duoc tren HTTPS), may nguoi xem khong goi nham "localhost" cua chinh ho
  preview: {
    port: 4173,
    // link tam cua Cloudflare Tunnel: https://<ten-ngau-nhien>.trycloudflare.com
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
