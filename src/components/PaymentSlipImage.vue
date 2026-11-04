<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import api from '../services/api';
import { createProofImageLoader } from '../services/proofImageLoader';
import { proofRequestError } from '../services/completionProof';
const props=defineProps({paymentId:String,direction:String,version:String});
const emit=defineEmits(['loaded']);
const state=ref({url:null,error:'',loading:false});
const loader=createProofImageLoader({fetchImage:async()=>{const {data}=await api.get(`/payments/${props.paymentId}/slips/${props.direction}`,{responseType:'blob',timeout:15000});if(!data.size || !['image/jpeg','image/png','image/webp'].includes(data.type))throw new Error('ไม่พบรูปสลิปที่ถูกต้อง');return URL.createObjectURL(data);},describeError:proofRequestError,onChange:value=>state.value=value});
const load=(force=false)=>loader.load({_id:props.paymentId,completionProofUrl:props.direction,proofSubmittedAt:props.version},force);
watch(()=>[props.paymentId,props.direction,props.version],()=>{emit('loaded',false);load();},{immediate:true});onBeforeUnmount(()=>{loader.dispose();emit('loaded',false);});
</script>
<template><div class="slip-image"><p v-if="state.loading" role="status">กำลังโหลดสลิป…</p><a v-else-if="state.url" :href="state.url" target="_blank" rel="noopener"><img :src="state.url" alt="สลิปจำลองของรายการนี้" @load="emit('loaded',true)" @error="emit('loaded',false);loader.fail('แสดงรูปสลิปไม่สำเร็จ')" /><span>ดูสลิปขนาดเต็ม</span></a><p v-else-if="state.error" role="alert">{{state.error}} <button @click="load(true)">ลองใหม่</button></p></div></template>
<style scoped>.slip-image{margin:12px 0;font-size:12px}.slip-image a{display:grid;gap:6px;color:#755200}.slip-image img{max-width:100%;max-height:260px;object-fit:contain;border-radius:8px}</style>
