import axios from "axios";
import router from "../router";
import { useAuthStore } from "../stores/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

// แนบ JWT token ทุก request อัตโนมัติหลัง login
api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

// ถ้า token หมดอายุ/ไม่ถูกต้อง (401) ให้ logout อัตโนมัติแล้วพากลับหน้า login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore();
      auth.logout();
      router.push({ name: "login" });
    }
    return Promise.reject(error);
  }
);

export default api;