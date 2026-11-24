<script setup>
defineProps({ modelValue: { type: Object, required: true }, disabled: Boolean });
const emit = defineEmits(['update:modelValue']);
function update(key, value, current) { emit('update:modelValue', { ...current, [key]: value }); }
</script>
<template>
  <fieldset class="period" :disabled="disabled">
    <legend>ช่วงเวลาของรายงาน</legend>
    <label>ช่วงเวลา<select :value="modelValue.period" @change="update('period', $event.target.value, modelValue)"><option value="month">เดือนนี้</option><option value="last-month">เดือนที่แล้ว</option><option value="all">ทั้งหมด</option><option value="custom">กำหนดวันที่เอง</option></select></label>
    <template v-if="modelValue.period === 'custom'">
      <label>ตั้งแต่วันที่<input type="date" :value="modelValue.start" :max="modelValue.end || undefined" required @input="update('start', $event.target.value, modelValue)" /></label>
      <label>ถึงวันที่<input type="date" :value="modelValue.end" :min="modelValue.start || undefined" required @input="update('end', $event.target.value, modelValue)" /></label>
    </template>
    <slot />
  </fieldset>
</template>
<style scoped>
.period { display:flex; flex-wrap:wrap; gap:12px; border:1px solid var(--jd-line); padding:14px; border-radius:12px; margin:0; background:var(--jd-surface); }
legend { font-weight:700; font-size: 0.875rem; } label { display:flex; flex:1; flex-direction:column; gap:5px; font-size: 0.875rem; min-width:125px; color:var(--jd-muted); }
select,input { font:inherit; color:var(--jd-ink); min-height: 44px; border:1px solid var(--jd-input-border); border-radius:8px; padding:8px; background:var(--jd-surface); width:100%; }
</style>
