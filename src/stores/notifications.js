import { defineStore } from "pinia";
import { fetchNotifications, fetchUnreadCount, markAllNotificationsRead, markNotificationRead } from "../services/notifications";
import { latestNotifications } from '../services/notificationNavigation';

const itemId = item => String(item._id || item.id);
const isRead = item => Boolean(item?.read || item?.isRead);

export const useNotificationsStore = defineStore("notifications", {
  state: () => ({ items: [], unreadCount: 0, loading: false, error: "", loaded: false, requestId: 0, sessionVersion: 0 }),
  actions: {
    async refresh() {
      const id = ++this.requestId;
      const initial = new Map(this.items.map(item => [itemId(item), isRead(item)]));
      this.loading = true;
      this.error = "";
      try {
        const [items, count] = await Promise.all([fetchNotifications(), fetchUnreadCount()]);
        if (id !== this.requestId) return;
        const live = new Map(this.items.map(item => [itemId(item), item]));
        const serverIds = new Set(items.map(itemId));
        const receivedDuringFetch = this.items.filter(item => !initial.has(itemId(item)) && !serverIds.has(itemId(item)));
        let readCorrections = 0;
        const refreshed = items.map(item => {
          const key = itemId(item);
          if (isRead(live.get(key)) && initial.get(key) !== true) {
            if (!isRead(item)) readCorrections += 1;
            return { ...item, read: true, isRead: true };
          }
          return item;
        });
        this.items = latestNotifications([...receivedDuringFetch, ...refreshed], receivedDuringFetch.length + refreshed.length);
        this.unreadCount = Math.max(this.items.filter(item => !isRead(item)).length, count + receivedDuringFetch.filter(item => !isRead(item)).length - readCorrections, 0);
        this.loaded = true;
      } catch (error) {
        if (id === this.requestId) this.error = error.response?.data?.message || "โหลดการแจ้งเตือนไม่สำเร็จ";
      } finally {
        if (id === this.requestId) this.loading = false;
      }
    },
    receive(notification) {
      const id = notification?._id || notification?.id;
      if (!id || this.items.some((item) => String(item._id || item.id) === String(id))) return;
      this.items.unshift(notification);
      if (!notification.read && !notification.isRead) this.unreadCount += 1;
    },
    async markRead(item) {
      const session = this.sessionVersion;
      const id = item?._id || item?.id;
      if (!id) return;
      await markNotificationRead(id);
      if (session !== this.sessionVersion) return;
      const target = this.items.find((row) => String(row._id || row.id) === String(id));
      if (target && !target.read && !target.isRead) this.unreadCount = Math.max(0, this.unreadCount - 1);
      if (target) { target.read = true; target.isRead = true; }
    },
    async markAllRead() {
      const session = this.sessionVersion;
      const existingIds = new Set(this.items.map(item => String(item._id || item.id)));
      const unreadBefore = this.unreadCount;
      await markAllNotificationsRead();
      if (session !== this.sessionVersion) return;
      // Socket messages arriving while this request is pending must stay unread.
      this.items = this.items.map((item) => existingIds.has(String(item._id || item.id)) ? { ...item, read: true, isRead: true } : item);
      this.unreadCount = Math.max(0, this.unreadCount - unreadBefore);
    },
    clear() { this.items = []; this.unreadCount = 0; this.loaded = false; this.loading = false; this.error = ""; this.requestId += 1; this.sessionVersion += 1; },
  },
});
