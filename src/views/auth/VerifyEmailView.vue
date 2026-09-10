<script setup>
// FR-AUTH-04: หน้ายืนยันอีเมล — ผู้ใช้กดลิงก์จากอีเมลแล้วมาที่นี่พร้อม ?token=...
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";

const route = useRoute();
const router = useRouter();
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
  } catch (err) {
    status.value = "error";
    errorMsg.value = err.response?.data?.message || "ยืนยันอีเมลไม่สำเร็จ";
  }
});

function goToLogin() {
  router.push("/login");
}
</script>

<template>
  <main class="verify-page">
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
      <p class="hint">ถ้าลิงก์หมดอายุ ให้เข้าสู่ระบบแล้วขอลิงก์ยืนยันใหม่จากหน้าโปรไฟล์</p>
      <button @click="goToLogin">ไปหน้าเข้าสู่ระบบ</button>
    </div>
  </main>
</template>

<style scoped>
.verify-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
.state { text-align: center; max-width: 320px; }
.icon { font-size: 40px; margin: 0 0 8px; }
h1 { font-size: 18px; margin: 0 0 8px; }
p { color: #555; font-size: 14px; }
.hint { font-size: 12px; color: #999; }
button { margin-top: 16px; min-height: 44px; padding: 0 20px; border-radius: 8px; border: none; background: #2563eb; color: white; font-weight: 600; cursor: pointer; }
</style>