<script setup>
// NFR-USE-03: badge สีต้องมาคู่กับ label ข้อความ/ไอคอนเสมอ ห้ามใช้สีอย่างเดียวสื่อความหมาย
defineProps({
  status: { type: String, required: true }, // waiting | in_progress | completed | cancelled
  label: { type: String, default: "" },
});

const styles = {
  pending_review: { color: "var(--jd-warning)", bg: "var(--jd-warning-soft)" },
  waiting: { color: "var(--jd-warning)", bg: "var(--jd-warning-soft)" },
  assigned: { color: "#1d4ed8", bg: "#dbeafe" },
  in_progress: { color: "#1d4ed8", bg: "#dbeafe" },
  awaiting_confirmation: { color: "var(--jd-warning)", bg: "var(--jd-warning-soft)" },
  completed: { color: "#15803d", bg: "#dcfce7" },
  cancelled: { color: "#b91c1c", bg: "#fee2e2" },
  disputed: { color: "var(--jd-warning)", bg: "var(--jd-warning-soft)" },
  rejected: { color: "#b91c1c", bg: "#fee2e2" },
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
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
}
</style>
