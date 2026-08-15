<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../services/api";
import { useAuthStore } from "../../stores/auth";

const email = ref("");
const password = ref("");
const error = ref("");
const router = useRouter();
const auth = useAuthStore();

// FR-AUTH-01/02: ฝั่ง client ตรวจสอบโดเมนอีเมลก่อนยิง request ด้วย (server ตรวจซ้ำอีกชั้น)
const LAMDUAN_DOMAIN = "@lamduan.mfu.ac.th";

async function handleLogin() {
  error.value = "";
  if (!email.value.endsWith(LAMDUAN_DOMAIN)) {
    error.value = `ต้องใช้อีเมล ${LAMDUAN_DOMAIN} เท่านั้น`;
    return;
  }
  try {
    const { data } = await api.post("/auth/login", { email: email.value, password: password.value });
    auth.setSession(data.token, data.user);
    router.push(data.isProfileComplete ? "/hirer" : "/register");
  } catch (e) {
    error.value = e.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ";
  }
}

function handleGoogleLogin() {
  // TODO: เชื่อม Google Identity Services (FR-AUTH-03) แล้ว POST /api/auth/google ด้วย idToken
  alert("TODO: ต่อ Google OAuth ด้วย VITE_GOOGLE_CLIENT_ID จาก .env");
}
</script>

<template>
  <main class="login-page">
    <h1>JangDi</h1>
    <p class="subtitle">เข้าสู่ระบบด้วยอีเมล MFU Lamduan</p>

    <form @submit.prevent="handleLogin">
      <input v-model="email" type="email" placeholder="student_id@lamduan.mfu.ac.th" required />
      <input v-model="password" type="password" placeholder="รหัสผ่าน" required />
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit">เข้าสู่ระบบ</button>
    </form>

    <button class="google-btn" @click="handleGoogleLogin">เข้าสู่ระบบด้วย Google</button>
    <RouterLink to="/register">ยังไม่มีบัญชี? ลงทะเบียน</RouterLink>
  </main>
</template>

<style scoped>
.login-page { padding: 24px 16px; }
.subtitle { color: #666; margin-bottom: 24px; }
form { display: flex; flex-direction: column; gap: 12px; }
input, button { padding: 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 16px; min-height: 44px; }
button { background: #2563eb; color: white; border: none; cursor: pointer; }
.google-btn { margin-top: 12px; width: 100%; background: white; color: #333; border: 1px solid #ccc; }
.error { color: #dc2626; font-size: 14px; }
</style>
