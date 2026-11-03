<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import api from '../services/api';
const props = defineProps({ paymentId: String, count: Number });
const images = ref([]), error = ref(''), loading = ref(false);
let generation = 0;
function clear() { images.value.forEach(url => URL.revokeObjectURL(url)); images.value = []; }
async function load() {
  const current = ++generation; clear(); error.value = ''; loading.value = true;
  const results = await Promise.allSettled(Array.from({length:props.count || 0},(_,index) => api.get(`/payments/${props.paymentId}/refund-evidence/${index}`,{responseType:'blob'})));
  if (current !== generation) return;
  for (const result of results) {
    if (result.status === 'fulfilled') images.value.push(URL.createObjectURL(result.value.data));
    else error.value = 'โหลดหลักฐานบางภาพไม่สำเร็จ';
  }
  loading.value = false;
}
watch(() => [props.paymentId,props.count],load,{immediate:true});
onBeforeUnmount(() => { generation++; clear(); });
</script>
<template><div class="evidence"><p v-if="loading" role="status">กำลังโหลดหลักฐาน…</p><a v-for="(url,index) in images" :key="url" :href="url" target="_blank" rel="noopener"><img :src="url" :alt="`หลักฐานขอคืนเงิน ภาพที่ ${index+1}`" /></a><p v-if="error" role="alert">{{error}} <button @click="load">ลองใหม่</button></p></div></template>
<style scoped>.evidence{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.evidence img{width:96px;height:96px;object-fit:cover;border-radius:8px}.evidence p{font-size:12px}</style>
