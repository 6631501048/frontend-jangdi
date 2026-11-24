import axios from "axios";
import router from "../router";
import { useAuthStore } from "../stores/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

// แนบ JWT token ทุก request อัตโนมัติหลัง login
api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token && !config.publicAuth) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

// ถ้า token หมดอายุ/ไม่ถูกต้อง (401) ให้ logout อัตโนมัติแล้วพากลับหน้า login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.publicAuth && !error.config?.keepSessionOnUnauthorized) {
      const auth = useAuthStore();
      if (auth.isLoggedIn) {
        const current = router.currentRoute.value;
        const redirect = current.name !== 'login' ? current.fullPath : undefined;
        auth.logout();
        router.replace({ name: "login", ...(redirect ? {query:{redirect}} : {}) });
      }
    }
    // บัญชีถูกระงับระหว่างใช้งาน -> เคลียร์ session แล้วพากลับหน้า login
    if (error.response?.status === 403 && error.response?.data?.code === "ACCOUNT_SUSPENDED") {
      const auth = useAuthStore();
      auth.logout();
      router.replace({ name: "login" });
    }
    // backend ปฏิเสธเพราะยังไม่ยืนยันอีเมล -> พาไปหน้าส่งอีเมลยืนยันใหม่ (ยังคง reject ให้หน้าเดิมจัดการ loading ได้)
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === "EMAIL_NOT_VERIFIED" &&
      router.currentRoute.value.name !== "verify-email-pending"
    ) {
      router.replace({ name: "verify-email-pending" });
    }
    return Promise.reject(error);
  }
);

export default api;
