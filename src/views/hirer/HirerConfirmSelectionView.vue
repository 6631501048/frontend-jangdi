<script setup>
import UserAvatar from "../../components/UserAvatar.vue";
// FR-MATCH-04, FR-PAY-01/02: ยืนยันเลือกช่าง + วางเงินเข้า escrow (Pending -> Held)
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
import AppHeader from "../../components/AppHeader.vue";
import { calculatePaymentFees, defaultPaymentTerms } from "../../services/paymentFees";

const route = useRoute();
const router = useRouter();
const job = ref(null);
const worker = ref(null);
const submitting = ref(false);
const errorMsg = ref("");
const paymentTerms = ref({ ...defaultPaymentTerms });
const canConfirm = computed(() => job.value?.status === "waiting" && worker.value);
const feeBreakdown = computed(() => calculatePaymentFees(job.value?.total || 0, paymentTerms.value));
const transactionFee = computed(() => feeBreakdown.value.platformFeeAmount);

async function loadSelection() {
  try {
    const [{ data: jobData }, { data: applicants }] = await Promise.all([
      api.get(`/jobs/${route.params.id}`), api.get(`/jobs/${route.params.id}/applicants`),
    ]);
    try { const { data: terms } = await api.get('/payments/config'); paymentTerms.value = { ...paymentTerms.value, ...terms }; } catch { /* Use the shared defaults. */ }
    job.value = { ...jobData, id: jobData._id, serviceFee: jobData.deliveryFee || 0, total: Number(jobData.price || 0) + Number(jobData.deliveryFee || 0) };
    const match = applicants.find((item) => String(item.worker?._id || item.worker) === String(route.params.workerId));
    worker.value = match ? { id: match.worker?._id || match.worker, avatarUrl: match.worker?.avatarUrl, name: match.worker?.fullName || "Worker", rating: match.worker?.credibilityScore ?? 0 } : null;
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "Unable to load the selection.";
  }
}
onMounted(loadSelection);

function cancel() {
  router.back();
}
async function confirmAndPay() {
  if (!canConfirm.value || submitting.value) return;
  submitting.value = true;
  errorMsg.value = "";
  try {
    const { data } = await api.post(`/jobs/${route.params.id}/select-worker`, { workerId: worker.value.id });
    router.push({ name: "hirer-mock-payment", params: { id: route.params.id } });
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "Unable to select this worker.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main v-if="job && worker" class="confirm jd-page">
    <AppHeader title="ยืนยันเลือกผู้รับจ้าง" />

    <section class="card">
      <p class="label">ผู้รับจ้างที่คุณเลือก</p>
      <div class="worker">
        <span class="avatar"><UserAvatar :src="worker.avatarUrl" :name="worker.name" /></span>
        <div>
          <div class="name">{{ worker.name }}</div>
          <div class="rating">⭐ {{ worker.rating }}</div>
        </div>
      </div>

      <h2 class="section-title">สรุปค่าใช้จ่าย (ทดสอบ)</h2>
      <p class="label">เลือก Worker ก่อน จากนั้นกดชำระจำลองในหน้าถัดไป (ไม่มีการโอนเงินจริง)</p>
      <dl class="rows">
        <div class="row"><dt>ค่าจ้างผู้รับจ้าง</dt><dd>{{ Number(job.price || 0).toFixed(2) }} บาท</dd></div>
        <div v-if="job.serviceFee" class="row"><dt>ค่าบริการเพิ่มเติม</dt><dd>{{ Number(job.serviceFee).toFixed(2) }} บาท</dd></div>
        <div class="row"><dt>Platform service + transaction fees</dt><dd>{{ transactionFee.toFixed(2) }} บาท</dd></div>
        <div class="row total"><dt>ยอดชำระทั้งหมด</dt><dd>{{ feeBreakdown.totalDue.toFixed(2) }} บาท</dd></div>
      </dl>

      <div class="actions">
        <button class="btn outline" @click="cancel">ยกเลิก</button>
        <button class="btn primary" :disabled="!canConfirm || submitting" @click="confirmAndPay">
          {{ submitting ? "กำลังยืนยัน…" : "เลือกผู้รับจ้างและไปชำระเงินทดสอบ" }}
        </button>
      </div>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
    </section>
  </main>
</template>

<style scoped>
.confirm { padding-bottom: 32px; }
.card { padding: 16px; }
.label { font-size: 0.875rem; color: var(--jd-muted); margin: 0 0 8px; }
.worker { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--jd-canvas); }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--jd-subtle); display: flex; align-items: center; justify-content: center; }
.name { font-weight: 700; font-size: 0.9375rem; }
.rating { font-size: 0.875rem; color: #b45309; margin-top: 2px; }
.section-title { font-size: 0.875rem; margin: 16px 0 4px; }
.rows { margin: 4px 0; }
.row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--jd-canvas); font-size: 0.875rem; }
.row dt { color: var(--jd-muted); }
.row dd { margin: 0; font-weight: 600; }
.row.total dd { font-size: 1rem; }
.actions { display: flex; gap: 10px; margin-top: 20px; }
.btn { flex: 1; min-height: 44px; border-radius: 10px; font-weight: 600; font-size: 0.875rem; border: 1px solid var(--jd-line); cursor: pointer; }
.btn.outline { background: white; color: var(--jd-muted); }
.btn.primary { background: var(--jd-accent); color: #78350f; border: none; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.error-msg { color: #e11d48; text-align: center; font-size: 0.875rem; }
</style>
