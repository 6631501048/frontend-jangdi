<script setup>
import { computed, onMounted, ref, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../services/api';
import AppHeader from '../../components/AppHeader.vue';
import {money,paymentStatus} from '../../services/finance';
const route=useRoute(),router=useRouter();
const job=ref(null),payment=ref(null),reason=ref(''),files=ref([]),previews=ref([]);
const loading=ref(true),submitting=ref(false),errorMsg=ref(''),successMsg=ref('');
const canSubmit=computed(()=>!submitting.value && !successMsg.value && payment.value?.status === 'held' && reason.value.trim().length>=10);
function clearPreviews(){previews.value.forEach(url=>URL.revokeObjectURL(url));previews.value=[];}
onUnmounted(clearPreviews);
function chooseFiles(event){
  clearPreviews(); files.value=[]; errorMsg.value='';
  const selected=Array.from(event.target.files || []);
  if(selected.length>3 || selected.some(file=>file.size>2*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(file.type))){errorMsg.value='แนบรูป JPEG, PNG หรือ WebP ไม่เกิน 3 ภาพ ภาพละไม่เกิน 2 MB';event.target.value='';return;}
  files.value=selected;previews.value=selected.map(file=>URL.createObjectURL(file));
}
onMounted(async()=>{
  try{const [j,p]=await Promise.all([api.get(`/jobs/${route.params.id}`),api.get(`/payments/${route.params.id}/mock`)]);job.value=j.data;payment.value=p.data;}
  catch(err){errorMsg.value=err.response?.data?.message || 'โหลดข้อมูลงานไม่สำเร็จ';}
  finally{loading.value=false;}
});
async function submit(){
  if(!canSubmit.value || !window.confirm('ยืนยันส่งคำขอคืนเงิน? งานจะพักไว้ให้ผู้ดูแลตรวจสอบ และยังไม่ถือว่าได้รับเงินคืน'))return;
  submitting.value=true;errorMsg.value='';
  try{const body=new FormData();body.append('reason',reason.value.trim());files.value.forEach(file=>body.append('evidence',file));await api.post(`/payments/${route.params.id}/refund-request`,body);payment.value.status='disputed';successMsg.value='ส่งคำขอคืนเงินแล้ว รอผู้ดูแลตรวจสอบเหตุผลและหลักฐาน งานยังไม่ถูกยืนยันเสร็จ';}
  catch(err){errorMsg.value=err.response?.data?.message || 'ส่งคำขอไม่สำเร็จ';}
  finally{submitting.value=false;}
}
</script>
<template>
  <main class="refund"><AppHeader title="ขอคืนเงินสำหรับงานนี้" /><section class="content">
    <p class="notice">หากไม่ยอมรับงาน ให้ขอคืนเงินก่อนยืนยันรับงาน ผู้ดูแลจะตรวจสอบและตัดสินใจ ส่วนการให้ดาวและรีวิวทำได้หลังยืนยันรับงานแล้ว</p>
    <p v-if="loading" role="status">กำลังโหลด…</p>
    <div v-if="job && payment" class="job-card"><h2 class="title">{{job.title}}</h2><p class="sub">{{job.description}}</p><div class="row"><span>ยอดชำระรวมค่าบริการ</span><strong>฿ {{money(payment.totalDue)}}</strong></div><div class="row"><span>สถานะ</span><strong>{{paymentStatus(payment.status)}}</strong></div></div>
    <p v-if="errorMsg" role="alert" class="notice error">{{errorMsg}}</p><p v-if="successMsg" role="status" class="notice">{{successMsg}}</p>
    <p v-if="payment?.refundNotes" class="notice">เหตุผลผู้ดูแล: {{payment.refundNotes}}</p>
    <p v-if="payment?.refundStatus === 'pending'" class="notice" role="status">ผู้ดูแลอนุมัติแล้ว กำลังรอ Stripe ยืนยันการคืนเงินทดสอบ</p>
    <form v-if="payment?.status === 'held' && !successMsg" @submit.prevent="submit">
      <label class="field-label" for="refund-reason">เหตุผลที่ขอคืนเงิน (10–1,000 ตัวอักษร)</label><textarea id="refund-reason" v-model="reason" minlength="10" maxlength="1000" required rows="5" placeholder="อธิบายปัญหาหรือส่วนที่ไม่ได้รับตามข้อตกลง" :disabled="submitting"></textarea>
      <label class="field-label" for="refund-evidence">รูปหลักฐานประกอบ (ไม่บังคับ)</label><input id="refund-evidence" type="file" accept="image/jpeg,image/png,image/webp" multiple :disabled="submitting" @change="chooseFiles" /><p class="sub">สูงสุด 3 ภาพ ภาพละไม่เกิน 2 MB</p><div class="previews"><img v-for="(url,index) in previews" :key="url" :src="url" :alt="`หลักฐานภาพที่ ${index+1}`" /></div>
      <p class="notice">หากอนุมัติ จะคืนเต็มยอดรวมค่าบริการ ฿ {{money(payment.totalDue)}} โดยไม่หักค่า gateway จากผู้ว่าจ้าง ขณะนี้เป็นโหมดทดสอบ ไม่มีการคืนเงินจริง</p>
      <div class="actions"><button type="submit" class="btn danger" :disabled="!canSubmit">{{submitting ? 'กำลังส่ง…' : 'ส่งคำขอคืนเงินให้ผู้ดูแล'}}</button></div>
    </form>
    <p v-else-if="payment && !successMsg" class="notice">{{payment.status === 'disputed' ? 'คำขอนี้อยู่ระหว่างพิจารณา ไม่สามารถส่งซ้ำได้' : 'ขอคืนเงินได้เฉพาะรายการที่ชำระแล้วและยังไม่ยืนยันรับงาน'}}</p>
    <button class="btn outline back" @click="router.push({name:'hirer-job-detail',params:{id:route.params.id}})">กลับรายละเอียดงาน</button>
  </section></main>
</template>
<style scoped>
.refund { padding-bottom: 32px; }
.content { padding: 16px; }
.job-card { border: 1px solid #eee; border-radius: 12px; padding: 14px; margin-bottom: 20px; }
.title { font-weight: 700; font-size: 14px; }
.sub { font-size: 12px; color: #888; margin: 2px 0 10px; }
.row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-top: 1px solid #f5f5f5; }
.flow { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 12px 0 24px; }
.node {
  border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 16px; text-align: center;
  min-width: 100px; font-size: 11px; color: #888;
}
.node.active { border-color: #fbbf24; background: #fffbeb; color: #92400e; }
.icon { font-size: 20px; margin-bottom: 4px; }
.node-label small { color: inherit; }
.arrow { font-size: 18px; color: #aaa; }
.field-label { display: block; font-size: 13px; color: #555; margin-bottom: 6px; }
textarea {
  width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb;
  font-family: inherit; resize: vertical; margin-bottom: 20px;
}
.actions { display: flex; flex-direction: column; gap: 10px; }
.btn { min-height: 44px; border-radius: 10px; font-weight: 600; font-size: 14px; border: none; cursor: pointer; }
.btn.danger { background: #ef4444; color: white; }
.btn.outline { background: white; color: #555; border: 1px solid #e5e7eb; }
</style>
<style scoped>
.notice { background:#fffbeb; border:1px solid #fde68a; padding:12px; border-radius:8px; font-size:13px; }
.notice.error { color:#b91c1c; background:#fef2f2; }
.btn:disabled { opacity:0.45; cursor:not-allowed; }
</style>

<style scoped>.previews{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.previews img{width:90px;height:90px;object-fit:cover;border-radius:8px}.back{width:100%;margin-top:12px}input{max-width:100%}</style>
