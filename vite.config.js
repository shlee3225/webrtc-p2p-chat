import { defineConfig } from 'vite';

export default defineConfig({
  // For GitHub Pages deployment, set the base path.
  base: '/webrtc-p2p-chat/', // <-- 여기에 레포지토리 이름을 입력하세요.
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    // HTTPS is required for WebRTC.
    // When you run `npm run dev`, Vite will generate a self-signed certificate.
    // You will need to trust it in your browser.
    https: true, 
  },
});
