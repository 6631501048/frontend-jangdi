<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../services/api";
import { useAuthStore } from "../stores/auth";

const props = defineProps({ modelValue: { type: Boolean, default: false } });
const emit = defineEmits(["update:modelValue"]);
const auth = useAuthStore();
const router = useRouter();
const switching = ref(false);
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
function close() { emit("update:modelValue", false); }
async function switchRole() {
  if (switching.value) return;
  switching.value = true;
  const nextRole = isWorker.value ? "hirer" : "worker";
  try {
    const { data } = await api.patch("/auth/role", { role: nextRole });
    auth.updateUser(data.user);
    close();
    router.push({ name: nextRole === "worker" ? "job-feed" : "hirer-dashboard" });
  } catch (error) {
    window.alert(error.response?.data?.message || "สลับบทบาทไม่สำเร็จ กรุณาลองใหม่");
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
    <nav v-if="props.modelValue" class="role-drawer" aria-label="เมนูหลัก">
      <div class="drawer-brand"><span aria-hidden="true">👥</span><strong>JangDi</strong></div>
      <p class="drawer-role">กำลังใช้งานในบทบาท <strong>{{ isWorker ? "ผู้รับจ้าง (Worker)" : "ผู้ว่าจ้าง (Hirer)" }}</strong></p>
      <div class="drawer-links">
        <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="drawer-link" @click="close">{{ item.label }}</RouterLink>
        <button class="drawer-link" :disabled="switching" @click="switchRole">{{ switching ? "กำลังสลับบทบาท…" : isWorker ? "สลับเป็นผู้ว่าจ้าง (Hirer)" : "สลับเป็นผู้รับจ้าง (Worker)" }}</button>
      </div>
      <button class="drawer-link logout" @click="logout">ออกจากระบบ</button>
    </nav>
  </Transition>
</template>

<style scoped>
.drawer-backdrop { position:fixed; inset:0; z-index:50; background:rgb(0 0 0 / 35%); }
.role-drawer { position:fixed; inset:0; z-index:51; display:flex; width:max-content; max-width:min(88vw,360px); min-height:100dvh; flex-direction:column; padding:24px 20px 18px; background:#fff; box-shadow:2px 0 18px rgb(0 0 0 / 12%); }
.drawer-brand { display:flex; align-items:center; gap:12px; margin:3px 4px 6px; font-size:20px; }
.drawer-brand span { font-size:21px; }
.drawer-role { margin:0 0 22px; color:#444; font-size:13px; }
.drawer-role strong { color:#111; }
.drawer-links { display:flex; flex-direction:column; }
.drawer-link { display:flex; width:100%; min-height:56px; align-items:center; padding:0 10px; border:0; border-bottom:1px solid #eee; background:transparent; color:#111; font:inherit; font-size:15px; text-align:left; text-decoration:none; cursor:pointer; }
.drawer-link:disabled { opacity:.6; cursor:default; }
.drawer-link.logout { margin-top:auto; color:#d33; }
.drawer-fade-enter-active,.drawer-fade-leave-active { transition:opacity .16s ease; }
.drawer-fade-enter-from,.drawer-fade-leave-to { opacity:0; }
.drawer-slide-enter-active,.drawer-slide-leave-active { transition:transform .2s ease; }
.drawer-slide-enter-from,.drawer-slide-leave-to { transform:translateX(-100%); }
</style>



