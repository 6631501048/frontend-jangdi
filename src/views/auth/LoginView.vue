<script setup>
// FR-AUTH-01/02/03: หน้า Login เดียว ใช้ร่วมกันทั้ง 3 บทบาท (Hirer / Worker / Admin)
// ระบบใช้ Google OAuth เป็นช่องทางหลัก จำกัดเฉพาะโดเมน @lamduan.mfu.ac.th
// (ฟอร์ม Email/Password ด้านบนคงไว้ตามดีไซน์ต้นแบบ สำหรับบัญชีที่ตั้งรหัสผ่านไว้แล้ว)
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../services/api";
import { useAuthStore } from "../../stores/auth";

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const router = useRouter();
const auth = useAuthStore();

// FR-AUTH-01/02: ฝั่ง client ตรวจสอบโดเมนอีเมลก่อนยิง request ด้วย (server ตรวจซ้ำอีกชั้น)
const LAMDUAN_DOMAIN = "@lamduan.mfu.ac.th";

// ไปหน้า dashboard ตามบทบาทของผู้ใช้ที่ล็อกอินเข้ามา (ใช้ร่วมกันทั้ง Google และ email/password)
function redirectAfterLogin(user, isProfileComplete) {
  if (!isProfileComplete) {
    router.push({ name: "register" });
    return;
  }
  if (user?.isAdmin) {
    router.push({ name: "admin-dashboard" });
  } else if (user?.currentRole === "worker") {
    router.push({ name: "worker-dashboard" });
  } else {
    router.push({ name: "hirer-dashboard" });
  }
}

async function handleContinue() {
  error.value = "";
  if (!email.value.endsWith(LAMDUAN_DOMAIN)) {
    error.value = `ต้องใช้อีเมล ${LAMDUAN_DOMAIN} เท่านั้น`;
    return;
  }
  loading.value = true;
  try {
    // TODO: POST /api/auth/login { email, password } (FR-AUTH-01/02)
    const { data } = await api.post("/auth/login", { email: email.value, password: password.value });
    auth.setSession(data.token, data.user);
    redirectAfterLogin(data.user, data.isProfileComplete);
  } catch (e) {
    error.value = e.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function handleGoogleLogin() {
  error.value = "";
  loading.value = true;
  try {
    // TODO: เชื่อม Google Identity Services (FR-AUTH-03) — ช่องทางหลักของระบบ
    // 1) โหลด Google Identity Services script + VITE_GOOGLE_CLIENT_ID จาก .env
    // 2) จำกัด hd (hosted domain) = "lamduan.mfu.ac.th" ในการตั้งค่า Google client
    // 3) ได้ idToken แล้ว POST /api/auth/google { idToken } ให้ backend ตรวจสอบ + ออก JWT ของระบบ
    const { data } = await api.post("/auth/google", { idToken: "TODO_GOOGLE_ID_TOKEN" });
    auth.setSession(data.token, data.user);
    redirectAfterLogin(data.user, data.isProfileComplete);
  } catch (e) {
    error.value = e.response?.data?.message || "เข้าสู่ระบบด้วย Google ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <div class="login-card">
      <div class="brand">
        <span class="brand-icon">🧑‍🤝‍🧑</span>
        <span class="brand-name">JangDi</span>
      </div>

      <h1>Login or Sign up</h1>
      <p class="subtitle">with {{ LAMDUAN_DOMAIN.slice(1) }}</p>

      <form @submit.prevent="handleContinue">
        <label class="field">
          <span class="field-label">Email</span>
          <input
            v-model="email"
            type="email"
            placeholder="student_id@lamduan.mfu.ac.th"
            autocomplete="email"
            required
          />
        </label>

        <label class="field">
          <span class="field-label">Password</span>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" class="continue-btn" :disabled="loading">
          {{ loading ? "Please wait…" : "Continue" }}
        </button>
      </form>

      <div class="divider"><span>OR</span></div>

      <button class="google-btn" :disabled="loading" @click="handleGoogleLogin">
        <svg class="google-icon" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9C16.66 14.2 17.64 11.9 17.64 9.2z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.55-1.84.86-3.06.86-2.35 0-4.34-1.58-5.05-3.71H.94v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.95 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.94a9 9 0 0 0 0 8.08l3.01-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .94 4.96l3.01 2.33C4.66 5.16 6.65 3.58 9 3.58z" />
        </svg>
        Continue with Google
      </button>

      <p class="hint">ใช้ได้ทั้งบัญชีผู้ว่าจ้าง ผู้รับจ้าง และผู้ดูแลระบบ</p>
    </div>
  </main>
</template>

<style scoped>
.login-page {
  --color-primary: #f5b942;
  --color-primary-dark: #e8a415;
  --color-primary-light: #fdecc4;
  --color-bg: #f4f4f5;
  --color-surface: #ffffff;
  --color-text: #1f2937;
  --color-text-muted: #9ca3af;
  --color-border: #e5e7eb;
  --color-red: #dc2626;

  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: var(--color-bg);
}

.login-card {
  width: 100%;
  max-width: 380px;
  background: var(--color-surface);
  border-radius: 16px;
  padding: 28px 22px;
  text-align: center;
}

.brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}
.brand-icon { font-size: 26px; }
.brand-name { font-size: 24px; font-weight: 800; color: var(--color-text); }

h1 { margin: 0 0 4px; font-size: 18px; }
.subtitle { margin: 0 0 22px; color: var(--color-text-muted); font-size: 14px; }

form { display: flex; flex-direction: column; gap: 14px; text-align: left; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 13px; font-weight: 600; color: var(--color-text); }
.field input {
  min-height: 44px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  font-size: 15px;
}
.field input:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }

.error { margin: 0; color: var(--color-red); font-size: 13px; }

.continue-btn {
  min-height: 46px;
  border-radius: 10px;
  border: none;
  background: #d9d9d9;
  color: #4b4b4b;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  margin-top: 4px;
}
.continue-btn:disabled { opacity: 0.7; cursor: default; }

.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 18px 0;
  color: var(--color-text-muted);
  font-size: 12px;
}
.divider::before, .divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.google-btn {
  width: 100%;
  min-height: 48px;
  border-radius: 10px;
  border: none;
  background: var(--color-primary);
  color: #3a2a05;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
}
.google-btn:disabled { opacity: 0.7; cursor: default; }
.google-icon { width: 18px; height: 18px; flex-shrink: 0; }

.hint { margin: 18px 0 0; font-size: 12px; color: var(--color-text-muted); }
</style>