<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../services/api";
import { useAuthStore } from "../stores/auth";
import JangDiMark from "./JangDiMark.vue";
import { useDialogFocus } from "../composables/useDialogFocus";

const props = defineProps({ modelValue: { type: Boolean, default: false } });
const emit = defineEmits(["update:modelValue"]);
const auth = useAuthStore();
const router = useRouter();
const switching = ref(false);
const switchError = ref('');
const panel = ref(null);
const { onKeydown } = useDialogFocus(() => props.modelValue, panel, close);
const isWorker = computed(() => auth.currentRole === "worker");
const items = computed(() => isWorker.value
  ? [
      { label: "หน้าแรก", to: "/worker" },
      { label: "งานของฉัน", to: "/worker/jobs" },
      { label: "การชำระเงิน", to: "/worker/payment" },
    ]
  : [
      { label: "หน้าแรก", to: "/hirer" },
      { label: "งานของฉัน", to: "/hirer/my-jobs" },
      { label: "การชำระเงิน", to: "/hirer/payment" },
    ]);
function close() { switchError.value = ''; emit("update:modelValue", false); }
async function switchRole() {
  if (switching.value) return;
  switching.value = true;
  switchError.value = '';
  const nextRole = isWorker.value ? "hirer" : "worker";
  try {
    const { data } = await api.patch("/auth/role", { role: nextRole });
    auth.updateUser(data.user);
    close();
    router.push({ name: nextRole === "worker" ? "job-feed" : "hirer-dashboard" });
  } catch (error) {
    switchError.value = error.response?.data?.message || "สลับบทบาทไม่สำเร็จ กรุณาลองใหม่";
  } finally {
    switching.value = false;
  }
}
function logout() {
  auth.logout();
  close();
  router.push({ name: "login" });
}
</script>

<template>
  <Transition name="drawer-fade">
    <div v-if="props.modelValue" class="drawer-backdrop" @click="close" />
  </Transition>
  <Transition name="drawer-slide">
    <aside v-if="props.modelValue" ref="panel" class="role-drawer" role="dialog" aria-modal="true" aria-label="เมนูหลัก" tabindex="-1" @keydown="onKeydown">
      <div class="drawer-brand"><JangDiMark /><strong>JangDi</strong><button type="button" class="drawer-close" aria-label="ปิดเมนู" @click="close">×</button></div>
      <p class="drawer-role">กำลังใช้งานในบทบาท <strong>{{ isWorker ? "ผู้รับจ้าง (Worker)" : "ผู้ว่าจ้าง (Hirer)" }}</strong></p>
      <nav class="drawer-links" aria-label="หน้าต่าง ๆ ของ JangDi">
        <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="drawer-link" @click="close">{{ item.label }}</RouterLink>
        <button class="drawer-link" :disabled="switching" @click="switchRole">{{ switching ? "กำลังสลับบทบาท…" : isWorker ? "สลับเป็นผู้ว่าจ้าง (Hirer)" : "สลับเป็นผู้รับจ้าง (Worker)" }}</button>
      </nav>
      <p v-if="switchError" class="drawer-error" role="alert">{{ switchError }}</p>
      <button class="drawer-link logout" @click="logout">ออกจากระบบ</button>
    </aside>
  </Transition>
</template>

<style scoped>
.drawer-error { padding:12px; border-radius:10px; background:var(--jd-danger-soft); color:var(--jd-danger); font-size:.875rem; overflow-wrap:anywhere; }
.drawer-backdrop { position:fixed; inset:0; z-index:50; background:rgb(0 0 0 / 35%); }
.role-drawer { position:fixed; inset:0; z-index:51; display:flex; width:360px; max-width:90vw; height:100dvh; overflow-y:auto; flex-direction:column; padding:24px 20px 18px; background:var(--jd-surface); box-shadow:2px 0 18px rgb(0 0 0 / 12%); }
.drawer-brand { display:flex; align-items:center; gap:12px; margin:3px 4px 6px; font-size: 1.25rem; }
.drawer-brand span { font-size: 1.3125rem; }
.drawer-role { margin:0 0 22px; color:var(--jd-muted); font-size: 0.875rem; }
.drawer-role strong { color:var(--jd-ink); }
.drawer-links { display:flex; flex-direction:column; }
.drawer-link { display:flex; width:100%; min-height:56px; align-items:center; padding:0 10px; border:0; border-bottom:1px solid var(--jd-line); background:transparent; color:var(--jd-ink); font:inherit; font-size: 0.9375rem; text-align:left; text-decoration:none; cursor:pointer; }
.drawer-link:disabled { opacity:.6; cursor:default; }
.drawer-link.logout { margin-top:auto; color:var(--jd-danger); }
.drawer-close { margin-left:auto; width:44px; border:0; border-radius:10px; background:var(--jd-subtle); color:var(--jd-ink); font-size:1.5rem; }
.drawer-link.router-link-exact-active { color:var(--jd-brand); background:var(--jd-peach-soft); border-radius:10px; font-weight:700; }
.drawer-fade-enter-active,.drawer-fade-leave-active { transition:opacity .16s ease; }
.drawer-fade-enter-from,.drawer-fade-leave-to { opacity:0; }
.drawer-slide-enter-active,.drawer-slide-leave-active { transition:transform .2s ease; }
.drawer-slide-enter-from,.drawer-slide-leave-to { transform:translateX(-100%); }
</style>



