<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useNotificationsStore } from "../stores/notifications";
import { useAuthStore } from '../stores/auth';

const store = useNotificationsStore();
const auth = useAuthStore();
const router = useRouter();
onMounted(() => { if (!store.loaded) store.refresh(); });
function destination(item) {
  if (item.relatedEntityType === 'Job' && item.relatedEntityId) return {name:auth.currentRole==='worker'?'worker-job-tracking':'hirer-job-detail',params:{id:String(item.relatedEntityId)}};
  if (item.to && typeof item.to === "object") return item.to;
  if (typeof item.url === "string" && item.url.startsWith("/")) return item.url;
  const path = item.data?.url || item.data?.path;
  return typeof path === "string" && path.startsWith("/") ? path : null;
}
async function open(item) {
  try { await store.markRead(item); } catch { /* keep the item visible; retry on next interaction */ }
  const to = destination(item);
  if (to) router.push(to);
}
</script>

<template>
  <main class="notifications-page">
    <header class="notifications-header">
      <button class="back-button" aria-label="กลับ" @click="router.back()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" /></svg>
      </button>
      <h1>การแจ้งเตือน</h1>
      <button class="mark-all-button" :disabled="!store.unreadCount" @click="store.markAllRead">อ่านทั้งหมด</button>
    </header>

    <p v-if="store.error" class="notice-state error" role="alert">{{ store.error }} <button @click="store.refresh">ลองอีกครั้ง</button></p>
    <p v-else-if="store.loading" class="notice-state">กำลังโหลด...</p>
    <p v-else-if="!store.items.length" class="notice-state">ยังไม่มีการแจ้งเตือน</p>
    <ul v-else class="notification-list">
      <li v-for="item in store.items" :key="item._id || item.id">
        <button class="notification-card" :class="{ unread: !(item.read || item.isRead) }" @click="open(item)">
          <strong>{{ item.title || item.type || "แจ้งเตือน" }}</strong>
          <span>{{ item.message || item.body || "มีการแจ้งเตือนใหม่" }}</span>
          <time v-if="item.createdAt">{{ new Date(item.createdAt).toLocaleString("th-TH") }}</time>
        </button>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.notifications-page {
  max-width: 760px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 0 16px 28px;
  background: #f7f7f7;
  color: #222;
}
.notifications-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 76px;
  align-items: center;
  min-height: 58px;
  margin: 0 -16px 18px;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}
.notifications-header h1 {
  margin: 0;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 700;
}
.back-button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: #111;
  cursor: pointer;
}
.back-button svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.mark-all-button {
  justify-self: end;
  padding: 6px 0 6px 4px;
  border: 0;
  background: transparent;
  color: #856000;
  font-size: .78rem;
  white-space: nowrap;
  cursor: pointer;
}
.mark-all-button:disabled { color: #aaa; cursor: default; }
.notification-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.notification-card {
  display: grid;
  width: 100%;
  gap: 7px;
  padding: 15px 14px;
  border: 1px solid #e6e6e6;
  border-radius: 12px;
  background: #fff;
  color: inherit;
  text-align: left;
  box-shadow: 0 2px 7px rgb(0 0 0 / 4%);
  cursor: pointer;
}
.notification-card.unread { border-color: #e9c86e; background: #fffaf0; }
.notification-card strong { font-size: .96rem; line-height: 1.4; }
.notification-card span { font-size: .92rem; line-height: 1.5; overflow-wrap: anywhere; }
.notification-card time { color: #777; font-size: .8rem; }
.notice-state { margin: 24px 4px; color: #666; text-align: center; }
.notice-state.error { color: #a22; }
.notice-state button { margin-left: 6px; border: 0; background: transparent; color: #856000; text-decoration: underline; cursor: pointer; }
</style>
