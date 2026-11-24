<script setup>
// FR-MATCH-06: แจ้ง Hirer ว่าเลือกช่างสำเร็จ และงานเข้าสถานะ In Progress
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
import AppHeader from "../../components/AppHeader.vue";
import {paymentStatus} from '../../services/finance';

const route = useRoute();
// This page is keyed by route.path; keep in-flight requests bound to its original resource.
const pageId = route.params.id;
const router = useRouter();
const job = ref(null);
const errorMsg = ref("");
const payment = ref(null);

async function loadJob() {
  try {
    const { data } = await api.get(`/jobs/${pageId}`);
    try { const { data: pay } = await api.get(`/payments/${pageId}/mock`); payment.value = pay; }
    catch { payment.value = null; }
    job.value = {
      ...data,
      selectedWorker: data.selectedWorker || data.worker || null,
      scheduledLabel: data.durationStart && data.durationEnd
        ? `${new Date(data.durationStart).toLocaleString("th-TH")} - ${new Date(data.durationEnd).toLocaleString("th-TH")}`
        : data.scheduledAt ? new Date(data.scheduledAt).toLocaleString("th-TH") : "-",
      total: Number(data.price || 0) + Number(data.deliveryFee || 0),
    };
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "Unable to load the confirmed job.";
  }
}
onMounted(loadJob);

function goToMyJobs() {
  router.push({ name: "hirer-my-jobs" });
}
</script>

<template>
  <main v-if="job" class="confirmed jd-page">
    <AppHeader title="ยืนยันงานแล้ว" />

    <section class="content">
      <div class="check">✓</div>
      <p class="label">เลือกผู้รับจ้างเรียบร้อยแล้ว</p>
      <p class="label">{{paymentStatus(payment?.status)}} · ไม่มีการโอนเงินจริง</p>
      <h2 class="worker-name">{{ job.selectedWorker?.name }}</h2>

      <div class="card">
        <div class="row"><span>รายละเอียดงาน</span></div>
        <div class="row"><strong>{{ job.title }}</strong><span class="price">{{ job.price }} บาท</span></div>
        <div class="row muted"><span>Duration: {{ job.scheduledLabel }}</span></div>
        <div class="row"><span>ยอดชำระทั้งหมด (ทดสอบ)</span><strong>{{ Number(payment?.totalDue ?? job.total).toFixed(2) }} บาท</strong></div>
      </div>

      <button class="btn primary" @click="router.push({ name: 'hirer-mock-payment', params: { id: pageId } })">ชำระเงิน / ติดตามหลักฐานจ่ายค่าจ้าง</button>
      <button class="btn primary" @click="goToMyJobs">กลับงานของฉัน</button>
    </section>
  </main>
</template>

<style scoped>
.confirmed { padding-bottom: 32px; }
.content { padding: 24px 16px; text-align: center; }
.check {
  width: 64px; height: 64px; border-radius: 50%; background: #16a34a; color: white;
  font-size: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
}
.label { color: var(--jd-muted); font-size: 0.875rem; margin: 0; }
.worker-name { font-size: 1.375rem; margin: 4px 0 24px; }
.card { text-align: left; border: 1px solid var(--jd-line); border-radius: 12px; padding: 14px; margin-bottom: 24px; }
.row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.875rem; }
.row.muted { color: var(--jd-muted); }
.price { font-weight: 700; }
.btn { width: 100%; min-height: 44px; border-radius: 10px; font-weight: 600; font-size: 0.875rem; border: none; cursor: pointer; }
.btn.primary { background: var(--jd-accent); color: #78350f; }
</style>
