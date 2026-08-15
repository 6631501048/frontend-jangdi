<script setup>
// FR-AUTH-05: หน้ากรอกโปรไฟล์ให้ครบหลัง login ครั้งแรก (FR-PROF-01, FR-PROF-02)
import { ref } from "vue";

const fullName = ref("");
const phone = ref("");
const lineId = ref("");

function handleSubmit() {
  // TODO: PATCH /api/users/:id เพื่อบันทึกโปรไฟล์ แล้วตั้ง isProfileComplete = true
  alert("TODO: บันทึกโปรไฟล์ผู้ใช้ (FR-PROF-01/02) แล้วพาไปหน้า dashboard");
}
</script>

<template>
  <main class="register-page">
    <h1>กรอกข้อมูลโปรไฟล์</h1>
    <form @submit.prevent="handleSubmit">
      <input v-model="fullName" placeholder="ชื่อ-นามสกุล" required />
      <input v-model="phone" placeholder="เบอร์โทรศัพท์" required />
      <input v-model="lineId" placeholder="LINE ID (ไม่บังคับ)" />
      <button type="submit">บันทึกและเริ่มใช้งาน</button>
    </form>
  </main>
</template>

<style scoped>
.register-page { padding: 24px 16px; }
form { display: flex; flex-direction: column; gap: 12px; }
input, button { padding: 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 16px; min-height: 44px; }
button { background: #2563eb; color: white; border: none; cursor: pointer; }
</style>
