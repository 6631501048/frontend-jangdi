<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import NotificationBell from "./NotificationBell.vue";
import UserAvatar from "./UserAvatar.vue";
import JangDiMark from "./JangDiMark.vue";

const props = defineProps({ roleLabel: { type: String, default: "" }, showNotifications: { type: Boolean, default: true } });
const emit = defineEmits(["menu"]);
const auth = useAuthStore();
const notificationBell = ref(null);
const router = useRouter();
const currentRoleLabel = computed(() => props.roleLabel || (auth.currentRole === "worker" ? "ผู้รับจ้าง" : "ผู้ว่าจ้าง"));
function goToProfile() {
  notificationBell.value?.close(false);
  router.push({ name: "profile" });
}
function openMenu() {
  notificationBell.value?.close(false);
  emit('menu');
}
</script>

<template>
  <header class="app-topbar">
    <button type="button" class="menu-button" aria-label="เปิดเมนู" @click="openMenu">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
    </button>
    <div class="brand">
      <JangDiMark class="brand-icon" />
      <span class="brand-name">JangDi</span>
      <span class="role-pill" :class="{ 'worker-role': auth.currentRole === 'worker' }">{{ currentRoleLabel }}</span>
    </div>
    <div class="top-actions">
      <NotificationBell v-if="showNotifications" ref="notificationBell" />
      <button type="button" class="profile-button" aria-label="ไปหน้าโปรไฟล์" @click="goToProfile">
        <UserAvatar :src="auth.user?.avatarUrl" :name="auth.user?.fullName || auth.user?.email" label="รูปโปรไฟล์ของฉัน" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-topbar { position:sticky; top:0; z-index:30; display:flex; width:100%; min-height:72px; align-items:center; justify-content:space-between; gap:8px; padding:9px max(16px, calc((100% - 1120px) / 2)); border-bottom:1px solid var(--jd-line); background:var(--jd-surface); }
.menu-button,.profile-button { display:flex; flex:0 0 44px; width:44px; height:44px; align-items:center; justify-content:center; padding:0; border:0; border-radius:50%; background:transparent; color:var(--jd-ink); cursor:pointer; }
.menu-button svg { width:21px; height:21px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; }
.profile-button { overflow:hidden; border:1px solid var(--jd-ink); }
.top-actions { display:flex; flex:0 0 auto; align-items:center; gap:8px; }
.brand { display:flex; min-width:0; align-items:center; justify-content:center; gap:6px; font-size: 1rem; font-weight:700; }
.brand-icon { font-size: 1.125rem; }
.brand-name { white-space:nowrap; color:var(--jd-brand); font-size:1.25rem; }
.role-pill { overflow:hidden; max-width:112px; padding:4px 8px; border-radius:12px; background:#fff3c4; font-size: 0.875rem; white-space:nowrap; text-overflow:ellipsis; }
.role-pill.worker-role { color:var(--jd-brand); background:var(--jd-peach-soft); }
@media(max-width:420px) { .brand-icon { display:none; } .brand { gap:4px; } .role-pill { font-size:.8125rem; padding-inline:6px; } }
</style>


