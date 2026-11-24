<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  loading: Boolean,
  error: { type: String, default: '' },
  openingId: { type: String, default: null },
  unreadOnly: Boolean,
});
defineEmits(['open', 'retry']);

function dateTime(value) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}
function timeLabel(value) {
  if (!dateTime(value)) return '';
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes >= 0 && minutes < 1) return 'เมื่อสักครู่';
  if (minutes >= 1 && minutes < 60) return `${minutes} นาทีที่แล้ว`;
  if (minutes >= 60 && minutes < 1440) return `${Math.floor(minutes / 60)} ชั่วโมงที่แล้ว`;
  return new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}
</script>

<template>
  <div class="notification-items" :aria-busy="loading">
    <div v-if="loading" class="notification-state" role="status"><span class="state-symbol" aria-hidden="true">…</span><strong>กำลังโหลดการแจ้งเตือน</strong><p>รอสักครู่ เรากำลังตรวจสอบรายการให้คุณ</p></div>
    <div v-else-if="error" class="notification-state" role="alert"><strong>โหลดการแจ้งเตือนไม่สำเร็จ</strong><p>{{ error }}</p><button type="button" class="retry-button" @click="$emit('retry')">ลองอีกครั้ง</button></div>
    <div v-else-if="!items.length" class="notification-state"><span class="state-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg></span><strong>{{ unreadOnly ? 'อ่านครบแล้ว' : 'ยังไม่มีการแจ้งเตือน' }}</strong><p>{{ unreadOnly ? 'ไม่มีรายการที่ยังไม่อ่านในตอนนี้' : 'เมื่อมีความเคลื่อนไหวเกี่ยวกับงาน เราจะแสดงไว้ที่นี่' }}</p></div>
    <ul v-else class="notification-list">
      <li v-for="item in items" :key="item._id || item.id">
        <button type="button" class="notification-card" :class="{ unread: !(item.read || item.isRead) }" :disabled="openingId !== null" :aria-busy="openingId === String(item._id || item.id)" @click="$emit('open', item)">
          <span class="notification-heading"><strong>{{ item.title || 'การแจ้งเตือนใหม่' }}</strong><span v-if="!item.read && !item.isRead" class="unread-label">ยังไม่อ่าน</span></span>
          <span class="notification-message">{{ item.message || item.body || 'มีความเคลื่อนไหวเกี่ยวกับงานของคุณ' }}</span>
          <time v-if="dateTime(item.createdAt)" :datetime="dateTime(item.createdAt)" :title="new Date(item.createdAt).toLocaleString('th-TH')">{{ timeLabel(item.createdAt) }}</time>
          <span v-if="openingId === String(item._id || item.id)" class="opening-label" role="status">กำลังเปิด…</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.notification-items { min-height:0; color:var(--jd-ink); }
.notification-list { display:grid; gap:8px; margin:0; padding:0; list-style:none; }
.notification-card { display:grid; width:100%; min-height:44px; gap:8px; padding:16px; border:1px solid var(--jd-line); border-radius:14px; background:white; color:var(--jd-ink); text-align:left; font:inherit; cursor:pointer; }
.notification-card:hover { border-color:var(--jd-brand); background:var(--jd-canvas); }
.notification-card.unread { background:var(--jd-peach-soft); border-color:#dcb29f; }
.notification-card:focus-visible, .retry-button:focus-visible { outline:3px solid var(--jd-brand); outline-offset:3px; }
.notification-card:disabled { cursor:wait; }
.notification-heading { display:flex; align-items:flex-start; flex-wrap:wrap; gap:6px 10px; }
.notification-heading strong { flex:1; min-width:120px; font-size:.9375rem; line-height:1.6; overflow-wrap:anywhere; }
.unread-label { padding:2px 7px; border:1px solid var(--jd-brand); border-radius:6px; color:var(--jd-brand); font-size:.8125rem; font-weight:600; white-space:nowrap; }
.notification-message { font-size:.875rem; line-height:1.7; overflow-wrap:anywhere; }
time { color:var(--jd-muted); font-size:.8125rem; }
.opening-label { color:var(--jd-brand); font-size:.875rem; }
.notification-state { display:flex; align-items:center; flex-direction:column; gap:12px; padding:32px 16px; text-align:center; }
.notification-state strong { font-size:1rem; }
.notification-state p { margin:0; color:var(--jd-muted); font-size:.875rem; overflow-wrap:anywhere; }
.state-symbol { display:grid; width:48px; height:48px; place-items:center; border-radius:14px; background:var(--jd-accent-soft); color:var(--jd-ink); font-size:1.5rem; }
.state-symbol svg { width:24px; height:24px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
.retry-button { min-height:44px; padding:10px 20px; border:1px solid var(--jd-brand); border-radius:10px; background:var(--jd-brand); color:white; font:inherit; font-size:.875rem; cursor:pointer; }
</style>
