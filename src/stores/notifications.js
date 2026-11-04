import { defineStore } from "pinia";
import { fetchNotifications, fetchUnreadCount, markAllNotificationsRead, markNotificationRead } from "../services/notifications";

export const useNotificationsStore = defineStore("notifications", {
  state: () => ({ items: [], unreadCount: 0, loading: false, error: "", loaded: false, requestId: 0 }),
  actions: {
    async refresh() {
      const id = ++this.requestId;
      this.loading = true;
      this.error = "";
      try {
        const [items, count] = await Promise.all([fetchNotifications(), fetchUnreadCount()]);
        if (id !== this.requestId) return;
        this.items = items;
        this.unreadCount = count;
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
      const id = item?._id || item?.id;
      if (!id) return;
      await markNotificationRead(id);
      const target = this.items.find((row) => String(row._id || row.id) === String(id));
      if (target && !target.read && !target.isRead) this.unreadCount = Math.max(0, this.unreadCount - 1);
      if (target) { target.read = true; target.isRead = true; }
    },
    async markAllRead() {
      await markAllNotificationsRead();
      this.items = this.items.map((item) => ({ ...item, read: true, isRead: true }));
      this.unreadCount = 0;
    },
    clear() { this.items = []; this.unreadCount = 0; this.loaded = false; this.error = ""; this.requestId += 1; },
  },
});
