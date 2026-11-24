<script setup>
import { usePageNavigation } from "../composables/usePageNavigation";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useNotificationsStore } from "../stores/notifications";
import { useNotificationActions } from '../composables/useNotificationActions';
import NotificationList from '../components/NotificationList.vue';
const { goBack: navigateBack } = usePageNavigation();

const store = useNotificationsStore();
const router = useRouter();
const unreadOnly = ref(false);
const displayedItems = computed(() => unreadOnly.value ? store.items.filter(item => !item.read && !item.isRead) : store.items);
const { openingId, markingAll, actionError, openItem, markAll } = useNotificationActions();
onMounted(() => { if (!store.loaded || store.error) store.refresh(); });
</script>

<template>
  <main class="notifications-page jd-page">
    <header class="notifications-header">
      <button class="back-button" aria-label="กลับ" @click="navigateBack()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" /></svg>
      </button>
      <h1>การแจ้งเตือน</h1>
      <button type="button" class="mark-all-button" :disabled="!store.unreadCount || store.loading || markingAll || openingId !== null" @click="markAll">{{ markingAll ? 'กำลังบันทึก…' : 'อ่านทั้งหมด' }}</button>
    </header>

    <p class="notifications-summary">ติดตามความเคลื่อนไหวของงานและคำขอใช้บริการ · ยังไม่อ่าน {{ store.unreadCount }} รายการ</p>
    <div class="notification-filters" role="group" aria-label="กรองการแจ้งเตือน"><button type="button" :aria-pressed="!unreadOnly" @click="unreadOnly = false">ทั้งหมด</button><button type="button" :aria-pressed="unreadOnly" @click="unreadOnly = true">ยังไม่อ่าน</button></div>
    <p v-if="actionError" class="notification-action-error" role="alert">{{ actionError }}</p>
    <NotificationList :items="displayedItems" :loading="store.loading" :error="store.error" :opening-id="openingId" :unread-only="unreadOnly" @open="openItem" @retry="store.refresh()" />
  </main>
</template>

<style scoped>
.notifications-page {
  max-width: 760px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 0 16px 28px;
  background: var(--jd-canvas);
  color: var(--jd-ink);
}
.notifications-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 88px;
  align-items: center;
  min-height: 58px;
  margin: 0 -16px 18px;
  padding: 0 12px;
  background: var(--jd-surface);
  border-bottom: 1px solid var(--jd-line);
}
.notifications-header h1 {
  margin: 0;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 700;
}
.back-button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--jd-ink);
  cursor: pointer;
}
.back-button svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.mark-all-button {
  justify-self: end;
  padding: 6px 0 6px 4px;
  border: 0;
  background: transparent;
  color: var(--jd-warning);
  font-size: .875rem;
  white-space: nowrap;
  cursor: pointer;
}
.mark-all-button:disabled { color: var(--jd-muted); cursor: default; }
.notifications-summary { color:var(--jd-muted); font-size:.875rem; margin:24px 0 16px; }
.notification-filters { display:flex; gap:8px; margin:0 0 20px; }
.notification-filters button { min-height:44px; padding:8px 18px; border:1px solid var(--jd-input-border); border-radius:12px; background:white; color:var(--jd-muted); font:inherit; font-size:.875rem; cursor:pointer; }
.notification-filters button[aria-pressed="true"] { background:var(--jd-brand); color:white; border-color:var(--jd-brand); font-weight:600; }
.notification-action-error { padding:12px; border-radius:12px; background:var(--jd-danger-soft); color:var(--jd-danger); font-size:.875rem; }
</style>
