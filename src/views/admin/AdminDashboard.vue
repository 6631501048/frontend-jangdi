<script setup>
// FR-ADMIN-01: สรุปผู้ใช้, ประกาศทั้งหมด, ประกาศรอดำเนินการ, SOS ที่เปิดอยู่, แนวโน้ม, สรุปการเงินรายเดือน
</script>

<template>
  <main class="admin-dashboard">
    <h1>Admin Dashboard</h1>
    <p class="placeholder">TODO: ดึงข้อมูลสรุปจาก GET /api/admin/dashboard (FR-ADMIN-01)</p>
    <ul class="menu">
      <li>ประกาศงานรออนุมัติ (FR-ADMIN-02)</li>
      <li>จัดการผู้ใช้ (FR-ADMIN-03)</li>
      <li>ตรวจสอบ Escrow (FR-ADMIN-04)</li>
      <li>คำขอคืนเงิน (FR-ADMIN-05)</li>
      <li>รายงานพฤติกรรม (FR-ADMIN-06)</li>
      <li>สัญญาณ SOS (FR-ADMIN-07)</li>
    </ul>
  </main>
</template>

<style scoped>
.admin-dashboard { padding: 16px; max-width: 480px; }
.placeholder { color: #888; }
.menu { list-style: none; padding: 0; }
.menu li { padding: 14px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 8px; }
</style>
