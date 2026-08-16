<script setup>
// NFR-SEC-04: Admin-level functions shall be accessible only to authenticated Admin accounts
// (enforced by the `adminOnly` route meta in router/index.js).
// This layout provides the shared topbar + slide-in drawer used across every admin screen
// (Home / Dashboard / Manage Users / Manage Posts / Process Payment / Handle Reports / Receive SOS Alert)
// per NFR-USE-04 (shared, consistent UI component library).
import { ref } from "vue";
import { RouterView, RouterLink, useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";

const drawerOpen = ref(false);
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const navItems = [
  { to: "/admin/jobs", label: "Home", icon: "🏠" },
  { to: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/admin/users", label: "Manage Users", icon: "👥" },
  { to: "/admin/posts", label: "Manage Posts", icon: "🗂️" },
  { to: "/admin/payments", label: "Process Payment", icon: "💳" },
  { to: "/admin/reports", label: "Handle Reports", icon: "🚩" },
  { to: "/admin/sos", label: "Receive SOS Alert", icon: "🆘" },
];

function closeDrawer() {
  drawerOpen.value = false;
}

function handleLogout() {
  auth.logout();
  router.push({ name: "login" });
}
</script>

<template>
  <div class="admin-shell">
    <!-- Topbar: hamburger + logo + admin badge + profile (NFR-USE-01/02: mobile-first, 44x44 touch targets) -->
    <header class="topbar">
      <button class="icon-btn" aria-label="Open menu" @click="drawerOpen = true">
        <span class="bar"></span><span class="bar"></span><span class="bar"></span>
      </button>
      <RouterLink to="/admin/dashboard" class="brand">
        <span class="brand-icon">🧑‍🤝‍🧑</span>
        <span class="brand-name">JangDi</span>
        <span class="admin-badge">Admin</span>
      </RouterLink>
      <button class="icon-btn avatar-btn" aria-label="Profile">
        <span class="avatar">👤</span>
      </button>
    </header>

    <!-- Drawer overlay -->
    <transition name="fade">
      <div v-if="drawerOpen" class="scrim" @click="closeDrawer"></div>
    </transition>

    <!-- Drawer nav -->
    <transition name="slide">
      <nav v-if="drawerOpen" class="drawer" aria-label="Admin navigation">
        <div class="drawer-header">
          <span class="brand-icon">🧑‍🤝‍🧑</span>
          <span class="brand-name">JangDi</span>
          <button class="icon-btn" aria-label="Close menu" @click="closeDrawer">✕</button>
        </div>
        <ul class="drawer-list">
          <li v-for="item in navItems" :key="item.to">
            <RouterLink
              :to="item.to"
              class="drawer-link"
              :class="{ active: route.path === item.to }"
              @click="closeDrawer"
            >
              <span class="drawer-icon">{{ item.icon }}</span>
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>
        <button class="logout-btn" @click="handleLogout">
          <span class="drawer-icon">🚪</span> Log out
        </button>
      </nav>
    </transition>

    <main class="admin-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* Design tokens: declared once here, inherited by every child route view via normal
   CSS custom-property cascade (scoped attrs don't block inheritance). */
.admin-shell {
  --color-primary: #f5b942;
  --color-primary-dark: #e8a415;
  --color-primary-light: #fdecc4;
  --color-bg: #f4f4f5;
  --color-surface: #ffffff;
  --color-text: #1f2937;
  --color-text-muted: #9ca3af;
  --color-border: #e9e9ec;
  --color-green: #16a34a;
  --color-green-bg: #dcfce7;
  --color-red: #dc2626;
  --color-red-bg: #fde3e3;
  --radius-md: 10px;
  --radius-lg: 14px;

  min-height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: system-ui, "Noto Sans Thai", sans-serif;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.icon-btn {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-md);
}
.icon-btn:hover { background: var(--color-bg); }
.bar { display: block; width: 20px; height: 2px; background: var(--color-text); margin: 2px 0; }

.brand {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: var(--color-text);
  font-weight: 700;
  font-size: 17px;
}
.brand-icon { font-size: 18px; }
.admin-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary-dark);
  background: var(--color-primary-light);
  padding: 2px 8px;
  border-radius: 999px;
}

.avatar { font-size: 18px; }

.scrim {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 20;
}

.drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 78%;
  max-width: 300px;
  background: var(--color-surface);
  z-index: 30;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
}

.drawer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  font-weight: 700;
}
.drawer-header .brand-name { flex: 1; }

.drawer-list { list-style: none; margin: 0; padding: 8px 0; flex: 1; overflow-y: auto; }
.drawer-link {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 0 16px;
  text-decoration: none;
  color: var(--color-text);
  border-left: 3px solid transparent;
  border-bottom: 1px solid var(--color-border);
}
.drawer-link.active {
  color: var(--color-primary-dark);
  background: var(--color-primary-light);
  border-left-color: var(--color-primary);
  font-weight: 600;
}
.drawer-icon { font-size: 17px; width: 22px; text-align: center; }

.logout-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 0 16px;
  border: none;
  border-top: 1px solid var(--color-border);
  background: none;
  color: var(--color-text);
  cursor: pointer;
  font-size: 15px;
}

.admin-content { max-width: 480px; margin: 0 auto; padding-bottom: 24px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform 0.2s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }
</style>