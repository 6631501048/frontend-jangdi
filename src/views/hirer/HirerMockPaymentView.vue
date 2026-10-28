<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
import AppHeader from "../../components/AppHeader.vue";

const route = useRoute();
const router = useRouter();
const job = ref(null);
const payment = ref(null);
const loading = ref(true);
const submitting = ref(false);
const errorMsg = ref("");
const successMsg = ref("");
const isPending = computed(() => payment.value?.status === "pending" && payment.value?.paymentMode === "demo");
const isPaid = computed(() => ["held", "released"].includes(payment.value?.status));
const cash = (amount) => `${Number(amount || 0).toFixed(2)} Baht`;
async function load() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const [{ data: jobData }, { data: payData }] = await Promise.all([
      api.get(`/jobs/${route.params.id}`), api.get(`/payments/${route.params.id}/mock`),
    ]);
    job.value = jobData;
    payment.value = payData;
  } catch (err) { errorMsg.value = err.response?.data?.message || "ไม่สามารถโหลดข้อมูล Payment Demo ได้"; }
  finally { loading.value = false; }
}
onMounted(load);
async function pay() {
  if (!isPending.value || submitting.value) return;
  if (!window.confirm("ยืนยันการชำระเงินจำลอง? ไม่มีการหักเงินหรือโอนเงินจริง")) return;
  submitting.value = true;
  errorMsg.value = "";
  try {
    const { data } = await api.post(`/payments/${route.params.id}/mock-confirm`);
    successMsg.value = data.message;
    await load();
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "บันทึกการชำระเงินจำลองไม่สำเร็จ";
    await load();
  } finally { submitting.value = false; }
}
function next() { router.push({ name: "hirer-job-confirmed", params: { id: route.params.id } }); }
</script>

<template>
  <main class="mock-payment">
    <AppHeader title="Demo Payment" />
    <section class="payment-card">
      <div class="demo-tag">SIMULATION · NO REAL MONEY</div>
      <h2>ชำระเงินจำลอง</h2>
      <p class="hint">สำหรับทดสอบกระบวนการจ้างงานเท่านั้น ไม่มีการตัดเงินหรือโอนเงินจริง</p>
      <p v-if="loading">กำลังโหลด...</p>
      <p v-if="errorMsg" role="alert" class="error">{{ errorMsg }}</p>
      <template v-if="job && payment">
        <div class="row"><span>งาน</span><strong>{{ job.title }}</strong></div>
        <div class="row"><span>ค่าจ้างรวม</span><strong>{{ cash(payment.amount) }}</strong></div>
        <div class="row"><span>Transaction Fee (Demo)</span><strong>{{ cash(payment.platformFeeAmount) }}</strong></div>
        <div class="row total"><span>ยอดชำระจำลอง</span><strong>{{ cash(payment.totalDue) }}</strong></div>
        <p class="state">สถานะ: <strong>{{ payment.status.toUpperCase() }}</strong></p>
        <p v-if="successMsg" class="success" role="status">{{ successMsg }}</p>
        <button v-if="isPending" class="primary" :disabled="submitting" @click="pay">
          {{ submitting ? "Processing..." : "Confirm Mock Payment" }}
        </button>
        <button v-else-if="isPaid" class="primary" @click="next">ชำระจำลองแล้ว — ดูงานของฉัน</button>
        <p v-else class="hint">สถานะนี้ไม่สามารถชำระเงินซ้ำได้</p>
        <button class="secondary" @click="router.push({ name: 'hirer-my-jobs' })">กลับ My Jobs</button>
      </template>
    </section>
  </main>
</template>

<style scoped>
.mock-payment { min-height: 100vh; background: #f3f4f6; }
.payment-card { margin: 16px auto; max-width: 540px; padding: 22px; border-radius: 14px; background: white; }
.demo-tag { display: inline-block; border-radius: 6px; background: #fef3c7; color: #92400e; padding: 7px 10px; font-size: 12px; font-weight: 700; }
h2 { margin: 16px 0 5px; font-size: 20px; }
.hint { color: #6b7280; font-size: 13px; }
.row { display: flex; justify-content: space-between; gap: 12px; padding: 13px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
.row strong { text-align: right; }
.row.total { font-size: 16px; }
.state { font-size: 14px; margin: 24px 0; }
.primary, .secondary { display: block; width: 100%; min-height: 46px; border-radius: 9px; cursor: pointer; font-size: 14px; font-weight: 700; margin-top: 10px; border: 0; }
.primary { background: #fbbf24; color: #27272a; }
.secondary { background: white; border: 1px solid #d1d5db; }
.primary:disabled { opacity: .55; }
.error { color: #b91c1c; font-size: 13px; }
.success { color: #047857; font-size: 13px; }
</style>
