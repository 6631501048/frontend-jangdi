<script setup>
// FR-AUTH-04: หน้า "ยังไม่ได้ยืนยันอีเมล" — แสดงเมื่อ backend ตอบ EMAIL_NOT_VERIFIED
// ผู้ใช้ขอส่งลิงก์ใหม่ได้ (มี cooldown) และกด "ตรวจสอบอีกครั้ง" หลังกดลิงก์ในอีเมลแล้ว
import { onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../services/api";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
const router = useRouter();

const sending = ref(false);
const checking = ref(false);
const message = ref("");
const error = ref("");
const cooldown = ref(0);
let timer = null;

function startCooldown(seconds) {
  cooldown.value = seconds;
  clearInterval(timer);
  timer = setInterval(() => {
    cooldown.value -= 1;
    if (cooldown.value <= 0) clearInterval(timer);
  }, 1000);
}
onBeforeUnmount(() => clearInterval(timer));

function goHome() {
  if (auth.user?.isAdmin) return router.replace({ name: "admin-dashboard" });
  router.replace({ name: auth.currentRole === "worker" ? "worker-dashboard" : "hirer-dashboard" });
}

async function resend() {
  message.value = "";
  error.value = "";
  sending.value = true;
  try {
    const { data } = await api.post("/auth/resend-verification");
    message.value = data.message;
    startCooldown(data.retryAfterSeconds || 60);
  } catch (e) {
    error.value = e.response?.data?.message || "ส่งอีเมลไม่สำเร็จ";
    if (e.response?.status === 429) startCooldown(e.response.data.retryAfterSeconds || 60);
    // อีเมลยืนยันแล้ว (400) -> รีเฟรชสถานะเลย
    if (e.response?.status === 400) await recheck();
  } finally {
    sending.value = false;
  }
}

async function recheck() {
  message.value = "";
  error.value = "";
  checking.value = true;
  try {
    const { data } = await api.get("/auth/me");
    auth.updateUser(data);
    if (data.isEmailVerified) return goHome();
    error.value = "ยังไม่พบการยืนยัน กรุณากดลิงก์ในอีเมลก่อน แล้วกดตรวจสอบอีกครั้ง";
  } catch (e) {
    error.value = e.response?.data?.message || "ตรวจสอบสถานะไม่สำเร็จ";
  } finally {
    checking.value = false;
  }
}

function logout() {
  auth.logout();
  router.replace({ name: "login" });
}
</script>

<template>
  <main class="pending-page">
    <p class="icon">📧</p>
    <h1>กรุณายืนยันอีเมลก่อนใช้งาน</h1>
    <p>
      เราส่งลิงก์ยืนยันไปที่<br /><strong>{{ auth.user?.email }}</strong
      ><br />ต้องยืนยันก่อนจึงจะโพสต์งาน สมัครงาน หรือเลือก worker ได้
    </p>

    <p v-if="message" class="ok">{{ message }}</p>
    <p v-if="error" class="err">{{ error }}</p>

    <button :disabled="sending || cooldown > 0" @click="resend">
      {{ sending ? "กำลังส่ง..." : cooldown > 0 ? `ส่งอีกครั้งได้ใน ${cooldown} วิ` : "ส่งอีเมลยืนยันอีกครั้ง" }}
    </button>
    <button class="secondary" :disabled="checking" @click="recheck">
      {{ checking ? "กำลังตรวจสอบ..." : "ฉันยืนยันแล้ว — ตรวจสอบอีกครั้ง" }}
    </button>
    <button class="link" @click="logout">ออกจากระบบ</button>
  </main>
</template>

<style scoped>
.pending-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px; text-align: center; }
.icon { font-size: 40px; margin: 0; }
h1 { font-size: 18px; margin: 0; }
p { color: #555; font-size: 14px; max-width: 320px; }
.ok { color: #15803d; }
.err { color: #b91c1c; }
button { width: 100%; max-width: 320px; min-height: 44px; border-radius: 8px; border: none; background: #2563eb; color: white; font-weight: 600; cursor: pointer; }
button:disabled { opacity: 0.6; cursor: not-allowed; }
button.secondary { background: white; color: #2563eb; border: 1px solid #2563eb; }
button.link { background: none; color: #999; font-weight: 400; min-height: 32px; }
</style>
