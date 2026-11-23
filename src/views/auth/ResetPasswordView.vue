<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthShell from '../../components/AuthShell.vue';
import api from '../../services/api';
import { useAuthStore } from '../../stores/auth';
import { passwordValidationMessage, recoveryToken } from '../../services/passwordRecovery';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const token = ref(recoveryToken(route.hash));
const password = ref('');
const confirm = ref('');
const loading = ref(false);
const error = ref('');
const success = ref(false);
const invalid = ref(!token.value);
let requestId = 0;
watch(() => route.hash, hash => {
  if (!hash && !Object.keys(route.query).length) return;
  requestId += 1;
  token.value = recoveryToken(hash);
  invalid.value = !token.value;
  success.value = false; error.value = ''; loading.value = false;
  password.value = ''; confirm.value = '';
  router.replace({ name: 'reset-password', hash: '', query: {} });
}, { immediate: true });

async function submit() {
  if (loading.value || success.value || invalid.value) return;
  error.value = passwordValidationMessage(password.value, confirm.value);
  if (error.value) return;
  const id = ++requestId;
  loading.value = true;
  try {
    await api.post('/auth/reset-password', { token: token.value, password: password.value }, { publicAuth: true });
    if (id !== requestId) return;
    auth.logout();
    token.value = ''; password.value = ''; confirm.value = '';
    success.value = true;
  } catch (e) {
    if (id !== requestId) return;
    error.value = e.response?.data?.message || 'ตั้งรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง';
    if (e.response?.data?.code === 'RESET_LINK_INVALID') { invalid.value = true; token.value = ''; }
  } finally { if (id === requestId) loading.value = false; }
}
</script>

<template>
  <AuthShell>
    <template v-if="success">
      <h1>ตั้งรหัสผ่านสำเร็จ</h1>
      <p class="subtitle" role="status">เข้าสู่บัญชีเดิมด้วยอีเมลและรหัสผ่านใหม่ได้เลย บัญชีที่เชื่อม Google ยังใช้ Google ได้ตามปกติ</p>
      <RouterLink class="recovery-primary" :to="{ name: 'login' }">เข้าสู่ระบบ</RouterLink>
    </template>
    <template v-else-if="invalid">
      <h1>กรุณาขอลิงก์ใหม่</h1>
      <p class="subtitle" role="alert">{{ error || 'ไม่พบลิงก์ตั้งรหัสผ่านที่ใช้ได้ กรุณาเปิดลิงก์จากอีเมล หรือขอลิงก์ใหม่' }}</p>
      <RouterLink class="recovery-primary" :to="{ name: 'forgot-password' }">รับลิงก์ตั้งรหัสผ่านใหม่</RouterLink>
    </template>
    <template v-else>
      <h1>ตั้งรหัสผ่านใหม่</h1>
      <p class="subtitle">ใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร แนะนำให้ใช้รหัสที่ไม่ซ้ำกับบริการอื่น</p>
      <form @submit.prevent="submit" :aria-busy="loading">
        <label>รหัสผ่านใหม่<input v-model="password" type="password" required minlength="8" autocomplete="new-password" :disabled="loading" aria-describedby="password-help" /></label>
        <p id="password-help" class="hint">รองรับความยาวไม่เกิน 72 ไบต์ (ภาษาไทยประมาณ 24 ตัวอักษร)</p>
        <label>ยืนยันรหัสผ่านใหม่<input v-model="confirm" type="password" required minlength="8" autocomplete="new-password" :disabled="loading" /></label>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button type="submit" :disabled="loading">{{ loading ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่' }}</button>
      </form>
      <p class="hint">เมื่อตั้งรหัสผ่านสำเร็จ ทุกอุปกรณ์ต้องเข้าสู่ระบบใหม่</p>
    </template>
    <RouterLink v-if="!success" class="back-link" :to="{ name: 'login' }">กลับไปเข้าสู่ระบบ</RouterLink>
  </AuthShell>
</template>

<style scoped>
.back-link { display:flex; justify-content:center; align-items:center; min-height:44px; margin-top:16px; color:var(--jd-brand); text-underline-offset:4px; }
.recovery-primary { display:flex; align-items:center; justify-content:center; min-height:48px; padding:12px 16px; border-radius:12px; background:var(--jd-brand); color:white; text-decoration:none; font-weight:700; }
.recovery-primary:hover { background:var(--jd-brand-hover); }
#password-help { margin:0; }
</style>
