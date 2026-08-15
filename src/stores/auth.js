import { defineStore } from "pinia";

/**
 * เก็บสถานะการล็อกอินและบทบาทปัจจุบัน (FR-AUTH-06)
 * NOTE: ห้ามใช้ localStorage ใน artifact demo — แต่ในโปรเจกต์จริง (นอก claude.ai)
 * สามารถ persist token ลง localStorage ได้ตามปกติ
 */
export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: null,
    user: null, // { _id, email, fullName, currentRole, isAdmin, ... }
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    currentRole: (state) => state.user?.currentRole || "hirer",
  },
  actions: {
    setSession(token, user) {
      this.token = token;
      this.user = user;
    },
    logout() {
      this.token = null;
      this.user = null;
    },
  },
});
