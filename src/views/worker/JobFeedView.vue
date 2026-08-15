<script setup>
// FR-BROWSE-01/02: ฟีดงาน + ตัวกรองตามประเภท/หมวดหมู่
import { ref } from "vue";
const filter = ref("all");
</script>

<template>
  <main class="feed">
    <h1>ฟีดงาน</h1>
    <select v-model="filter">
      <option value="all">ทั้งหมด</option>
      <option value="hirer">งานประกาศจ้าง</option>
      <option value="worker">Service Post</option>
    </select>
    <p class="placeholder">TODO: ดึงข้อมูลจาก GET /api/jobs?type={{ filter }} (FR-BROWSE-01/02)</p>
  </main>
</template>

<style scoped>
.feed { padding: 16px; }
select { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ccc; margin: 12px 0; min-height: 44px; }
.placeholder { color: #888; }
</style>
