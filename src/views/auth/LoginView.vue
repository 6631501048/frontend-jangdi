<script setup>
// FR-AUTH-01/02/03: หน้า Login เดียว ใช้ร่วมกันทั้ง 3 บทบาท (Hirer / Worker / Admin)
// ระบบใช้ Google OAuth เป็นช่องทางหลัก จำกัดเฉพาะโดเมน @lamduan.mfu.ac.th
// (ฟอร์ม Email/Password ด้านบนคงไว้ตามดีไซน์ต้นแบบ สำหรับบัญชีที่ตั้งรหัสผ่านไว้แล้ว)
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import api from "../../services/api";
import { useAuthStore } from "../../stores/auth";
import { renderGoogleButton } from "../../services/googleAuth";

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const googleBtnEl = ref(null);
const router = useRouter();
const auth = useAuthStore();

// FR-AUTH-01/02: ฝั่ง client ตรวจสอบโดเมนอีเมลก่อนยิง request ด้วย (server ตรวจซ้ำอีกชั้น)
const LAMDUAN_DOMAIN = "@lamduan.mfu.ac.th";

// ไปหน้า dashboard ตามบทบาทของผู้ใช้ที่ล็อกอินเข้ามา (ใช้ร่วมกันทั้ง Google และ email/password)
// หมายเหตุ: isProfileComplete อยู่ใน user object เสมอ (backend ส่ง { token, user }) ไม่ใช่ field แยก
function redirectAfterLogin(user) {
  if (!user?.isProfileComplete) {
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
    const { data } = await api.post("/auth/login", { email: email.value, password: password.value });
    auth.setSession(data.token, data.user);
    redirectAfterLogin(data.user);
  } catch (e) {
    error.value = e.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

// FR-AUTH-03: Google ส่ง ID token กลับมาทาง callback ของปุ่ม → ส่งให้ backend ตรวจสอบ + ออก JWT ของระบบ
async function handleGoogleCredential(idToken) {
  error.value = "";
  loading.value = true;
  try {
    const { data } = await api.post("/auth/google", { idToken });
    auth.setSession(data.token, data.user);
    redirectAfterLogin(data.user);
  } catch (e) {
    error.value = e.response?.data?.message || e.message || "เข้าสู่ระบบด้วย Google ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    await renderGoogleButton(googleBtnEl.value, handleGoogleCredential, (e) => {
      error.value = e.message;
    });
  } catch (e) {
    error.value = e.message || "โหลดปุ่ม Google ไม่สำเร็จ";
  }
});
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

      <div ref="googleBtnEl" class="google-btn-wrap" :class="{ disabled: loading }"></div>

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

.google-btn-wrap {
  display: flex;
  justify-content: center;
  min-height: 44px;
}
.google-btn-wrap.disabled { opacity: 0.7; pointer-events: none; }

.hint { margin: 18px 0 0; font-size: 12px; color: var(--color-text-muted); }
</style>