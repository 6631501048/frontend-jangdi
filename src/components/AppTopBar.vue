<script setup>
import { computed } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useNotificationsStore } from "../stores/notifications";
import UserAvatar from "./UserAvatar.vue";

const props = defineProps({ roleLabel: { type: String, default: "" }, showNotifications: { type: Boolean, default: true } });
const emit = defineEmits(["menu"]);
const auth = useAuthStore();
const notifications = useNotificationsStore();
const router = useRouter();
const currentRoleLabel = computed(() => props.roleLabel || (auth.currentRole === "worker" ? "ผู้รับจ้าง" : "ผู้ว่าจ้าง"));
function goToProfile() {
  router.push({ name: "profile" });
}
</script>

<template>
  <header class="app-topbar">
    <button type="button" class="menu-button" aria-label="เปิดเมนู" @click="emit('menu')">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
    </button>
    <div class="brand">
      <span class="brand-icon" aria-hidden="true">👥</span>
      <span class="brand-name">JangDi</span>
      <span class="role-pill" :class="{ 'worker-role': auth.currentRole === 'worker' }">{{ currentRoleLabel }}</span>
    </div>
    <div class="top-actions">
      <RouterLink v-if="showNotifications" to="/notifications" class="notification-button" aria-label="การแจ้งเตือน">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        <span v-if="notifications.unreadCount" class="notification-badge">{{ notifications.unreadCount }}</span>
      </RouterLink>
      <button type="button" class="profile-button" aria-label="ไปหน้าโปรไฟล์" @click="goToProfile">
        <UserAvatar :src="auth.user?.avatarUrl" :name="auth.user?.fullName || auth.user?.email" label="รูปโปรไฟล์ของฉัน" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-topbar { position:sticky; top:0; z-index:30; display:flex; width:100%; min-height:60px; align-items:center; justify-content:space-between; gap:8px; padding:9px 14px; border-bottom:1px solid #eee; background:#fff; }
.menu-button,.profile-button { display:flex; flex:0 0 40px; width:40px; height:40px; align-items:center; justify-content:center; padding:0; border:0; border-radius:50%; background:transparent; color:#111; cursor:pointer; }
.menu-button svg { width:21px; height:21px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; }
.profile-button { overflow:hidden; border:1px solid #111; }
.top-actions { display:flex; flex:0 0 auto; align-items:center; gap:8px; }
.notification-button { position:relative; display:flex; width:40px; height:40px; align-items:center; justify-content:center; border-radius:50%; color:#333; text-decoration:none; }
.notification-button svg { width:21px; height:21px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.notification-badge { position:absolute; top:0; right:0; display:grid; min-width:17px; height:17px; place-items:center; padding:0 4px; border-radius:9px; background:#e11d48; color:#fff; font-size:10px; font-weight:700; }
.brand { display:flex; min-width:0; align-items:center; justify-content:center; gap:6px; font-size:16px; font-weight:700; }
.brand-icon { font-size:18px; }
.brand-name { white-space:nowrap; }
.role-pill { overflow:hidden; max-width:112px; padding:4px 8px; border-radius:12px; background:#fff3c4; font-size:11px; white-space:nowrap; text-overflow:ellipsis; }
.role-pill.worker-role { color:#2563eb; background:#eff6ff; }
</style>


