import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // ส่งต่อ /api ไปยัง backend ระหว่าง dev (ดู backend/.env.example -> PORT=4000)
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      // Public profile avatars are served from the backend /uploads path.
      // /uploads/job-proofs remains restricted; private proofs use /api with JWT.
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
