import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3720,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.AGENT_API_PORT ?? 3721}`,
        changeOrigin: true,
      },
    },
  },
});
