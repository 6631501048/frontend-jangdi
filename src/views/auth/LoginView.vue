<script setup>
// FR-AUTH-01/02/03: หน้า Login เดียว ใช้ร่วมกันทั้ง 3 บทบาท (Hirer / Worker / Admin)
// ระบบใช้ Google OAuth เป็นช่องทางหลัก จำกัดเฉพาะโดเมน @lamduan.mfu.ac.th
// Email/password ใช้บัญชีเดียวกับ Google เมื่ออีเมลตรงกัน
import AuthShell from "../../components/AuthShell.vue";
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { loginDestination } from "../../services/navigation";
import api from "../../services/api";
import { useAuthStore } from "../../stores/auth";
import { renderGoogleButton } from "../../services/googleAuth";

const email = ref("");
const password = ref("");
const error = ref("");
const googleError = ref("");
const loading = ref(false);
const googleBtnEl = ref(null);
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

// FR-AUTH-01/02: ฝั่ง client ตรวจสอบโดเมนอีเมลก่อนยิง request ด้วย (server ตรวจซ้ำอีกชั้น)
const LAMDUAN_DOMAIN = "@lamduan.mfu.ac.th";

// ไปหน้า dashboard ตามบทบาทของผู้ใช้ที่ล็อกอินเข้ามา (ใช้ร่วมกันทั้ง Google และ email/password)
// หมายเหตุ: isProfileComplete อยู่ใน user object เสมอ (backend ส่ง { token, user }) ไม่ใช่ field แยก
function redirectAfterLogin(user) {
  router.replace(loginDestination(user, route.query.redirect));
}

async function handleContinue() {
  if (loading.value) return;
  error.value = "";
  email.value = email.value.trim().toLowerCase();
  if (!email.value.endsWith(LAMDUAN_DOMAIN)) {
    error.value = `ต้องใช้อีเมล ${LAMDUAN_DOMAIN} เท่านั้น`;
    return;
  }
  loading.value = true;
  try {
    const { data } = await api.post("/auth/login", { email: email.value, password: password.value }, { publicAuth: true });
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
  if (loading.value) return;
  googleError.value = "";
  loading.value = true;
  try {
    const { data } = await api.post("/auth/google", { idToken }, { publicAuth: true });
    auth.setSession(data.token, data.user);
    redirectAfterLogin(data.user);
  } catch (e) {
    googleError.value = e.response?.data?.message || "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองอีกครั้ง";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    await renderGoogleButton(googleBtnEl.value, handleGoogleCredential, (e) => {
      googleError.value = "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองอีกครั้ง หรือใช้อีเมลและรหัสผ่าน";
    });
  } catch (e) {
    googleError.value = "ยังใช้ Google ไม่ได้ในขณะนี้ กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน";
  }
});
</script>

<template>
  <AuthShell>
    <div class="login-card">
<h1>ยินดีต้อนรับสู่ JangDi</h1>
      <p class="subtitle">เข้าสู่ระบบด้วยอีเมล {{ LAMDUAN_DOMAIN.slice(1) }}</p>

      <form @submit.prevent="handleContinue">
        <label class="field">
          <span class="field-label">อีเมลมหาวิทยาลัย</span>
          <input
            v-model="email"
            type="email"
            placeholder="student_id@lamduan.mfu.ac.th"
            autocomplete="email"
            required
          />
        </label>

        <label class="field">
          <span class="field-label">รหัสผ่าน</span>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>

        <RouterLink class="recovery-link" :to="{ name: 'forgot-password' }">ลืมรหัสผ่าน / ยังไม่ได้ตั้งรหัสผ่าน?</RouterLink>

        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <button type="submit" class="continue-btn" :disabled="loading">
          {{ loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ" }}
        </button>
      </form>

      <div class="divider"><span>หรือเข้าสู่ระบบด้วย Google</span></div>

      <div ref="googleBtnEl" class="google-btn-wrap" :class="{ disabled: loading }"></div>
      <p v-if="googleError" class="google-error" role="alert">{{ googleError }}</p>

      <p class="hint">ใช้ได้ทั้งบัญชีผู้ว่าจ้าง ผู้รับจ้าง และผู้ดูแลระบบ</p>
      <p class="hint">เคยใช้ Google แล้ว? ใช้อีเมลเดิมรับลิงก์ตั้งรหัสผ่าน เพื่อเข้าบัญชีเดิมด้วยรหัสผ่านได้</p>
    </div>
  </AuthShell>
</template>

<style scoped>
  .divider { display:flex; align-items:center; gap:12px; margin:24px 0; color:var(--jd-muted); font-size:.875rem; text-align:center; }
  .recovery-link { display:inline-block; justify-self:start; width:fit-content; max-width:100%; color:var(--jd-brand); font-size:.875rem; text-underline-offset:4px; }
  .divider::before,.divider::after { content:''; flex:1; height:1px; background:var(--jd-line); }
  .google-btn-wrap { display:flex; justify-content:center; min-height:44px; max-width:100%; overflow:hidden; }
  .google-btn-wrap.disabled { opacity:.7; pointer-events:none; }
  .hint { margin:24px 0 0; text-align:center; }
  .google-error { margin:12px 0 0; padding:12px; border-radius:10px; background:var(--jd-warning-soft); color:var(--jd-warning); font-size:.875rem; }
  button:disabled { opacity:.65; }
  </style>
