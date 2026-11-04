<script setup>
import { watch } from "vue";
import { RouterView } from "vue-router";
import { useAuthStore } from "./stores/auth";
import { useNotificationsStore } from "./stores/notifications";
import { connectNotificationSocket, disconnectNotificationSocket } from "./services/notifications";

const auth = useAuthStore();
const notifications = useNotificationsStore();
watch(() => auth.token, (token) => {
  if (!token) {
    disconnectNotificationSocket();
    notifications.clear();
    return;
  }
  notifications.refresh();
  connectNotificationSocket(token, auth.user?._id || auth.user?.id, (item) => notifications.receive(item), () => notifications.refresh());
}, { immediate: true });
</script>

<template>
  <div class="app-shell"><RouterView /></div>
</template>

<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, "Noto Sans Thai", sans-serif; }
.app-shell { max-width: 480px; margin: 0 auto; min-height: 100vh; }
</style>

