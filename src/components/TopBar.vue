<script setup>
// ใช้ตรวจสอบ session/role ปัจจุบันได้ง่ายตอน dev — โชว์ชื่อผู้ใช้ + role + สลับ role + logout
// (ฝั่ง Admin มี AdminLayout.vue เป็นของตัวเองอยู่แล้ว ไม่ใช้ component นี้)
import { useRouter } from "vue-router";
import api from "../services/api";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();

async function switchRole() {
  const nextRole = auth.currentRole === "hirer" ? "worker" : "hirer";
  const { data } = await api.patch("/auth/role", { role: nextRole }); // FR-AUTH-06
  auth.updateUser(data.user);
  router.push({ name: nextRole === "worker" ? "worker-dashboard" : "hirer-dashboard" });
}

function logout() {
  auth.logout();
  router.push({ name: "login" });
}
</script>

<template>
  <header class="topbar">
    <div class="user-info">
      <strong>{{ auth.user?.fullName || auth.user?.email }}</strong>
      <span class="role-badge">{{ auth.currentRole === "worker" ? "ผู้รับจ้าง" : "ผู้ว่าจ้าง" }}</span>
    </div>
    <div class="actions">
      <button @click="switchRole" class="switch-btn">สลับบทบาท</button>
      <button @click="logout" class="logout-btn">ออกจากระบบ</button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}
.user-info { display: flex; flex-direction: column; gap: 2px; }
.role-badge {
  font-size: 12px;
  color: #2563eb;
  background: #eff6ff;
  padding: 2px 8px;
  border-radius: 10px;
  width: fit-content;
}
.actions { display: flex; gap: 8px; }
.actions button { min-height: 36px; padding: 6px 12px; border-radius: 6px; border: 1px solid #ccc; background: white; font-size: 13px; }
.logout-btn { color: #dc2626; }
</style>