<script setup>
import { computed, onMounted, ref } from 'vue';
import api from '../services/api';
import AppHeader from './AppHeader.vue';
import FinancePeriod from './FinancePeriod.vue';
import PaymentSlipImage from './PaymentSlipImage.vue';
import { money, paymentStatus, dateTime } from '../services/finance';
const props = defineProps({ role: { type: String, required: true } });
const isHirer = computed(() => props.role === 'hirer');
const filters = ref({ period: 'month', start: '', end: '' });
const summary = ref(null), loading = ref(false), error = ref(''), showBalance = ref(true), page = ref(1);
const expandedSlip = ref(null);
let requestId = 0;
const rows = computed(() => (summary.value?.transactions || []).slice((page.value - 1) * 10, page.value * 10));
const pageCount = computed(() => Math.max(1, Math.ceil((summary.value?.transactions?.length || 0) / 10)));
async function load() {
  const id = ++requestId;
  loading.value = true; error.value = '';
  try {
    const { data } = await api.get('/payments/overview', { params: filters.value });
    if (id === requestId) { summary.value = data; page.value = 1; }
  } catch (err) { if (id === requestId) { summary.value = null; error.value = err.response?.data?.message || 'โหลดข้อมูลการเงินไม่สำเร็จ กรุณาลองใหม่'; } }
  finally { if (id === requestId) loading.value = false; }
}
onMounted(load);
</script>
<template>
  <main class="payment-page">
    <AppHeader :title="isHirer ? 'การเงินผู้ว่าจ้าง' : 'การเงินผู้รับจ้าง'" />
    <div class="content">
      <p class="notice">การชำระเงินจำลองและ Stripe โหมดทดสอบ ไม่มีการตัดเงินหรือโอนเงินจริง</p>
      <form @submit.prevent="load"><FinancePeriod v-model="filters" :disabled="loading"><button class="primary" type="submit">{{ loading ? 'กำลังโหลด…' : 'ดูรายงาน' }}</button></FinancePeriod></form>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <p v-if="loading" role="status">กำลังโหลดข้อมูลการเงิน…</p>
      <template v-else-if="summary">
        <section class="card">
          <div class="heading"><h2>{{ isHirer ? 'ยอดชำระสะสมทั้งหมด' : 'ค่าจ้างสะสมที่บันทึกจ่ายแล้ว' }}</h2><button class="text-button" :aria-pressed="!showBalance" @click="showBalance = !showBalance">{{ showBalance ? 'ซ่อนยอด' : 'แสดงยอด' }}</button></div>
          <p class="amount">{{ showBalance ? `฿ ${money(summary.lifetime.total)}` : '••••••' }}</p>
          <p class="muted">{{ isHirer ? 'รวมเงินที่ผู้ดูแลรับแล้วและพักอยู่ ไม่รวมยอดรอตรวจสลิปและยอดคืนเงิน' : 'สลิปจำลองนับหลังผู้ดูแลบันทึกจ่ายแล้ว ข้อมูลเดิมอาจไม่มีสลิปจ่าย ทั้งหมดไม่ใช่การโอนเงินจริง' }}</p>
          <dl class="details"><div><dt>รอชำระเงิน</dt><dd>฿ {{ money(summary.lifetime.pending) }}</dd></div><div><dt>พักเงินรองานเสร็จ</dt><dd>฿ {{ money(summary.lifetime.held) }}</dd></div><div><dt>รอพิจารณาคืนเงิน</dt><dd>฿ {{ money(summary.lifetime.disputed) }}</dd></div><div><dt>คืนเงินแล้ว</dt><dd>฿ {{ money(summary.lifetime.refunded) }}</dd></div><div><dt>รอตรวจสลิป</dt><dd>฿ {{money(summary.lifetime.awaiting_verification)}}</dd></div><div><dt>สลิปถูกปฏิเสธ รอส่งใหม่</dt><dd>฿ {{money(summary.lifetime.slip_rejected)}}</dd></div><div><dt>งานเสร็จ รอจ่ายค่าจ้าง</dt><dd>฿ {{money(summary.lifetime.payout_pending)}}</dd></div><div><dt>อนุมัติแล้ว รอคืนเงิน</dt><dd>฿ {{money(summary.lifetime.refund_pending)}}</dd></div></dl>
        </section>
        <section class="card">
          <h2>สรุปตามช่วงเวลาที่แสดง</h2><p class="muted">{{ summary.rangeLabel }}</p>
          <div class="metrics"><div><span>{{ isHirer ? 'ยอดชำระรวมค่าบริการ' : 'ค่าจ้างที่บันทึกจ่ายแล้ว' }}</span><strong>฿ {{ money(summary.period.total) }}</strong></div><div><span>งานที่ยืนยันเสร็จแล้ว</span><strong>{{ summary.period.completedJobs }} งาน</strong></div><div><span>{{ isHirer ? 'ค่าบริการแพลตฟอร์มที่ชำระ' : 'ค่าธรรมเนียมที่หักจากผู้รับจ้าง' }}</span><strong>฿ {{ money(summary.period.fees) }}</strong></div></div>
          <p class="muted">{{ isHirer ? 'ยอดชำระอิงวันที่รับเงิน จำนวนงานอิงวันที่ยืนยันเสร็จ' : 'ยอดรับอิงวันที่บันทึกจ่าย จำนวนงานอิงวันที่ผู้ว่าจ้างยืนยันเสร็จ' }}</p>
        </section>
        <section class="card">
          <h2>รายการชำระเงินในช่วงเวลานี้</h2><p class="muted">กรองตามวันที่สร้างรายการ เปิดรายละเอียดงานเพื่อดำเนินการ</p>
          <p v-if="!summary.transactions.length" class="empty">ยังไม่มีรายการในช่วงเวลาที่เลือก</p>
          <ul v-else class="transactions"><li v-for="tx in rows" :key="tx.id"><RouterLink :to="{ name: isHirer ? 'hirer-job-detail' : 'worker-job-tracking', params: { id: tx.jobId } }"><div class="heading"><strong>{{ tx.jobTitle }}</strong><strong>฿ {{ money(tx.amount) }}</strong></div><div class="heading muted"><span class="status" :class="tx.status">{{ paymentStatus(tx.status, tx.paymentMode) }}</span><time>{{ dateTime(tx.date) }}</time></div><small>{{ tx.paymentMode === 'stripe_test' ? 'Stripe ทดสอบ' : tx.paymentMode === 'slip_demo' ? 'สลิปจำลอง' : tx.paymentMode === 'manual' ? 'โอนเงินด้วยตนเอง' : 'รายการจำลอง' }} · ดูรายละเอียด ›</small></RouterLink><RouterLink v-if="isHirer" :to="{name:'hirer-mock-payment',params:{id:tx.jobId}}" class="text-button">เปิดหน้าชำระเงิน / ส่งสลิป</RouterLink><button v-if="tx.hasInboundSlip || tx.hasPayoutSlip || tx.hasRefundSlip" class="text-button" @click="expandedSlip=expandedSlip===tx.id?null:tx.id">{{expandedSlip===tx.id?'ซ่อนสลิป':'ดูสลิปจำลอง'}}</button><template v-if="expandedSlip===tx.id"><PaymentSlipImage v-if="tx.hasInboundSlip" :payment-id="tx.id" direction="inbound" /><PaymentSlipImage v-if="tx.hasPayoutSlip" :payment-id="tx.id" direction="payout" /><PaymentSlipImage v-if="tx.hasRefundSlip" :payment-id="tx.id" direction="refund" /></template></li></ul>
          <nav v-if="pageCount > 1" class="pagination" aria-label="หน้าประวัติการชำระเงิน"><button :disabled="page === 1" @click="page--">ก่อนหน้า</button><span>{{ page }} / {{ pageCount }}</span><button :disabled="page === pageCount" @click="page++">ถัดไป</button></nav>
        </section>
      </template>
      <RouterLink class="home" :to="isHirer ? '/hirer' : '/worker'">กลับหน้าแรก</RouterLink>
    </div>
  </main>
