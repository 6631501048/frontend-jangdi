<script setup>
import { onMounted, ref } from 'vue';
import api from '../services/api';
import FinancePeriod from './FinancePeriod.vue';
import { money } from '../services/finance';
const filters = ref({period:'month',start:'',end:''});
const report = ref(null), loading = ref(false), error = ref('');
async function load() {
  loading.value = true; error.value = ''; report.value = null;
  try { const {data} = await api.get('/admin/financials',{params:filters.value}); report.value = data; }
  catch (err) { error.value = err.response?.data?.message || 'โหลดรายงานการเงินไม่สำเร็จ'; }
  finally { loading.value = false; }
}
onMounted(load);
defineExpose({load});
</script>
<template>
  <section class="finance">
    <h2>รายงานการเงิน</h2>
    <p class="notice">ข้อมูลจำลองและ Stripe โหมดทดสอบ ไม่มีการโอนเงินจริง</p>
    <form @submit.prevent="load"><FinancePeriod v-model="filters" :disabled="loading"><button type="submit" :disabled="loading">{{ loading ? 'กำลังโหลด…' : 'แสดงรายงาน' }}</button></FinancePeriod></form>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">กำลังโหลดรายงานการเงิน…</p>
    <template v-else-if="report">
      <p class="range">{{ report.rangeLabel }}</p>
      <dl>
        <div><dt>ยอดรับชำระรวมค่าบริการ</dt><dd>฿ {{ money(report.gross) }}</dd></div>
        <div><dt>ค่าธรรมเนียม payment gateway</dt><dd>{{ report.gatewayFees == null ? 'รอยืนยันค่าธรรมเนียม' : `− ฿ ${money(report.gatewayFees)}` }}</dd></div>
        <div><dt>ค่าจ้างที่บันทึกจ่ายให้ผู้รับจ้าง</dt><dd>− ฿ {{ money(report.workerPayouts) }}</dd></div>
        <div><dt>คืนเงินผู้ว่าจ้างรวมค่าบริการ</dt><dd>− ฿ {{ money(report.refunds) }}</dd></div>
        <div class="total"><dt>ยอดรับหักรายการข้างต้น</dt><dd>{{ report.netCash == null ? 'รอสรุป' : `฿ ${money(report.netCash)}` }}</dd></div>
      </dl>
      <p class="hint">ยอดคงเหลือนี้รวมเงินพักและยอดรอจ่าย จึงยังไม่ใช่กำไรสุทธิ รายการสลิปจำลองหักค่าจ้างเมื่อผู้ดูแลแนบสลิปจ่ายแล้ว</p>
      <p v-if="report.unknownFees" class="notice">มี {{ report.unknownFees }} รายการที่ยังไม่ได้ค่าธรรมเนียม gateway จึงยังสรุปยอดสุทธิไม่ได้</p>
      <div class="metrics"><div><span>ค่าบริการแพลตฟอร์มจากงานที่ปิด</span><strong>฿ {{ money(report.platformFees) }}</strong></div><div><span>เงินพักในระบบ ณ ปัจจุบัน (ทุกช่วงเวลา)</span><strong>฿ {{ money(report.held) }}</strong></div><div><span>งานเสร็จในช่วงเวลานี้</span><strong>{{ report.completedJobs }} งาน</strong></div><RouterLink :to="{name:'admin-payments',query:{status:'disputed'}}"><span>คำขอคืนเงินที่ยื่นในช่วงเวลานี้และรอพิจารณา</span><strong>{{ report.pendingRefunds }} รายการ ›</strong></RouterLink></div>
      <div class="metrics"><RouterLink :to="{name:'admin-payments',query:{status:'awaiting_verification'}}"><span>สลิปที่รอตรวจปัจจุบัน</span><strong>{{report.pendingSlips}} รายการ ›</strong></RouterLink><RouterLink :to="{name:'admin-payments',query:{status:'payout_pending'}}"><span>ค่าจ้างที่รอจ่ายปัจจุบัน</span><strong>฿ {{money(report.pendingPayouts)}} ›</strong></RouterLink></div>
      <p class="hint">สลิปจำลองไม่มีการเรียกเก็บค่า gateway · สลิปจำลอง {{report.modes.slip_demo}} รายการ</p>
      <p class="hint">รายการรับชำระ: จำลอง {{ report.modes.demo }} รายการ · Stripe ทดสอบ {{ report.modes.stripe_test }} รายการ</p>
      <p class="hint">ยอดรับอิงวันที่ชำระ ค่าจ้างอิงวันที่บันทึกจ่าย และคืนเงินอิงวันที่คืนสำเร็จ การคืนเต็มจำนวนรวมค่าบริการไม่ผลักค่าธรรมเนียม gateway ให้ผู้ว่าจ้าง</p>
    </template>
  </section>
</template>
<style scoped>
.finance { background:white; border:1px solid #e5e7eb; border-radius:14px; padding:16px; }h2 { font-size:17px; margin:0 0 8px; }.notice { font-size:12px; background:#fff4cf; color:#755200; padding:10px; border-radius:8px; line-height:1.7; }button { align-self:end; min-height:42px; padding:10px 14px; background:#ffc629; border:0; border-radius:8px; font-weight:700; cursor:pointer; }button:disabled { opacity:.5; }.range { color:#64748b; font-size:13px; }dl { margin:0; }dl div { display:flex; justify-content:space-between; gap:12px; padding:13px 0; border-bottom:1px solid #eef0f3; font-size:13px; }dd { margin:0; font-weight:700; text-align:right; white-space:nowrap; }dt { color:#536174; }.total { background:#f4faf6; }.total dt,.total dd { color:#176840; font-weight:800; }.hint { font-size:12px; line-height:1.7; color:#64748b; }.metrics { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:16px 0; }.metrics div,.metrics a { background:#f6f7f9; padding:12px; border-radius:10px; display:flex; flex-direction:column; gap:8px; text-decoration:none; color:inherit; font-size:12px; }.metrics strong { font-size:16px; }.error { color:#b42318; }
@media(max-width:360px) { .metrics { grid-template-columns:1fr; }dl div { flex-wrap:wrap; } }
</style>
