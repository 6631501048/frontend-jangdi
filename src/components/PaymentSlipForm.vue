<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import api from '../services/api';
import AdminDecisionDialog from './AdminDecisionDialog.vue';
import { useAdminDecision } from '../composables/useAdminDecision';
const {decision,askDecision,confirmDecision,cancelDecision}=useAdminDecision();
const props = defineProps({ endpoint: { type:String, required:true }, label: { type:String, default:'ส่งสลิปจำลอง' }, requireNotes:Boolean, requireAmount:Boolean, expectedAmount:{type:Number,default:null} });
const emit = defineEmits(['saved']);
const file=ref(null), preview=ref(''), notes=ref(''), amount=ref(''), reference=ref(''), busy=ref(false), error=ref('');
const payoutReady=computed(()=>!props.requireAmount || (Number(amount.value)>0 && reference.value.trim().length>=6));
const ready=computed(()=>file.value && payoutReady.value && !busy.value && (!props.requireNotes || notes.value.trim().length>=10));
function clear(){if(preview.value)URL.revokeObjectURL(preview.value);preview.value='';file.value=null;amount.value='';reference.value='';}
onBeforeUnmount(clear);
function choose(event){
  clear();error.value='';const selected=event.target.files?.[0];if(!selected)return;
  if(selected.size>2*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(selected.type)){error.value='เลือกรูป JPEG, PNG หรือ WebP ขนาดไม่เกิน 2 MB';event.target.value='';return;}
  file.value=selected;preview.value=URL.createObjectURL(selected);
}
async function submit(){
  if(!ready.value)return;
  const selectedFile=file.value,selectedNotes=notes.value.trim(),endpoint=props.endpoint;
  if(await askDecision({title:'ยืนยันบันทึกสลิปจำลอง',message:'ตรวจสอบรูปและรายละเอียดแล้ว ไม่มีการโอนเงินจริง',confirmLabel:props.label})===null)return;
  busy.value=true;error.value='';
  try{const body=new FormData();body.append('slip',selectedFile);if(props.requireNotes)body.append('notes',selectedNotes);if(props.requireAmount){body.append('amount',String(Number(amount.value)));body.append('reference',reference.value.trim());}const {data}=await api.post(endpoint,body);clear();notes.value='';emit('saved',data.message);}
  catch(err){error.value=err.response?.data?.message || 'ส่งสลิปไม่สำเร็จ กรุณาลองใหม่';}
  finally{busy.value=false;}
}
</script>
<template><AdminDecisionDialog v-if="decision" v-bind="decision" @confirm="confirmDecision" @cancel="cancelDecision" /><form class="slip-form" @submit.prevent="submit"><label class="field">รูปสลิปทดสอบ (ไม่เกิน 2 MB)<input type="file" accept="image/jpeg,image/png,image/webp" :disabled="busy" required @change="choose" /></label><img v-if="preview" :src="preview" alt="ตรวจรูปสลิปก่อนส่ง" /><template v-if="requireAmount"><label class="field">ยอดที่โอนจริง (บาท)<input type="number" min="1" step="0.01" v-model="amount" required :disabled="busy" placeholder="เช่น 1000" /></label><label class="field">เลขอ้างอิงการโอน<input type="text" v-model="reference" minlength="6" maxlength="100" required :disabled="busy" placeholder="เลขอ้างอิง/รหัสรายการจากธนาคาร (อย่างน้อย 6 ตัวอักษร)" /></label><p v-if="expectedAmount!=null" class="hint">ต้องโอนให้ตรงกับยอด ฿{{Number(expectedAmount).toLocaleString('en-US')}} ไม่งั้นระบบจะไม่รับบันทึก</p></template><label v-if="requireNotes" class="field">หมายเหตุการจ่ายหรือคืนเงิน<textarea v-model="notes" minlength="10" maxlength="1000" required :disabled="busy" placeholder="ระบุเหตุผลหรือรายละเอียด 10–1,000 ตัวอักษร"></textarea></label><p class="hint">ใช้สลิปตัวอย่างเท่านั้น รายการนี้เป็นการจำลอง ไม่มีการโอนเงินจริง</p><p v-if="error" class="error" role="alert">{{error}}</p><button type="submit" :disabled="!ready">{{busy ? 'กำลังบันทึก…' : label}}</button></form></template>
<style scoped>.slip-form{display:grid;gap:12px;padding:14px;border:1px solid #e5e7eb;border-radius:12px;margin:14px 0;background:#fafbfc}.field{display:grid;gap:8px;font-size:13px}.field input{width:100%;font:inherit}.field textarea{width:100%;font:inherit;min-height:80px;padding:10px;border:1px solid #d1d5db;border-radius:8px}.slip-form img{max-width:100%;max-height:280px;object-fit:contain;border-radius:8px}.hint{font-size:12px;color:#667085;margin:0}.error{font-size:13px;color:#b42318;margin:0}button{font:inherit;background:#ffc629;color:#342600;border:0;border-radius:8px;min-height:44px;padding:10px;font-weight:700;cursor:pointer}button:disabled{opacity:.5;cursor:default}</style>
