<script setup>
import AuthShell from "../../components/AuthShell.vue";
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
  <AuthShell><div class="verification-content">
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
  </div></AuthShell>
</template>

<style scoped>
      .verification-content { text-align:center; overflow-wrap:anywhere; }
      .icon { font-size:2.5rem; margin:0 0 16px; }
      p { color:var(--jd-muted); font-size:.9375rem; }
      .ok { color:var(--jd-success); } .err { color:var(--jd-danger); }
      button { width:100%; min-height:48px; margin-top:12px; padding:12px; border:1px solid var(--jd-brand); border-radius:12px; background:var(--jd-brand); color:white; font-weight:600; }
      button.secondary { border-color:var(--jd-input-border); color:var(--jd-ink); background:white; }
      button.link { border:0; background:transparent; color:var(--jd-muted); font-weight:400; }
      button:disabled { background:var(--jd-subtle); color:var(--jd-muted); border-color:var(--jd-input-border); }
    </style>
