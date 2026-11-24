<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import AuthShell from '../../components/AuthShell.vue';
import api from '../../services/api';

const email = ref('');
const loading = ref(false);
const error = ref('');
const submitted = ref(false);
const remaining = ref(0);
const canSubmit = computed(() => !loading.value && remaining.value === 0);
let timer;

async function submit() {
  if (!canSubmit.value) return;
  email.value = email.value.trim().toLowerCase();
  error.value = '';
  if (!/^[^\s@]+@lamduan\.mfu\.ac\.th$/.test(email.value)) {
    error.value = 'ต้องใช้อีเมล @lamduan.mfu.ac.th เท่านั้น';
    return;
  }
  loading.value = true;
  try {
    const { data } = await api.post('/auth/forgot-password', { email: email.value }, { publicAuth: true });
    submitted.value = true;
    remaining.value = Math.max(60, Number(data.retryAfterSeconds) || 60);
    clearInterval(timer);
    timer = setInterval(() => { remaining.value = Math.max(0, remaining.value - 1); if (!remaining.value) clearInterval(timer); }, 1000);
  } catch (e) {
    error.value = e.response?.data?.message || 'ขอลิงก์ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง';
  } finally { loading.value = false; }
}
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <AuthShell>
    <h1>ตั้งรหัสผ่านบัญชี JangDi</h1>
    <p class="subtitle">ลืมรหัสผ่าน หรือเคยใช้ Google และยังไม่มีรหัสผ่าน? รับลิงก์ทางอีเมลเพื่อตั้งรหัสให้บัญชีเดิมได้ที่นี่</p>
    <div v-if="submitted" class="recovery-notice" role="status">
      <strong>ตรวจสอบอีเมลของคุณ</strong>
      <p>หากอีเมลนี้มีบัญชี JangDi ที่ใช้งานได้ ระบบจะส่งลิงก์ให้ กรุณาตรวจสอบกล่องจดหมายและสแปม</p>
      <p>ลิงก์มีอายุ 15 นาที ใช้ได้ครั้งเดียว เมื่อขอลิงก์ใหม่ให้ใช้ฉบับล่าสุด</p>
    </div>
    <form @submit.prevent="submit" :aria-busy="loading">
      <label>อีเมลมหาวิทยาลัย<input v-model="email" type="email" required autocomplete="email" placeholder="student_id@lamduan.mfu.ac.th" :disabled="loading" /></label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="!canSubmit">{{ loading ? 'กำลังขอลิงก์…' : remaining ? `ขอส่งอีกครั้งได้ใน ${remaining} วินาที` : submitted ? 'ขอลิงก์อีกครั้ง' : 'รับลิงก์ตั้งรหัสผ่าน' }}</button>
    </form>
    <p class="hint">หากยังเข้า Google ได้ คุณยังใช้ช่องทางเดิมได้ตามปกติ</p>
    <RouterLink class="back-link" :to="{ name: 'login' }">กลับไปเข้าสู่ระบบ</RouterLink>
  </AuthShell>
</template>

<style scoped>
.recovery-notice { margin-bottom:24px; padding:16px; border:1px solid var(--jd-line); border-radius:12px; background:var(--jd-peach-soft); font-size:.875rem; overflow-wrap:anywhere; }
.recovery-notice p { margin:8px 0 0; }
.back-link { display:flex; justify-content:center; align-items:center; min-height:44px; color:var(--jd-brand); text-underline-offset:4px; }
button:disabled { cursor:default; }
</style>
