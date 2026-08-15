<script setup>
// FR-JOB-02: 3-step flow (1) หมวดหมู่ (2) รายละเอียด+ตำแหน่ง (3) ตรวจสอบก่อนส่ง
import { ref } from "vue";

const step = ref(1);
const form = ref({ category: "", title: "", description: "", price: null, scheduledAt: "" });

function next() { if (step.value < 3) step.value++; }
function back() { if (step.value > 1) step.value--; }

function submit() {
  // TODO: POST /api/jobs (FR-JOB-01, FR-JOB-03) จะถูกส่งเข้าตัวกรองเนื้อหาอัตโนมัติก่อนเข้าคิว Admin
  alert("TODO: ส่งประกาศงานไป backend");
}
</script>

<template>
  <main class="post-job">
    <h1>ประกาศงานใหม่ (ขั้นตอน {{ step }}/3)</h1>

    <section v-if="step === 1">
      <label>หมวดหมู่</label>
      <select v-model="form.category">
        <option value="">เลือกหมวดหมู่</option>
        <option>ทำความสะอาด</option>
        <option>จัดส่ง</option>
        <option>ติวและการศึกษา</option>
        <option>IT และโปรแกรมมิ่ง</option>
      </select>
    </section>

    <section v-else-if="step === 2">
      <label>ชื่องาน</label>
      <input v-model="form.title" />
      <label>รายละเอียด</label>
      <textarea v-model="form.description" rows="4"></textarea>
      <label>ราคา (บาท)</label>
      <input v-model.number="form.price" type="number" />
      <label>วันเวลานัดหมาย</label>
      <input v-model="form.scheduledAt" type="datetime-local" />
      <p class="placeholder">TODO: เพิ่ม Google Maps pin เลือกตำแหน่งที่ตั้ง</p>
    </section>

    <section v-else>
      <h2>ตรวจสอบก่อนส่ง</h2>
      <pre>{{ form }}</pre>
    </section>

    <div class="actions">
      <button v-if="step > 1" @click="back">ย้อนกลับ</button>
      <button v-if="step < 3" @click="next">ถัดไป</button>
      <button v-else @click="submit" class="primary">ส่งประกาศ</button>
    </div>
  </main>
</template>

<style scoped>
.post-job { padding: 16px; }
label { display: block; margin-top: 12px; font-size: 14px; color: #555; }
input, select, textarea { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ccc; margin-top: 4px; min-height: 44px; }
.actions { display: flex; gap: 8px; margin-top: 24px; }
.actions button { flex: 1; min-height: 44px; border-radius: 8px; border: 1px solid #ccc; background: white; }
.actions .primary { background: #2563eb; color: white; border: none; }
.placeholder { color: #888; font-size: 13px; }
</style>
