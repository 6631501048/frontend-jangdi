import { defineStore } from "pinia";

const STORAGE_KEY = "jangdi_auth"; // โปรเจกต์จริงนอก claude.ai artifact ใช้ localStorage ได้ตามปกติ

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

/**
 * เก็บสถานะการล็อกอินและบทบาทปัจจุบัน (FR-AUTH-06)
 * persist ลง localStorage เพื่อไม่ให้ session หายตอน refresh หน้า
 */
export const useAuthStore = defineStore("auth", {
  state: () => loadFromStorage(),
  getters: {
    isLoggedIn: (state) => !!state.token,
    currentRole: (state) => state.user?.currentRole || "hirer",
    isProfileComplete: (state) => !!state.user?.isProfileComplete,
  },
  actions: {
    setSession(token, user) {
      this.token = token;
      this.user = user;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    },
    updateUser(user) {
      this.user = user;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: this.token, user }));
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});