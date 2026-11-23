<script setup>
// FR-MATCH-03: Hirer ดูผู้สมัครทั้งหมด (avatar, ชื่อ, credibility score, ระยะทาง)
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
import AppHeader from "../../components/AppHeader.vue";
import { calculatePaymentFees, defaultPaymentTerms } from "../../services/paymentFees";

const route = useRoute();
const router = useRouter();
const job = ref({ _id: route.params.id, status: "", applicants: [] });
const applicants = ref([]);
const loading = ref(true);
const errorMsg = ref("");
const cancellingExpiredJob = ref(false);
const paymentTerms = ref({ ...defaultPaymentTerms });
const canCancelExpiredJob = computed(() => job.value.status === "waiting" && applicants.value.length === 0 && new Date(job.value.scheduledAt).getTime() < Date.now());
const canSelect = computed(() => job.value.status === "waiting");
const feeBreakdown = computed(() => calculatePaymentFees(Number(job.value.price || 0) + Number(job.value.deliveryFee || 0), paymentTerms.value));
const transactionFee = computed(() => feeBreakdown.value.platformFeeAmount);
const totalPayment = computed(() => feeBreakdown.value.totalDue);

async function loadApplicants() {
  loading.value = true;
  try {
    const [{ data: jobData }, { data: applicantData }] = await Promise.all([
      api.get(`/jobs/${route.params.id}`), api.get(`/jobs/${route.params.id}/applicants`),
    ]);
    job.value = jobData;
    try { const { data: terms } = await api.get('/payments/config'); paymentTerms.value = { ...paymentTerms.value, ...terms }; } catch { /* Use the shared defaults. */ }
    applicants.value = applicantData.map((item) => ({
      id: item._id,
      workerId: item.worker?._id || item.worker,
      name: item.worker?.fullName || "Worker",
      avatarUrl: item.worker?.avatarUrl || "",
      score: item.worker?.credibilityScore ?? 0,
      reviewCount: item.worker?.reviewCount ?? 0,
      distanceMeters: item.distanceMeters,
      distanceKm: Number.isFinite(Number(item.distanceMeters)) && item.distanceMeters != null
        ? (Number(item.distanceMeters) / 1000).toFixed(1)
        : null,
    }));
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "Unable to load applicants.";
  } finally {
    loading.value = false;
  }
}
onMounted(loadApplicants);

async function cancelExpiredJob() {
  if (!canCancelExpiredJob.value || cancellingExpiredJob.value) return;
  if (!window.confirm("งานนี้เลยเวลานัดและไม่มีผู้สมัคร ต้องการลบประกาศงานหรือไม่?")) return;
  cancellingExpiredJob.value = true;
  try {
    await api.post(`/jobs/${job.value._id}/cancel`, {
      expiredNoApplicants: true,
      reason: "Expired: no applicants before the scheduled time.",
    });
    router.push({ name: "hirer-dashboard" });
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "Unable to delete this expired job.";
  } finally {
    cancellingExpiredJob.value = false;
  }
}
function goToJobDetail() {
  router.push({ name: "hirer-job-detail", params: { id: route.params.id } });
}
function select(workerId) {
  // FR-MATCH-04: เตรียมข้อมูลก่อนไปหน้ายืนยันเลือกช่าง + จ่ายเงิน
  router.push({ name: "hirer-confirm-selection", params: { id: job.value._id, workerId } });
}
</script>

<template>
  <main class="applicants jd-page">
    <AppHeader :title="`ผู้สมัครงาน (${applicants.length})`" />
    <button type="button" class="details-btn" @click="goToJobDetail">ดูรายละเอียด / ยกเลิกประกาศ</button>

    <section v-if="job.price != null" class="payment-summary" aria-label="Payment summary">
      <h2>สรุปค่าใช้จ่าย</h2>
      <div><span>ค่าจ้างผู้รับจ้าง</span><strong>{{ Number(job.price).toFixed(2) }} บาท</strong></div>
      <div v-if="job.deliveryFee"><span>ค่าบริการเพิ่มเติม</span><strong>{{ Number(job.deliveryFee).toFixed(2) }} บาท</strong></div>
      <div><span>Platform service + transaction fees</span><strong>{{ transactionFee.toFixed(2) }} บาท</strong></div>
      <div class="payment-total"><span>ยอดชำระทั้งหมด</span><strong>{{ totalPayment.toFixed(2) }} บาท</strong></div>
    </section>

    <section class="list">
      <p v-if="loading" class="empty">Loading applicants...</p>
      <p v-else-if="errorMsg" class="empty error">{{ errorMsg }}</p>
      <div v-else v-for="a in applicants" :key="a.id" class="applicant-card">
        <div class="avatar">👤</div>
        <div class="info">
          <div class="name">{{ a.name }}</div>
          <div class="meta">⭐ {{ a.score }} ({{ a.reviewCount }} reviews) · {{ a.distanceKm === null ? "Distance unavailable" : `${a.distanceKm} km` }}</div>
        </div>
        <button class="select-btn" :disabled="!canSelect" @click="select(a.workerId)">เลือกผู้รับจ้าง</button>
      </div>
      <div v-if="!loading && !errorMsg && !applicants.length" class="empty-state">
        <p class="empty">No applicants yet.</p>
        <button v-if="canCancelExpiredJob" class="delete-btn" :disabled="cancellingExpiredJob" @click="cancelExpiredJob">{{ cancellingExpiredJob ? "Cancelling..." : "ลบงาน" }}</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.applicants { padding-bottom: 32px; }
.details-btn { margin: 12px 16px 0; background: var(--jd-surface); color: var(--jd-ink); border: 1px solid var(--jd-input-border); padding: 10px 14px; border-radius: 8px; font-size: 0.875rem; cursor: pointer; }
.payment-summary { margin: 12px 16px 0; padding: 14px; border: 1px solid var(--jd-line); border-radius: 12px; background: var(--jd-surface); }
.payment-summary h2 { margin: 0 0 8px; font-size: 0.875rem; }
.payment-summary > div { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; font-size: 0.875rem; color: var(--jd-muted); }
.payment-summary strong { color: var(--jd-ink); font-weight: 600; }
.payment-summary .payment-total { margin-top: 4px; padding-top: 9px; border-top: 1px solid var(--jd-line); color: var(--jd-ink); }
.payment-summary .payment-total strong { color: var(--jd-ink); font-size: 0.875rem; }
.list { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.applicant-card {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  border: 1px solid var(--jd-line); border-radius: 12px; background: white;
}
.avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--jd-subtle); display: flex; align-items: center; justify-content: center; }
.info { flex: 1; }
.name { font-weight: 600; font-size: 0.875rem; }
.meta { font-size: 0.875rem; color: var(--jd-muted); margin-top: 2px; }
.select-btn {
  min-height: 44px; padding: 8px 18px; border-radius: 20px;
  border: 1px solid var(--jd-accent); background: white; color: #b45309; font-weight: 600; cursor: pointer;
}
.select-btn:hover { background: #fffbeb; }
.select-btn:disabled { opacity: .5; cursor: not-allowed; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.empty { color: var(--jd-muted); text-align: center; padding: 32px 0; }
.delete-btn { min-height: 44px; padding: 8px 18px; border: 1px solid #ef4444; border-radius: 20px; background: white; color: #b91c1c; font-weight: 600; cursor: pointer; }
.delete-btn:disabled { opacity: .5; cursor: wait; }
.error { color: #e11d48; }
</style>
