import { io } from "socket.io-client";
import api from "./api";

// Keep this in sync with src/services/notification.service.js in the backend.
export const NOTIFICATION_SOCKET_EVENT = "notification";

export async function fetchNotifications(params = {}) {
  const { data } = await api.get("/notifications", { params });
  return Array.isArray(data) ? data : data.notifications || data.items || [];
}

// Backend has no unread-count route; its list endpoint accepts unreadOnly=true.
export async function fetchUnreadCount() {
  const unread = await fetchNotifications({ unreadOnly: true });
  return unread.length;
}

export async function markNotificationRead(id) {
  const { data } = await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.patch("/notifications/read-all");
  return data;
}

let socket;
let activeToken;
let activeUserId;
export function connectNotificationSocket(token, userId, onNotification, onReconnect) {
  if (!token || !userId) return () => {};
  if (socket && (activeToken !== token || String(activeUserId) !== String(userId))) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = undefined;
  }
  if (!socket) {
    const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/api\/?$/, "");
    socket = io(import.meta.env.VITE_SOCKET_URL || base || window.location.origin, {
      autoConnect: false,
    });
    activeToken = token;
    activeUserId = userId;
  }
  socket.off(NOTIFICATION_SOCKET_EVENT);
  socket.on(NOTIFICATION_SOCKET_EVENT, onNotification);
  socket.off("connect");
  socket.on("connect", () => {
    // server.js currently expects register with the user id after connecting.
    socket.emit("register", userId);
    onReconnect?.();
  });
  if (!socket.connected) socket.connect();
  return () => socket?.off(NOTIFICATION_SOCKET_EVENT, onNotification);
}

export function disconnectNotificationSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = undefined;
  activeToken = undefined;
  activeUserId = undefined;
}
