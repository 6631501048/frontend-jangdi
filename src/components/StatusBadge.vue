<script setup>
// NFR-USE-03: badge สีต้องมาคู่กับ label ข้อความ/ไอคอนเสมอ ห้ามใช้สีอย่างเดียวสื่อความหมาย
defineProps({
  status: { type: String, required: true }, // waiting | in_progress | completed | cancelled
  label: { type: String, default: "" },
});

const styles = {
  waiting: { color: "#b45309", bg: "#fef3c7" },
  in_progress: { color: "#1d4ed8", bg: "#dbeafe" },
  completed: { color: "#15803d", bg: "#dcfce7" },
  cancelled: { color: "#b91c1c", bg: "#fee2e2" },
};
</script>

<template>
  <span
    class="badge"
    :style="{ color: styles[status]?.color || '#374151', background: styles[status]?.bg || '#f3f4f6' }"
  >
    {{ label }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
</style>