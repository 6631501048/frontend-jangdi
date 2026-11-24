<script setup>
// NFR-SEC-04: Admin-level functions shall be accessible only to authenticated Admin accounts
// (enforced by the `adminOnly` route meta in router/index.js).
// This layout provides the shared topbar + slide-in drawer used across every admin screen
// (Home / Dashboard / Manage Users / Manage Posts / Process Payment / Handle Reports / Receive SOS Alert)
// per NFR-USE-04 (shared, consistent UI component library).

import JangDiMark from '../../components/JangDiMark.vue';
import UserAvatar from '../../components/UserAvatar.vue';
import { useDialogFocus } from '../../composables/useDialogFocus';
import { ref } from "vue";
import { RouterView, RouterLink, useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";

const drawerOpen = ref(false);
const panel = ref(null);
const { onKeydown } = useDialogFocus(() => drawerOpen.value, panel, closeDrawer);
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const navItems = [
  { to: "/admin/jobs", label: "หน้าแรก", icon: "🏠" },
  { to: "/admin/dashboard", label: "ภาพรวมระบบ", icon: "📊" },
  { to: "/admin/users", label: "จัดการผู้ใช้", icon: "👥" },
  { to: "/admin/posts", label: "จัดการประกาศ", icon: "🗂️" },
  { to: "/admin/payments", label: "การเงินและคืนเงิน", icon: "💳" },
  { to: "/admin/reports", label: "รายงานผู้ใช้", icon: "🚩" },
  { to: "/admin/tester-feedback", label: "ความคิดเห็นผู้ทดสอบ", icon: "💬" },
  { to: "/admin/sos", label: "แจ้งเหตุฉุกเฉิน", icon: "🆘" },
];

function closeDrawer() {
  drawerOpen.value = false;
}

function handleLogout() {
  auth.logout();
  router.replace({ name: "login" });
}
</script>

<template>
  <div class="admin-shell jd-page">
    <header class="admin-topbar">
      <button type="button" class="menu-btn" aria-label="เปิดเมนูผู้ดูแลระบบ" @click="drawerOpen = true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
      <RouterLink to="/admin/dashboard" class="brand" aria-label="JangDi ภาพรวมระบบ"><JangDiMark /><span>JangDi</span><span class="admin-badge">ผู้ดูแลระบบ</span></RouterLink>
      <RouterLink :to="{ name: 'admin-profile' }" class="profile-btn" aria-label="ไปหน้าโปรไฟล์ผู้ดูแลระบบ"><UserAvatar :src="auth.user?.avatarUrl" :name="auth.user?.fullName || auth.user?.email" label="รูปโปรไฟล์ของฉัน" /></RouterLink>
    </header>
    <Transition name="admin-fade"><div v-if="drawerOpen" class="scrim" @click="closeDrawer" /></Transition>
    <Transition name="admin-slide">
      <aside v-if="drawerOpen" ref="panel" class="drawer" role="dialog" aria-modal="true" aria-label="เมนูผู้ดูแลระบบ" tabindex="-1" @keydown="onKeydown">
        <div class="drawer-header"><JangDiMark /><strong>JangDi</strong><button type="button" class="close-btn" aria-label="ปิดเมนู" @click="closeDrawer">×</button></div>
        <p class="drawer-caption">จัดการชุมชนให้น่าใช้งานไปด้วยกัน</p>
        <nav aria-label="หน้าผู้ดูแลระบบ"><RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="drawer-link" :class="{ active: route.path === item.to }" @click="closeDrawer"><span aria-hidden="true">{{ item.icon }}</span>{{ item.label }}</RouterLink></nav>
        <button type="button" class="logout-btn" @click="handleLogout">ออกจากระบบ</button>
      </aside>
    </Transition>
    <main class="admin-content"><RouterView /></main>
  </div>
</template>
<style scoped>
.admin-shell { --color-primary:var(--jd-brand); --color-primary-dark:var(--jd-brand-hover); --color-primary-light:var(--jd-peach-soft); --color-bg:var(--jd-canvas); --color-surface:var(--jd-surface); --color-text:var(--jd-ink); --color-text-muted:var(--jd-muted); --color-border:var(--jd-line); --radius-md:12px; --radius-lg:20px; min-height:100vh; background:var(--jd-canvas); }
.admin-topbar { position:sticky; top:0; z-index:30; display:flex; align-items:center; gap:16px; min-height:72px; padding:10px max(16px, calc((100% - 1120px) / 2)); border-bottom:1px solid var(--jd-line); background:white; }
.menu-btn,.close-btn { display:grid; place-items:center; width:44px; padding:0; flex-shrink:0; border:0; border-radius:10px; background:var(--jd-subtle); color:var(--jd-ink); }
.menu-btn svg { width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; }
.brand { display:flex; align-items:center; gap:10px; text-decoration:none; font-weight:800; font-size:1.25rem; color:var(--jd-brand); min-width:0; }
.admin-badge { padding:4px 10px; border-radius:10px; background:var(--jd-peach-soft); color:var(--jd-brand); font-size:.875rem; font-weight:600; }
.profile-btn { display:block; width:44px; height:44px; margin-left:auto; border-radius:50%; overflow:hidden; border:1px solid var(--jd-line); flex-shrink:0; }
.scrim { position:fixed; inset:0; z-index:50; background:rgb(16 14 4 / 38%); }
.drawer { position:fixed; inset:0 auto 0 0; width:360px; max-width:90vw; height:100dvh; overflow-y:auto; z-index:51; padding:24px 20px; background:white; display:flex; flex-direction:column; }
.drawer-header { display:flex; align-items:center; gap:12px; font-size:1.25rem; color:var(--jd-brand); }
.close-btn { margin-left:auto; font-size:1.5rem; }
.drawer-caption { color:var(--jd-muted); font-size:.875rem; margin:20px 0; }
.drawer-link { display:flex; align-items:center; gap:12px; padding:14px 12px; margin-bottom:4px; border-radius:12px; color:var(--jd-ink); text-decoration:none; font-size:.9375rem; }
.drawer-link.active { background:var(--jd-peach-soft); color:var(--jd-brand); font-weight:700; }
.drawer-link:hover { background:var(--jd-subtle); }
.logout-btn { margin-top:auto; padding:14px 12px; border:0; border-top:1px solid var(--jd-line); background:white; text-align:left; color:var(--jd-danger); }
.admin-content { max-width:1120px; padding:32px 24px 48px; margin:auto; }
.admin-content :deep(.header-row), .admin-content :deep(.page-header) { gap:16px; margin-bottom:24px; }
.admin-content :deep(.jd-page) { padding:0; }
.admin-content :deep(.stat-grid) { gap:16px; }
.admin-content :deep(.stat-card) { border-radius:20px; padding:24px; }
.admin-content :deep(.stat-card.fill-primary) { background:var(--jd-peach-soft); color:var(--jd-ink); }
.admin-fade-enter-active,.admin-fade-leave-active { transition:opacity .16s; }
.admin-fade-enter-from,.admin-fade-leave-to { opacity:0; }
.admin-slide-enter-active,.admin-slide-leave-active { transition:transform .2s; }
.admin-slide-enter-from,.admin-slide-leave-to { transform:translateX(-100%); }
@media(max-width:600px) { .admin-topbar { gap:8px; } .brand { gap:6px; } .brand :deep(.jangdi-mark) { display:none; } .admin-badge { padding:4px 6px; font-size:.8125rem; } .admin-content { padding:24px 16px 32px; } }
</style>
