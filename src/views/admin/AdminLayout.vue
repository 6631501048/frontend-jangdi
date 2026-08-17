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

    <!-- =====================================================
         TOP NAVBAR
         ===================================================== -->
    <header class="topbar">

      <!-- Hamburger Menu -->
      <button
        class="menu-btn"
        aria-label="Open menu"
        @click="drawerOpen = true"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>


      <!-- =================================================
           JANGDI BRAND
           ================================================= -->
      <RouterLink
        to="/admin/dashboard"
        class="brand"
        aria-label="JangDi Admin Dashboard"
      >

        <!-- Modern JangDi Logo -->
<svg
  class="brand-logo"
  viewBox="0 0 64 64"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
>
  <!-- Left Person -->
  <circle
    cx="20"
    cy="22"
    r="7"
    fill="#FFC629"
  />

  <!-- Right Person -->
  <circle
    cx="44"
    cy="22"
    r="7"
    fill="#FFC629"
  />

  <!-- Leaf -->
  <path
    d="M32 10C42 16 44 28 32 38C20 28 22 16 32 10Z"
    fill="#2E7D32"
  />

  <!-- Left Body -->
  <path
    d="M8 50C8 40 13 34 20 34C27 34 32 40 32 50"
    stroke="#FFC629"
    stroke-width="4"
    stroke-linecap="round"
  />

  <!-- Right Body -->
  <path
    d="M32 50C32 40 37 34 44 34C51 34 56 40 56 50"
    stroke="#FFC629"
    stroke-width="4"
    stroke-linecap="round"
  />
</svg>


        <!-- JangDi Text -->
        <span class="brand-name">
          JangDi
        </span>


        <!-- Admin Badge -->
        <span class="admin-badge">
          Admin
        </span>

      </RouterLink>


      <!-- Empty Space -->
      <div class="topbar-spacer"></div>


      <!-- =================================================
           PROFILE BUTTON
           ================================================= -->
     <!-- =================================================
     PROFILE BUTTON
     ================================================= -->
<RouterLink
  to="/admin/profile"
  class="profile-btn"
  aria-label="Go to profile"
>
  <div class="profile-avatar">

    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Background -->
      <circle
        cx="32"
        cy="32"
        r="32"
        fill="url(#avatarGradient)"
      />

      <!-- Head -->
      <circle
        cx="32"
        cy="24"
        r="10"
        fill="#ffffff"
      />

      <!-- Body -->
      <path
        d="M16 52C18 42 24 36 32 36C40 36 46 42 48 52"
        fill="#ffffff"
      />

      <defs>
        <linearGradient
          id="avatarGradient"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
        >
          <stop
            offset="0%"
            stop-color="#FFD54F"
          />
          <stop
            offset="100%"
            stop-color="#FFB300"
          />
        </linearGradient>
      </defs>
    </svg>

    <span class="online-dot"></span>

  </div>
</RouterLink>

    </header>


    <!-- =====================================================
         DRAWER OVERLAY
         ===================================================== -->
    <transition name="fade">

      <div
        v-if="drawerOpen"
        class="scrim"
        @click="closeDrawer"
      ></div>

    </transition>


    <!-- =====================================================
         DRAWER NAVIGATION
         ===================================================== -->
    <transition name="slide">

      <nav
        v-if="drawerOpen"
        class="drawer"
        aria-label="Admin navigation"
      >

        <!-- Drawer Header -->
        <div class="drawer-header">

          <!-- Small JangDi Logo -->
          <svg
            class="drawer-logo"
            viewBox="0 0 48 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >

            <circle
              cx="15"
              cy="10"
              r="6"
              stroke="#FFC629"
              stroke-width="3"
            />

            <circle
              cx="33"
              cy="10"
              r="6"
              stroke="#FFC629"
              stroke-width="3"
            />

            <path
              d="M4 36C4 28.268 8.925 23 15 23C21.075 23 26 28.268 26 36"
              stroke="#FFC629"
              stroke-width="3"
              stroke-linecap="round"
            />

            <path
              d="M22 36C22 28.268 26.925 23 33 23C39.075 23 44 28.268 44 36"
              stroke="#FFC629"
              stroke-width="3"
              stroke-linecap="round"
            />

          </svg>


          <span class="drawer-brand-name">
            JangDi
          </span>


          <!-- Close -->
          <button
            class="close-btn"
            aria-label="Close menu"
            @click="closeDrawer"
          >
            ✕
          </button>

        </div>


        <!-- Navigation List -->
        <ul class="drawer-list">

          <li
            v-for="item in navItems"
            :key="item.to"
          >

            <RouterLink
              :to="item.to"
              class="drawer-link"
              :class="{ active: route.path === item.to }"
              @click="closeDrawer"
            >

              <span class="drawer-icon">
                {{ item.icon }}
              </span>

              <span>
                {{ item.label }}
              </span>

            </RouterLink>

          </li>

        </ul>


        <!-- Logout -->
        <button
          class="logout-btn"
          @click="handleLogout"
        >

          <span class="drawer-icon">
            🚪
          </span>

          <span>
            Log out
          </span>

        </button>

      </nav>

    </transition>


    <!-- =====================================================
         MAIN CONTENT
         ===================================================== -->
    <main class="admin-content">
      <RouterView />
    </main>

  </div>
