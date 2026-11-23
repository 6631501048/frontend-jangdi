<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useNotificationsStore } from '../stores/notifications';
import { latestNotifications } from '../services/notificationNavigation';
import { useNotificationActions } from '../composables/useNotificationActions';
import { useDialogFocus } from '../composables/useDialogFocus';
import NotificationList from './NotificationList.vue';

const store = useNotificationsStore();
const route = useRoute();
const trigger = ref(null);
const panel = ref(null);
const opened = ref(false);
const mobile = ref(false);
const placement = ref({});
const recent = computed(() => latestNotifications(store.items));
const { openingId, markingAll, actionError, openItem, markAll } = useNotificationActions({ onNavigate: () => close(false) });
const { onKeydown: modalKeydown } = useDialogFocus(() => opened.value && mobile.value, panel, () => close());
let media;
let appRoot;
let wasInert = false;

function restoreBackground() {
  if (appRoot) { appRoot.inert = wasInert; appRoot = null; }
}
function position() {
  if (!trigger.value) return;
  const rect = trigger.value.getBoundingClientRect();
  placement.value = { '--notification-top': `${rect.bottom + 12}px`, '--notification-right': `${Math.max(16, window.innerWidth - rect.right)}px` };
}
function syncViewport() {
  mobile.value = media.matches;
  position();
}
function close(returnFocus = true) {
  if (!opened.value) return;
  opened.value = false;
  // Wait until the mobile backdrop has released inert before returning focus.
  if (returnFocus) nextTick(() => trigger.value?.focus());
}
async function toggle() {
  if (opened.value) { close(); return; }
  actionError.value = '';
  position();
  opened.value = true;
  // Refresh the existing store; opening the preview never marks items read.
  store.refresh();
  await nextTick();
  if (!mobile.value && opened.value) panel.value?.focus();
}
function outside(event) {
  if (!opened.value || panel.value?.contains(event.target) || trigger.value?.contains(event.target)) return;
  close(mobile.value);
}
function focusOutside(event) {
  if (!mobile.value) outside(event);
}
function escape(event) {
  if (opened.value && event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); close(); }
}
function keydown(event) {
  if (mobile.value) modalKeydown(event);
}
watch(() => route.fullPath, () => close(false));
watch(mobile, async (value) => {
  if (opened.value && !value) { await nextTick(); panel.value?.focus(); }
});
watch(() => opened.value && mobile.value, async (modal) => {
  restoreBackground();
  if (modal) {
    await nextTick();
    if (!opened.value || !mobile.value) return;
    appRoot = document.querySelector('.app-shell');
    if (appRoot) { wasInert = appRoot.inert; appRoot.inert = true; }
  }
}, { flush: 'post' });
onMounted(() => {
  media = window.matchMedia('(max-width: 640px)');
  syncViewport();
  media.addEventListener('change', syncViewport);
  window.addEventListener('resize', position);
  document.addEventListener('pointerdown', outside);
  document.addEventListener('focusin', focusOutside);
  document.addEventListener('keydown', escape);
});
onBeforeUnmount(() => {
  restoreBackground();
  media?.removeEventListener('change', syncViewport);
  window.removeEventListener('resize', position);
  document.removeEventListener('pointerdown', outside);
  document.removeEventListener('focusin', focusOutside);
  document.removeEventListener('keydown', escape);
});
defineExpose({ close });
</script>

<template>
  <div class="notification-center">
    <button ref="trigger" type="button" class="notification-button" :class="{ expanded: opened }" :aria-label="store.unreadCount ? `การแจ้งเตือน ยังไม่อ่าน ${store.unreadCount} รายการ` : 'การแจ้งเตือน'" aria-haspopup="dialog" :aria-expanded="opened" :aria-controls="opened ? 'notification-preview' : undefined" @click="toggle">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      <span v-if="store.unreadCount" class="notification-badge" aria-hidden="true">{{ store.unreadCount > 99 ? '99+' : store.unreadCount }}</span>
    </button>
    <Teleport to="body">
      <div v-if="opened && mobile" class="notification-backdrop" aria-hidden="true" @click="close()" />
      <section v-if="opened" id="notification-preview" ref="panel" class="notification-panel" :class="{ 'mobile-sheet': mobile }" :style="placement" role="dialog" :aria-modal="mobile ? 'true' : undefined" aria-labelledby="notification-preview-title" tabindex="-1" @keydown="keydown">
        <header class="preview-header"><div><h2 id="notification-preview-title">การแจ้งเตือน</h2><p>รายการล่าสุดของคุณ</p></div><button type="button" class="preview-close" aria-label="ปิดการแจ้งเตือน" @click="close()">×</button></header>
        <div class="preview-toolbar"><span>{{ store.unreadCount }} รายการที่ยังไม่อ่าน</span><button type="button" :disabled="!store.unreadCount || store.loading || markingAll || openingId !== null" @click="markAll">{{ markingAll ? 'กำลังบันทึก…' : 'อ่านทั้งหมด' }}</button></div>
        <div class="preview-scroll"><p v-if="actionError" class="action-error" role="alert">{{ actionError }}</p><NotificationList :items="recent" :loading="store.loading" :error="store.error" :opening-id="openingId" @open="openItem" @retry="store.refresh()" /></div>
        <footer class="preview-footer"><RouterLink to="/notifications" @click="close(false)">ดูการแจ้งเตือนทั้งหมด</RouterLink></footer>
      </section>
    </Teleport>
  </div>
