<script setup>
// FR-JOB-08: งานที่ประกาศ จัดกลุ่มตามสถานะ
import { ref } from "vue";
import TopBar from "../../components/TopBar.vue";
const statuses = ["รอดำเนินการ", "กำลังดำเนินการ", "เสร็จสิ้น", "ยกเลิก"];
const activeTab = ref(statuses[0]);
</script>

<template>
  <TopBar />
  <main class="dashboard">
    <h1>งานของฉัน (ผู้ว่าจ้าง)</h1>
    <nav class="tabs">
      <button
        v-for="s in statuses"
        :key="s"
        :class="{ active: activeTab === s }"
        @click="activeTab = s"
      >{{ s }}</button>
    </nav>
    <p class="placeholder">TODO: ดึงรายการงานจาก GET /api/jobs?hirer=me&status=... (FR-JOB-08)</p>
    <RouterLink to="/hirer/post-job" class="fab">+ ประกาศงานใหม่</RouterLink>
  </main>
</template>

<style scoped>
.dashboard { padding: 16px; }
.tabs { display: flex; gap: 8px; overflow-x: auto; margin: 16px 0; }
.tabs button { min-height: 44px; padding: 8px 14px; border-radius: 20px; border: 1px solid #ccc; background: white; }
.tabs button.active { background: #2563eb; color: white; border-color: #2563eb; }
.placeholder { color: #888; }
.fab { display: block; text-align: center; margin-top: 24px; padding: 14px; background: #16a34a; color: white; border-radius: 8px; text-decoration: none; }
</style>