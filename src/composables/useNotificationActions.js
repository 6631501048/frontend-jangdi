import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import { notificationDestination, notificationEntityId, notificationRequiredRole } from '../services/notificationNavigation';
import api from '../services/api';

export function useNotificationActions({ onNavigate } = {}) {
  const router = useRouter();
  const auth = useAuthStore();
  const store = useNotificationsStore();
  const openingId = ref(null);
  const markingAll = ref(false);
  const actionError = ref('');

  async function openItem(item) {
    if (openingId.value !== null || markingAll.value) return;
    openingId.value = String(item._id || item.id || 'notification');
    actionError.value = '';
    try {
      const context = { account: auth.user };
      const entityId = notificationEntityId(item.relatedEntityId);
      if (item.relatedEntityType === 'Job' && entityId) {
        const { data } = await api.get(`/jobs/${encodeURIComponent(entityId)}`);
        context.job = data;
      }
      const destination = notificationDestination(item, auth.currentRole, context);
      const resolved = destination && router.resolve(destination);
      const requiredRole = notificationRequiredRole(item, context) || resolved?.meta?.role;
      if (requiredRole && requiredRole !== auth.currentRole) {
        actionError.value = `การแจ้งเตือนนี้เป็นของ${requiredRole === 'worker' ? 'ผู้รับจ้าง' : 'ผู้ว่าจ้าง'} กรุณาสลับบทบาทผ่านเมนูก่อนเปิดรายการ`;
        return;
      }
      if (destination && !resolved.matched.length) {
        actionError.value = 'ไม่พบหน้าปลายทางของการแจ้งเตือนนี้';
        return;
      }
      if (destination) {
        const failure = await router.push(destination);
        if (failure && failure.type !== 16) { // A duplicate navigation means this detail is already open.
          actionError.value = 'ยังเปิดการแจ้งเตือนไม่สำเร็จ กรุณาลองอีกครั้ง';
          return;
        }
        onNavigate?.();
      }
      if (!item.read && !item.isRead) {
        try { await store.markRead(item); }
        catch { actionError.value = 'ยังบันทึกว่าอ่านแล้วไม่ได้ กรุณาลองอีกครั้ง'; }
      }
    } catch (error) {
      actionError.value = error.response?.data?.message || 'ยังเปิดรายละเอียดไม่ได้ กรุณาลองอีกครั้ง';
    } finally {
      openingId.value = null;
    }
  }

  async function markAll() {
    if (markingAll.value || openingId.value !== null || !store.unreadCount) return;
    markingAll.value = true;
    actionError.value = '';
    try { await store.markAllRead(); }
    catch { actionError.value = 'ยังบันทึกว่าอ่านทั้งหมดไม่ได้ กรุณาลองอีกครั้ง'; }
    finally { markingAll.value = false; }
  }
  return { openingId, markingAll, actionError, openItem, markAll };
}