</template>

<style scoped>
.notification-center { flex:0 0 44px; width:44px; }
.notification-button { position:relative; display:grid; width:44px; height:44px; place-items:center; padding:0; border:0; border-radius:50%; background:transparent; color:var(--jd-ink); cursor:pointer; }
.notification-button:hover,.notification-button.expanded { background:var(--jd-peach-soft); color:var(--jd-brand); }
.notification-button svg { width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.notification-badge { position:absolute; top:-2px; right:-5px; display:grid; min-width:20px; min-height:20px; place-items:center; padding:1px 5px; border:2px solid white; border-radius:12px; background:var(--jd-danger); color:white; font-size:.75rem; font-weight:700; line-height:1.4; }
.notification-panel { position:fixed; top:var(--notification-top,72px); right:var(--notification-right,16px); z-index:100; display:flex; flex-direction:column; width:min(400px,calc(100vw - 32px)); max-height:min(620px,calc(100dvh - var(--notification-top,72px) - 16px)); border:1px solid var(--jd-line); border-radius:20px; background:var(--jd-surface); color:var(--jd-ink); font-family:"Noto Sans Thai",system-ui,sans-serif; box-shadow:0 12px 48px rgb(16 14 4 / 16%); overflow:hidden; }
.notification-panel:focus { outline:none; }
.preview-header { display:flex; flex:0 0 auto; align-items:center; justify-content:space-between; gap:12px; padding:20px 20px 8px; }
.preview-header h2 { margin:0; font-size:1.125rem; line-height:1.6; }
.preview-header p { margin:2px 0 0; color:var(--jd-muted); font-size:.875rem; }
.preview-close { width:44px; height:44px; flex-shrink:0; padding:0; border:0; border-radius:12px; background:var(--jd-subtle); color:var(--jd-ink); font:inherit; font-size:1.5rem; cursor:pointer; }
.preview-toolbar { display:flex; flex:0 0 auto; align-items:center; justify-content:space-between; gap:8px; padding:0 20px 8px; font-size:.8125rem; color:var(--jd-muted); }
.preview-toolbar button { min-height:44px; padding:8px 0 8px 8px; border:0; background:transparent; color:var(--jd-brand); font:inherit; font-size:.875rem; font-weight:600; cursor:pointer; }
.preview-toolbar button:disabled { color:var(--jd-muted); cursor:default; }
.preview-scroll { flex:1 1 auto; min-height:0; overflow-y:auto; overscroll-behavior:contain; padding:4px 16px 16px; }
.action-error { padding:12px; margin:0 0 12px; border-radius:10px; background:var(--jd-danger-soft); color:var(--jd-danger); font-size:.875rem; }
.preview-footer { flex:0 0 auto; padding:12px 16px; border-top:1px solid var(--jd-line); background:var(--jd-surface); }
.preview-footer a { display:flex; align-items:center; justify-content:center; min-height:44px; padding:8px 16px; border:1px solid var(--jd-input-border); border-radius:12px; color:var(--jd-brand); font-size:.875rem; font-weight:600; text-decoration:none; }
.notification-button:focus-visible,.notification-panel :is(a,button):focus-visible { outline:3px solid var(--jd-brand); outline-offset:3px; }
.notification-backdrop { position:fixed; inset:0; z-index:99; background:rgb(16 14 4 / 38%); }
.notification-panel.mobile-sheet { top:auto; right:0; bottom:0; left:0; width:100%; max-height:80dvh; padding-bottom:env(safe-area-inset-bottom,0px); border-radius:24px 24px 0 0; }
.notification-panel.mobile-sheet { animation:notification-sheet-enter .18s ease-out; }
@keyframes notification-sheet-enter { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
@media(max-width:360px) { .preview-header { padding-inline:16px; } .preview-toolbar { padding-inline:16px; } }
</style>