</template>


<style scoped>

/* =========================================================
   DESIGN TOKENS
   ========================================================= */

.admin-shell {
  --color-primary: #ffc629;
  --color-primary-dark: #e5a900;
  --color-primary-light: #fff4cf;

  --color-bg: #f4f4f5;
  --color-surface: #ffffff;

  --color-text: #111111;
  --color-text-muted: #9ca3af;

  --color-border: #e5e5e5;

  --radius-md: 10px;
  --radius-lg: 14px;

  min-height: 100vh;

  background: var(--color-bg);

  color: var(--color-text);

  font-family:
    system-ui,
    "Noto Sans Thai",
    sans-serif;
}


/* =========================================================
   TOPBAR
   ========================================================= */

.topbar {
  position: sticky;

  top: 0;

  z-index: 10;

  height: 76px;

  display: flex;

  align-items: center;

  padding: 0 22px;

  background: #ffffff;

  border-bottom: 1px solid #e5e5e5;
}


/* =========================================================
   HAMBURGER BUTTON
   ========================================================= */

.menu-btn {
  width: 48px;

  height: 48px;

  display: flex;

  flex-direction: column;

  justify-content: center;

  align-items: center;

  gap: 6px;

  margin-right: 12px;

  padding: 0;

  background: transparent;

  border: none;

  border-radius: 8px;

  cursor: pointer;

  flex-shrink: 0;
}

.menu-btn span {
  display: block;

  width: 32px;

  height: 4px;

  background: #222222;

  border-radius: 3px;
}

.menu-btn:hover {
  background: #f5f5f5;
}


/* =========================================================
   JANGDI BRAND
   ========================================================= */

.brand {
  display: flex;

  align-items: center;

  gap: 7px;

  text-decoration: none;

  flex-shrink: 0;
}


/* =========================================================
   JANGDI PEOPLE LOGO
   ========================================================= */

.brand-logo {
  width: 46px;
  height: 46px;

  display: block;

  filter: drop-shadow(
    0 3px 8px rgba(255, 198, 41, 0.3)
  );

  transition: transform 0.25s ease;
}

.brand-logo:hover {
  transform: scale(1.08);
}


/* =========================================================
   JANGDI TEXT
   ========================================================= */

.brand-name {
  font-family: "Plus Jakarta sans", sans-serif;

  font-size: 34px;

  line-height: 1;

  font-weight: 700;

  color: #111111;

  letter-spacing: -1.2px;
}


/* =========================================================
   ADMIN BADGE
   ========================================================= */

.admin-badge {
  display: inline-flex;

  align-items: center;

  justify-content: center;

  margin-left: 5px;

  padding: 6px 13px;

  min-width: 68px;

  font-size: 13px;

  line-height: 1;

  font-weight: 500;

  color: #111111;

  background: #ffe082;

  border-radius: 9px;
}


/* =========================================================
   RIGHT SIDE SPACER
   ========================================================= */

.topbar-spacer {
  flex: 1;
}


/* =========================================================
   PROFILE BUTTON
   ========================================================= */

.profile-btn {
  position: relative;

  width: 45px;
  height: 45px;

  display: flex;
  align-items: center;
  justify-content: center;

  margin-left: 12px;

  text-decoration: none;
  border-radius: 50%;

  flex-shrink: 0;

  transition: all 0.25s ease;
}

.profile-btn:hover {
  transform: scale(1.08);
}

