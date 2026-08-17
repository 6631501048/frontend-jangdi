<script setup>
// FR-TRACK-06: รองรับผู้รับจ้างถืองานได้อย่างน้อย 2 งานพร้อมกัน
import TopBar from "../../components/TopBar.vue";
</script>

<template>
  <TopBar />
  <main class="dashboard">
    <h1>งานของฉัน (ผู้รับจ้าง)</h1>
    <p class="placeholder">TODO: แสดงงานที่กำลังทำอยู่ + สถานะ (FR-TRACK-01, FR-TRACK-06)</p>
    <RouterLink to="/worker/feed" class="fab">ดูงานที่เปิดรับ</RouterLink>
  </main>
</template>

<style scoped>
.dashboard { padding: 16px; }
.placeholder { color: #888; }
.fab { display: block; text-align: center; margin-top: 24px; padding: 14px; background: #16a34a; color: white; border-radius: 8px; text-decoration: none; }
</style>