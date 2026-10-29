<script setup>
// MVP-03: no fake store refund. Submit a real dispute record, clearly labelled DEMO, never a bank refund.
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
import AppHeader from "../../components/AppHeader.vue";
const route = useRoute(); const router = useRouter();
const job = ref(null); const payment = ref(null); const reason = ref("");
const loading = ref(true); const submitting = ref(false); const errorMsg = ref(""); const successMsg = ref("");
const canSubmit = computed(() => !submitting.value && !successMsg.value && ['pending','held'].includes(payment.value?.status) && reason.value.trim().length >= 10);
async function load() {
  loading.value = true; errorMsg.value = "";
  try {
    const [j,p] = await Promise.all([api.get(`/jobs/${route.params.id}`), api.get(`/payments/${route.params.id}/mock`)]);
    job.value = j.data; payment.value = p.data;
  } catch (err) { errorMsg.value = err.response?.data?.message || 'ไม่สามารถโหลดงานหรือข้อมูล Demo Payment'; }
  finally { loading.value = false; }
}
onMounted(load);
async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true; errorMsg.value = "";
  try {
    await api.post(`/payments/${route.params.id}/dispute`, { reason: reason.value.trim() });
    successMsg.value = "ส่งข้อพิพาทเข้าสู่ระบบเพื่อให้ Admin ตรวจสอบแล้ว (Demo ไม่มีการคืนเงินจริง)";
    payment.value = { ...payment.value, status: 'disputed' };
  } catch (err) { errorMsg.value = err.response?.data?.message || 'ส่งข้อพิพาทไม่สำเร็จ'; }
  finally { submitting.value = false; }
}
</script>

<template>
  <main class="refund">
    <AppHeader title="แจ้งปัญหา / ขอให้ตรวจสอบ (Demo)" />
    <section class="content">
      <p class="notice">ระบบนี้เป็น Demo Payment: ไม่มีเงินถูกโอนจริง การส่งแบบฟอร์มนี้เป็นการสร้างข้อพิพาทให้ Admin ตรวจสอบ ไม่ใช่การคืนเงินเข้าบัญชี</p>
      <p v-if="loading">กำลังโหลด...</p>
      <div v-if="job" class="job-card"><div class="title">{{ job.title }}</div><div class="sub">{{ job.description }}</div><div class="row"><span>ค่าจ้างที่จำลอง</span><strong>{{ payment?.amount }} บาท</strong></div><div class="row"><span>สถานะ</span><b>{{ payment?.status }}</b></div></div>
      <p v-if="errorMsg" role="alert" class="notice error">{{ errorMsg }}</p>
      <p v-if="successMsg" role="status" class="notice">{{ successMsg }}</p>
      <template v-if="job && payment && ['pending','held'].includes(payment.status) && !successMsg">
        <label class="field-label" for="dispute-reason">เหตุผล / รายละเอียดปัญหา (อย่างน้อย 10 ตัวอักษร)</label>
        <textarea id="dispute-reason" v-model="reason" maxlength="1000" rows="4" placeholder="อธิบายปัญหาที่พบ"></textarea>
        <div class="actions"><button class="btn danger" :disabled="!canSubmit" @click="submit">{{ submitting ? 'กำลังส่ง...' : 'ส่งข้อพิพาทให้ Admin' }}</button><button class="btn outline" @click="router.back()">ย้อนกลับ</button></div>
      </template>
      <p v-else-if="payment && !successMsg">ไม่สามารถเปิดข้อพิพาทใหม่ในสถานะ {{ payment.status }} ได้</p>
    </section>
  </main>
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
