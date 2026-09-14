<script setup>
import StatusBadge from "./StatusBadge.vue";

defineProps({
  job: { type: Object, required: true },
});
defineEmits(["open"]);
</script>

<template>
  <button class="job-card" @click="$emit('open', job.id)">
    <div class="avatar">👤</div>
    <div class="info">
      <div class="row-top">
        <span class="title">{{ job.title }}</span>
      </div>
      <div class="meta">
        {{ job.price }} Baht · {{ job.durationLabel }} · {{ job.to.label }}
      </div>
    </div>
    <div class="right">
      <StatusBadge :status="job.status" :label="job.statusLabel" />
      <span class="detail-link">Detail ›</span>
    </div>
  </button>
</template>

<style scoped>
.job-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid #eee;
  border-radius: 12px;
  background: white;
  text-align: left;
  cursor: pointer;
  min-height: 44px;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.info { flex: 1; min-width: 0; }
.title {
  font-weight: 600;
  font-size: 14px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta { font-size: 12px; color: #888; margin-top: 4px; }
.right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}
.detail-link { font-size: 12px; color: #2563eb; }
</style>