<script setup>
import AuthShell from "../../components/AuthShell.vue";
// FR-AUTH-04: หน้ายืนยันอีเมล — ผู้ใช้กดลิงก์จากอีเมลแล้วมาที่นี่พร้อม ?token=...
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
import { useAuthStore } from "../../stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const status = ref("loading"); // "loading" | "success" | "error"
const errorMsg = ref("");

onMounted(async () => {
  const token = route.query.token;
  if (!token) {
    status.value = "error";
    errorMsg.value = "ไม่พบ token ยืนยันใน URL";
    return;
  }
  try {
    await api.get("/auth/verify-email", { params: { token } });
    status.value = "success";
    // ถ้ากดลิงก์ทั้งที่ login อยู่ ให้รีเฟรชสถานะผู้ใช้ในเครื่อง ไม่งั้น guard/ปุ่มจะยังคิดว่าไม่ได้ยืนยัน
    if (auth.isLoggedIn) {
      try {
        const { data } = await api.get("/auth/me");
        auth.updateUser(data);
      } catch { /* ไม่เป็นไร ผู้ใช้ login ใหม่ก็ได้สถานะล่าสุด */ }
    }
  } catch (err) {
    status.value = "error";
    errorMsg.value = err.response?.data?.message || "ยืนยันอีเมลไม่สำเร็จ";
  }
});

function goToLogin() {
  router.push(auth.isLoggedIn ? { name: auth.currentRole === "worker" ? "worker-dashboard" : "hirer-dashboard" } : "/login");
}
</script>

<template>
  <AuthShell><div class="verification-content">
    <div v-if="status === 'loading'" class="state">
      <p>กำลังยืนยันอีเมล...</p>
    </div>
    <div v-else-if="status === 'success'" class="state success">
      <p class="icon">✅</p>
      <h1>ยืนยันอีเมลสำเร็จ</h1>
      <p>คุณสามารถเข้าสู่ระบบได้ตามปกติแล้ว</p>
      <button @click="goToLogin">ไปหน้าเข้าสู่ระบบ</button>
    </div>
    <div v-else class="state error">
      <p class="icon">⚠️</p>
      <h1>ยืนยันอีเมลไม่สำเร็จ</h1>
      <p>{{ errorMsg }}</p>
      <p class="hint">ถ้าลิงก์หมดอายุ ให้เข้าสู่ระบบแล้วขอลิงก์ยืนยันใหม่ได้ที่หน้า "ยืนยันอีเมล"</p>
      <button @click="goToLogin">ไปหน้าเข้าสู่ระบบ</button>
    </div>
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
