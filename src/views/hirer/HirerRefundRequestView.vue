<script setup>
import { computed, nextTick, onMounted, ref, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../services/api';
import AppHeader from '../../components/AppHeader.vue';
import {money,paymentStatus} from '../../services/finance';
import DecisionDialog from '../../components/AdminDecisionDialog.vue';
import { useAdminDecision } from '../../composables/useAdminDecision';
const { decision, askDecision, confirmDecision, cancelDecision } = useAdminDecision();
const route=useRoute(),router=useRouter();
// This page is keyed by route.path; keep in-flight requests bound to its original resource.
const pageId = route.params.id;
const job=ref(null),payment=ref(null),reason=ref(''),files=ref([]),previews=ref([]);
const loading=ref(true),submitting=ref(false),errorMsg=ref(''),successMsg=ref('');
const confirming = ref(false), evidenceInput = ref(null), evidenceList = ref(null), chooseEvidenceButton = ref(null);
const formBusy = computed(() => submitting.value || confirming.value);
const canSubmit=computed(()=>!formBusy.value && !successMsg.value && payment.value?.status === 'held' && reason.value.trim().length>=10 && reason.value.trim().length<=1000);
function clearPreviews(){previews.value.forEach(url=>URL.revokeObjectURL(url));previews.value=[];}
onUnmounted(clearPreviews);
function chooseFiles(event){
  const selected=Array.from(event.target.files || []);
  event.target.value = '';
  if(formBusy.value || !selected.length) return;
  errorMsg.value='';
  const fileKey = file => `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
  const known = new Set(files.value.map(fileKey));
  const additions = selected.filter(file => { const key = fileKey(file); if(known.has(key)) return false; known.add(key); return true; });
  if(files.value.length+additions.length>3 || additions.some(file=>file.size>2*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(file.type))){errorMsg.value='แนบรูป JPEG, PNG หรือ WebP ไม่เกิน 3 ภาพ ภาพละไม่เกิน 2 MB';return;}
  files.value.push(...additions);previews.value.push(...additions.map(file=>URL.createObjectURL(file)));
}
async function removeEvidence(index) {
  if(formBusy.value || !files.value[index]) return;
  URL.revokeObjectURL(previews.value[index]);
  files.value.splice(index, 1); previews.value.splice(index, 1);
  errorMsg.value = '';
  await nextTick();
  const buttons = evidenceList.value?.querySelectorAll('button') || [];
  (buttons[Math.min(index, buttons.length - 1)] || chooseEvidenceButton.value)?.focus();
}
let refreshTimer;
async function loadStatus(){
  try{const [j,p]=await Promise.all([api.get(`/jobs/${pageId}`),api.get(`/payments/${pageId}/mock`)]);job.value=j.data;payment.value=p.data;if(payment.value.status!=='disputed')successMsg.value='';}
  catch(err){errorMsg.value=err.response?.data?.message || 'โหลดข้อมูลงานไม่สำเร็จ';}
  finally{loading.value=false;}
}
onMounted(()=>{loadStatus();refreshTimer=window.setInterval(()=>{if(!submitting.value)loadStatus();},5000);});
onUnmounted(()=>window.clearInterval(refreshTimer));
async function submit(){
  if(!canSubmit.value)return;
  confirming.value = true;
  let answer;
  try { answer = await askDecision({ title: 'ยืนยันส่งคำขอคืนเงิน', message: 'ส่งเหตุผลและรูปหลักฐานให้ผู้ดูแลตรวจสอบใช่หรือไม่?', notice: 'งานจะพักไว้ระหว่างพิจารณา การส่งคำขอยังไม่ถือว่าได้รับเงินคืน', confirmLabel: 'ยืนยันส่งคำขอ' }); }
  finally { confirming.value = false; }
  if(answer === null)return;
  if(!canSubmit.value) { errorMsg.value = 'สถานะรายการเปลี่ยนแปลงแล้ว กรุณาตรวจสอบก่อนส่งคำขอ'; return; }
  submitting.value=true;errorMsg.value='';
  try{const body=new FormData();body.append('reason',reason.value.trim());files.value.forEach(file=>body.append('evidence',file));await api.post(`/payments/${pageId}/refund-request`,body);payment.value.status='disputed';successMsg.value='ส่งคำขอคืนเงินแล้ว รอผู้ดูแลตรวจสอบเหตุผลและหลักฐาน งานยังไม่ถูกยืนยันเสร็จ';}
  catch(err){errorMsg.value=err.response?.data?.message || 'ส่งคำขอไม่สำเร็จ';}
  finally{submitting.value=false;}
}
</script>
<template>
  <main class="refund jd-page"><AppHeader title="ขอคืนเงินสำหรับงานนี้" /><section class="content">
    <p class="notice">หากไม่ยอมรับงาน ให้ขอคืนเงินก่อนยืนยันรับงาน ผู้ดูแลจะตรวจสอบและตัดสินใจ ส่วนการให้ดาวและรีวิวทำได้หลังยืนยันรับงานแล้ว</p>
    <p v-if="loading" role="status">กำลังโหลด…</p>
    <div v-if="job && payment" class="job-card"><h2 class="title">{{job.title}}</h2><p class="sub">{{job.description}}</p><div class="row"><span>ยอดชำระรวมค่าบริการ</span><strong>฿ {{money(payment.totalDue)}}</strong></div><div class="row"><span>สถานะ</span><strong>{{paymentStatus(payment.status)}}</strong></div></div>
    <p v-if="errorMsg" role="alert" class="notice error">{{errorMsg}}</p><p v-if="successMsg" role="status" class="notice">{{successMsg}}</p>
    <p v-if="payment?.refundNotes" class="notice">เหตุผลผู้ดูแล: {{payment.refundNotes}}</p>
    <p v-if="payment?.refundStatus === 'pending'" class="notice" role="status">{{payment.refundMethod === 'stripe' ? 'รายการเดิมกำลังรอยืนยันการคืนเงินผ่าน Stripe' : 'ผู้ดูแลอนุมัติแล้ว รอแอดมินโอนคืนและแนบหลักฐาน'}}</p>
    <form v-if="payment?.status === 'held' && !successMsg" @submit.prevent="submit">
      <label class="field-label" for="refund-reason">เหตุผลที่ขอคืนเงิน (10–1,000 ตัวอักษร)</label><textarea aria-label="เหตุผลที่ขอคืนเงิน (10–1,000 ตัวอักษร)" id="refund-reason" v-model="reason" minlength="10" maxlength="1000" required rows="5" placeholder="อธิบายปัญหาหรือส่วนที่ไม่ได้รับตามข้อตกลง" :disabled="formBusy"></textarea>
      <span class="field-label">รูปหลักฐานประกอบ (ไม่บังคับ)</span>
      <input ref="evidenceInput" aria-label="เลือกรูปหลักฐานประกอบ" id="refund-evidence" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden :disabled="formBusy" @change="chooseFiles" />
      <button ref="chooseEvidenceButton" type="button" class="btn outline choose-evidence" :disabled="formBusy || files.length >= 3" aria-describedby="evidence-help" @click="evidenceInput?.click()">{{files.length ? 'เพิ่มรูปหลักฐาน' : 'เลือกรูปหลักฐาน'}}</button>
      <p id="evidence-help" class="sub">เลือกแล้ว {{files.length}} / 3 ภาพ · JPEG, PNG หรือ WebP ภาพละไม่เกิน 2 MB</p>
      <div ref="evidenceList" class="previews"><figure v-for="(url,index) in previews" :key="url" class="evidence-preview"><img :src="url" :alt="`หลักฐานภาพที่ ${index+1}`" /><figcaption>{{files[index].name}}</figcaption><button type="button" class="remove-evidence" :disabled="formBusy" :aria-label="`เอารูป ${files[index].name} ออก`" @click="removeEvidence(index)">เอารูปออก</button></figure></div>
      <p class="notice">หากอนุมัติ จะคืนเต็มยอดรวมค่าบริการ ฿ {{money(payment.totalDue)}} โดยไม่หักค่า gateway จากผู้ว่าจ้าง ขณะนี้เป็นโหมดทดสอบ ไม่มีการคืนเงินจริง</p>
      <div class="actions"><button type="submit" class="btn danger" :disabled="!canSubmit">{{submitting ? 'กำลังส่ง…' : 'ส่งคำขอคืนเงินให้ผู้ดูแล'}}</button></div>
    </form>
    <p v-else-if="payment && !successMsg" class="notice">{{['disputed','refund_pending'].includes(payment.status) ? 'คำขอนี้อยู่ระหว่างดำเนินการ ไม่สามารถส่งซ้ำได้' : payment.status==='refunded' ? 'ดำเนินการคืนเงินจำลองเรียบร้อยแล้ว' : 'ขอคืนเงินได้เฉพาะรายการที่ชำระแล้วและยังไม่ยืนยันรับงาน'}}</p>
    <button class="btn outline back" @click="router.push({name:'hirer-job-detail',params:{id:pageId}})">กลับรายละเอียดงาน</button>
  </section><DecisionDialog v-if="decision" v-bind="decision" @confirm="confirmDecision" @cancel="cancelDecision" /></main>
</template>
<style scoped>
.refund { padding-bottom: 32px; }
.content { padding: 16px; }
.job-card { border: 1px solid var(--jd-line); border-radius: 12px; padding: 14px; margin-bottom: 20px; }
.title { font-weight: 700; font-size: 0.875rem; }
.sub { font-size: 0.875rem; color: var(--jd-muted); margin: 2px 0 10px; }
.row { display: flex; justify-content: space-between; font-size: 0.875rem; padding: 6px 0; border-top: 1px solid var(--jd-subtle); }
.flow { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 12px 0 24px; }
.node {
  border: 1px solid var(--jd-line); border-radius: 12px; padding: 12px 16px; text-align: center;
  min-width: 100px; font-size: 0.875rem; color: var(--jd-muted);
}
.node.active { border-color: var(--jd-warning); background: #fffbeb; color: #92400e; }
.icon { font-size: 1.25rem; margin-bottom: 4px; }
.node-label small { color: inherit; }
.arrow { font-size: 1.125rem; color: var(--jd-muted); }
.field-label { display: block; font-size: 0.875rem; color: var(--jd-muted); margin-bottom: 6px; }
textarea {
  width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--jd-line);
  font-family: inherit; resize: vertical; margin-bottom: 20px;
}
.actions { display: flex; flex-direction: column; gap: 10px; }
.btn { min-height: 44px; border-radius: 10px; font-weight: 600; font-size: 0.875rem; border: none; cursor: pointer; }
.btn.danger { background: #ef4444; color: white; }
.btn.outline { background: white; color: var(--jd-muted); border: 1px solid var(--jd-line); }
</style>
<style scoped>
.notice { background:#fffbeb; border:1px solid #fde68a; padding:12px; border-radius:8px; font-size: 0.875rem; }
.notice.error { color:#b91c1c; background:#fef2f2; }
.btn:disabled { opacity:0.45; cursor:not-allowed; }
</style>

<style scoped>
.previews{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin:12px 0}
.evidence-preview{display:grid;gap:8px;min-width:0;margin:0;padding:10px;border:1px solid var(--jd-line);border-radius:12px;background:var(--jd-surface)}
.evidence-preview img{width:100%;height:120px;object-fit:cover;border-radius:8px}
.evidence-preview figcaption{font-size:.875rem;overflow-wrap:anywhere;color:var(--jd-muted)}
.remove-evidence{min-height:44px;padding:8px;border:1px solid var(--jd-danger);border-radius:8px;background:var(--jd-surface);color:var(--jd-danger);font:inherit;cursor:pointer}
.choose-evidence{padding:10px 16px;margin-bottom:8px}
.back{width:100%;margin-top:12px}input{max-width:100%}
</style>
