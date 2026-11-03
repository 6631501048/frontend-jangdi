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
.period { display:flex; flex-wrap:wrap; gap:12px; border:1px solid #e5e7eb; padding:14px; border-radius:12px; margin:0; background:#fff; }
legend { font-weight:700; font-size:14px; } label { display:flex; flex:1; flex-direction:column; gap:5px; font-size:12px; min-width:125px; color:#555; }
select,input { font:inherit; color:#111; min-height:42px; border:1px solid #d1d5db; border-radius:8px; padding:8px; background:#fff; width:100%; }
</style>