</template>
<style scoped>
.payment-page { min-height:100vh; background:#f6f7f9; color:#17212f; }.content { padding:16px; display:grid; gap:16px; }.notice { margin:0; padding:12px; border-radius:10px; background:#fff4cf; color:#755200; font-size:12px; line-height:1.7; }.card { padding:18px; border-radius:16px; background:#fff; border:1px solid #e8ebef; }h2 { margin:0; font-size:15px; }.heading { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }.amount { font-size:30px; font-weight:800; margin:12px 0; }.muted { font-size:12px; line-height:1.7; color:#637083; }.details { margin:16px 0 0; }.details div { display:flex; justify-content:space-between; gap:12px; padding:10px 0; border-top:1px solid #edf0f3; font-size:13px; }dd { margin:0; font-weight:700; }.metrics { display:grid; gap:14px; margin-top:16px; }.metrics div { display:flex; justify-content:space-between; gap:12px; font-size:13px; }.metrics strong { white-space:nowrap; }.transactions { list-style:none; padding:0; margin:0; }.transactions li { border-top:1px solid #edf0f3; }.transactions a { display:block; padding:14px 0; color:inherit; text-decoration:none; font-size:13px; }.transactions small { color:#637083; }.status { padding:3px 8px; border-radius:5px; background:#f1f3f6; }.status.disputed { color:#a53d00; background:#fff0da; }.status.released { color:#176840; background:#e5f6ee; }.primary,button { font:inherit; border:1px solid #d5dae1; border-radius:8px; padding:10px 14px; cursor:pointer; background:white; }.primary { background:#ffc629; border:0; align-self:end; font-weight:700; font-size:13px; }.text-button { padding:4px; border:0; font-size:12px; color:#755200; }.pagination { display:flex; justify-content:space-between; align-items:center; font-size:12px; }button:disabled { opacity:.5; cursor:default; }.error { color:#b42318; }.empty { text-align:center; color:#637083; padding:24px 0; font-size:13px; }.home { text-align:center; color:#755200; font-size:13px; }
</style>