.profile-avatar {
  position: relative;

  width: 45px;
  height: 45px;

  overflow: hidden;
  border-radius: 50%;

  border: 2px solid #ffffff;

  box-shadow:
    0 4px 10px rgba(255, 198, 41, 0.18);
}

.profile-avatar svg {
  width: 100%;
  height: 100%;
  display: block;
}



/* =========================================================
   PROFILE ICON
   ========================================================= */

.profile-icon {
  width: 46px;

  height: 46px;

  display: block;
}


/* =========================================================
   DRAWER OVERLAY
   ========================================================= */

.scrim {
  position: fixed;

  inset: 0;

  background: rgba(0, 0, 0, 0.4);

  z-index: 20;
}


/* =========================================================
   DRAWER
   ========================================================= */

.drawer {
  position: fixed;

  top: 0;

  left: 0;

  bottom: 0;

  width: 78%;

  max-width: 300px;

  background: #ffffff;

  z-index: 30;

  display: flex;

  flex-direction: column;

  box-shadow:
    2px 0 12px rgba(0, 0, 0, 0.15);
}


/* =========================================================
   DRAWER HEADER
   ========================================================= */

.drawer-header {
  display: flex;

  align-items: center;

  gap: 8px;

  padding: 16px;

  border-bottom: 1px solid var(--color-border);

  font-weight: 700;
}


/* Drawer Logo */

.drawer-logo {
  width: 32px;

  height: 28px;
}


/* Drawer Brand */

.drawer-brand-name {
  flex: 1;

  font-size: 22px;

  font-weight: 700;

  color: #111111;
}


/* =========================================================
   CLOSE BUTTON
   ========================================================= */

.close-btn {
  width: 44px;

  height: 44px;

  display: flex;

  align-items: center;

  justify-content: center;

  background: transparent;

  border: none;

  border-radius: var(--radius-md);

  font-size: 22px;

  color: var(--color-text);

  cursor: pointer;
}

.close-btn:hover {
  background: var(--color-bg);
}


/* =========================================================
   DRAWER LIST
   ========================================================= */

.drawer-list {
  list-style: none;

  margin: 0;

  padding: 8px 0;

  flex: 1;

  overflow-y: auto;
}


/* =========================================================
   DRAWER LINKS
   ========================================================= */

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

  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.drawer-link:hover {
  background: #fafafa;
}

.drawer-link.active {
  color: var(--color-primary-dark);

  background: var(--color-primary-light);

  border-left-color: var(--color-primary);

  font-weight: 600;
}


/* =========================================================
   DRAWER ICON
   ========================================================= */

.drawer-icon {
  font-size: 17px;

  width: 22px;

  text-align: center;

  flex-shrink: 0;
}


/* =========================================================
   LOGOUT
   ========================================================= */

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

  text-align: left;
}

.logout-btn:hover {
  background: var(--color-bg);
}


/* =========================================================
   MAIN CONTENT
   ========================================================= */

.admin-content {
  max-width: 480px;

  margin: 0 auto;

  padding-bottom: 24px;
}


/* =========================================================
   TRANSITIONS
   ========================================================= */

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}


.slide-enter-active,
.slide-leave-active {
  transition: transform 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}


/* =========================================================
   RESPONSIVE
   ========================================================= */

@media (max-width: 480px) {

  .topbar {
    height: 68px;

    padding: 0 12px;
  }


  .menu-btn {
    width: 44px;

    height: 44px;

    margin-right: 8px;
  }


  .menu-btn span {
    width: 28px;

    height: 3px;
  }


  .brand {
    gap: 5px;
  }


  .brand-logo {
    width: 36px;

    height: 31px;
  }


  .brand-name {
    font-size: 27px;

    letter-spacing: -1px;
  }


  .admin-badge {
    min-width: auto;

    padding: 6px 10px;

    font-size: 11px;

    border-radius: 8px;
  }


  .profile-btn{
  width:52px;
  height:52px;
  border-radius:50%;
  overflow:hidden;

  background:
    linear-gradient(
      135deg,
      #ffd54f,
      #ffb300
    );

  box-shadow:
    0 4px 12px rgba(255,198,41,.35);

  transition:.25s;
}

.profile-btn:hover{
  transform:scale(1.08);
}

  .profile-icon {
    width: 42px;

    height: 42px;
  }


  .admin-content {
    width: 100%;
  }

}

</style>