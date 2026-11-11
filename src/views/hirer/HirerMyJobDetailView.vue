<script setup>
// FR-JOB-01/08, FR-TRACK-02/03/04, FR-SOS-01, FR-JOB-07: รายละเอียดงานของ Hirer ปรับเนื้อหาตามสถานะ
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
import { fetchCompletionProof, proofRequestError } from "../../services/completionProof";
import { createProofImageLoader } from "../../services/proofImageLoader";
import AppHeader from "../../components/AppHeader.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import { paymentStatus } from '../../services/finance';
import JobPaymentStatus from '../../components/JobPaymentStatus.vue';
import JobReviewModal from '../../components/JobReviewModal.vue';
import { calculatePaymentFees, defaultPaymentTerms } from "../../services/paymentFees";


const route = useRoute();
const router = useRouter();
const job = ref(null);
const loading = ref(true);
const errorMsg = ref("");
const applicants = ref([]);
const applicantsLoaded = ref(false);
const workerProfile = ref(null);
const mockPayment = ref(null);
const paymentTerms = ref({ ...defaultPaymentTerms });
function goMockPayment() { router.push({ name: "hirer-mock-payment", params: { id: route.params.id } }); }
const cancellingJob = ref(false);
const showReviewModal = ref(false);
const reviewDone = ref(false);
const reviewStatusLoaded = ref(false);
const canCancelJob = computed(() => job.value?.status === "waiting");

// Private proof images cannot be loaded with <img src="/uploads/...">:
// that bypasses JWT authorization. Fetch authenticated image bytes once and
// show a revocable object URL; access is limited by the backend to the job parties.
const proofObjectUrl = ref(null);
const proofLoading = ref(false);
const proofError = ref("");
const timelineError = ref("");
const proofLoader = createProofImageLoader({
  fetchImage: fetchCompletionProof,
  describeError: proofRequestError,
  onChange(state) {
    proofObjectUrl.value = state.url;
    proofLoading.value = state.loading;
    proofError.value = state.error;
  },
});
const loadProofImage = (data, force = false) => proofLoader.load(data, force);
function retryProof() {
  if (job.value) loadProofImage(job.value, true);
}

function formatDuration(data) {
  if (data.durationStart && data.durationEnd) {
    const hours = (new Date(data.durationEnd) - new Date(data.durationStart)) / 3600000;
    if (Number.isFinite(hours) && hours > 0) {
      const rounded = Number.isInteger(hours) ? hours : Number(hours.toFixed(1));
      return `${rounded} ชั่วโมง`;
    }
    return `${new Date(data.durationStart).toLocaleString("th-TH")} - ${new Date(data.durationEnd).toLocaleString("th-TH")}`;
  }
  return "-";
}

async function loadJob() {
  if (!job.value) loading.value = true;
  errorMsg.value = "";
  timelineError.value = "";
  try {
    const { data } = await api.get(`/jobs/${route.params.id}`);
    if (data.status === "completed" && !reviewStatusLoaded.value) {
      try {
        const { data: review } = await api.get(`/jobs/${route.params.id}/review-status`);
        reviewDone.value = !!review.reviewed;
        reviewStatusLoaded.value = true;
      } catch { reviewDone.value = false; }
    }
    let events = [];
    if (["assigned", "in_progress", "awaiting_confirmation", "completed"].includes(data.status)) {
      try {
        const { data: timeline } = await api.get(`/jobs/${route.params.id}/timeline`);
        events = timeline;
      } catch {
        timelineError.value = "โหลดประวัติสถานะไม่สำเร็จ แต่ยังตรวจรูปหลักฐานได้";
      }
    }
    if (["assigned", "in_progress", "awaiting_confirmation", "disputed", "cancelled", "completed"].includes(data.status)) {
      try { const { data: pay } = await api.get(`/payments/${route.params.id}/mock`); mockPayment.value = pay; }
      catch { mockPayment.value = null; }
    } else mockPayment.value = null;
    // Image fetching must not block the job page or the next status poll.
    void loadProofImage(data);
    const selectedWorkerId = data.selectedWorker?._id || data.selectedWorker;
    if (selectedWorkerId && ["assigned", "in_progress", "awaiting_confirmation", "completed"].includes(data.status)) {
      try {
        const { data: profile } = await api.get(`/users/${selectedWorkerId}`);
        workerProfile.value = profile;
      } catch {
        workerProfile.value = null;
      }
    }
    applicantsLoaded.value = false;
    applicants.value = [];
    if (data.status === "waiting") {
      const { data: rows } = await api.get(`/jobs/${route.params.id}/applicants`);
      applicants.value = Array.isArray(rows) ? rows : [];
      applicantsLoaded.value = true;
    }
    job.value = {
      ...data,
      id: data._id,
      durationLabel: formatDuration(data),
      scheduledLabel: data.scheduledAt ? new Date(data.scheduledAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "-",
      serviceFee: data.deliveryFee || 0,
      transactionFee: mockPayment.value?.platformFeeAmount ?? calculatePaymentFees(Number(data.price || 0) + Number(data.deliveryFee || 0), paymentTerms.value).platformFeeAmount,
      total: mockPayment.value?.totalDue ?? calculatePaymentFees(Number(data.price || 0) + Number(data.deliveryFee || 0), paymentTerms.value).totalDue,
      from: { label: data.fromText || data.locationText || "-" },
      to: { label: data.toText || "-" },
      applicants: applicants.value,
      timelineEvents: events,
      cancellation: data.status === "cancelled" ? { cancelledBy: "ผู้ว่าจ้าง", reason: data.cancelReason || "ไม่ได้ระบุเหตุผล", at: data.cancelledAt } : null,
      statusLabel: ({ pending_review: "รอตรวจสอบ", rejected: "ถูกปฏิเสธ", waiting: "เปิดรับสมัคร", assigned: "เลือกผู้รับจ้างแล้ว", in_progress: "กำลังดำเนินงาน", awaiting_confirmation: "รอคุณยืนยันงาน", completed: "เสร็จสิ้น", cancelled: "ยกเลิก" })[data.status] || data.status,
    };
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "โหลดรายละเอียดงานไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}
let statusRefreshTimer;
onMounted(async () => {
  try { const {data} = await api.get('/payments/config'); paymentTerms.value={...paymentTerms.value,...data}; } catch { /* Stored payment amounts remain authoritative. */ }
  await loadJob();
  statusRefreshTimer = window.setInterval(() => {
    if (["assigned", "in_progress", "awaiting_confirmation", "disputed"].includes(job.value?.status) || (job.value?.status === 'completed' && (!mockPayment.value || mockPayment.value.status === 'payout_pending')) || (job.value?.status === 'cancelled' && mockPayment.value?.status === 'refunded' && !mockPayment.value.hasRefundSlip)) loadJob();
  }, 5000);
});
onUnmounted(() => {
  window.clearInterval(statusRefreshTimer);
  proofLoader.dispose();
});

async function cancelJob() {
  if (!canCancelJob.value || cancellingJob.value) return;
  const reason = window.prompt("ระบุเหตุผลที่ต้องการยกเลิกประกาศงาน (ยกเลิกได้ก่อนเลือกผู้รับจ้าง):");
  if (reason === null) return;
  if (!reason.trim()) {
    errorMsg.value = "กรุณาระบุเหตุผลในการยกเลิก";
    return;
  }
  if (!window.confirm("ยืนยันยกเลิกประกาศงานนี้หรือไม่?")) return;
  cancellingJob.value = true;
  try {
    await api.post(`/jobs/${job.value._id}/cancel`, { reason: reason.trim() });
    await loadJob();
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "ยกเลิกประกาศงานไม่สำเร็จ";
  } finally {
    cancellingJob.value = false;
  }
}
function goApplicants() {
  router.push({ name: "hirer-applicants", params: { id: job.value._id } });
}
function goReview() {
  showReviewModal.value = true;
}
function goHome() {
  router.push("/hirer");
}
const confirmingCompletion = ref(false);
const completionError = ref("");
function formatStatusTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}
const progressSteps = computed(() => {
  const currentStep = ({ assigned: 0, in_progress: 1, awaiting_confirmation: 2, completed: 3 })[job.value?.status] ?? -1;
  const statuses = ["assigned", "in_progress", "awaiting_confirmation", "completed"];
  return ["เลือกผู้รับจ้างแล้ว", "กำลังดำเนินงาน", "รอยืนยันงาน", "เสร็จสิ้น"].map((label, index) => ({
    label,
    done: currentStep > index,
    current: currentStep === index,
    timestamp: formatStatusTime(job.value?.timelineEvents?.find((event) => event.status === statuses[index])?.at ||
      (index === 2 ? job.value?.proofSubmittedAt : index === 3 ? job.value?.completionConfirmedAt : null)),
  }));
});

async function confirmCompletion() {
  if (mockPayment.value?.status !== "held" || !job.value || job.value.status !== "awaiting_confirmation" || confirmingCompletion.value || !proofObjectUrl.value) return;
  if (!window.confirm("ตรวจสอบรูปหลักฐานและได้รับงานครบแล้วใช่หรือไม่? เมื่อยืนยันแล้วจะปิดงานและส่งเข้าคิวรอ admin จ่ายค่าจ้างพร้อมสลิป ยังไม่ถือว่าผู้รับจ้างได้รับเงิน")) return;

  confirmingCompletion.value = true;
  completionError.value = "";
  try {
    const { data } = await api.post(`/jobs/${job.value._id}/confirm-completion`);
    job.value = { ...job.value, ...data.job, statusLabel: "เสร็จสิ้น" };
    await loadJob();
  } catch (err) {
    completionError.value = err.response?.data?.message || "ยืนยันปิดงานไม่สำเร็จ กรุณาลองใหม่";
  } finally {
    confirmingCompletion.value = false;
  }
}

</script>

<template>
  <main v-if="job" class="job-detail">
    <p v-if="errorMsg" class="completion-error" role="alert">{{ errorMsg }}</p>
    <AppHeader title="รายละเอียดงาน" />

    <section class="card">
      <div v-if="job.status === 'disputed'" class="mock-banner" role="status"><strong>งานพักไว้ระหว่างพิจารณาคืนเงิน</strong><p>ยังไม่ยืนยันรับงานและยังไม่ปล่อยค่าจ้าง รอผู้ดูแลตรวจสอบ</p><RouterLink :to="{name:'hirer-refund',params:{id:job._id}}">ดูสถานะคำขอคืนเงิน</RouterLink></div>
      <div v-if="mockPayment?.status === 'refunded'" class="mock-banner" role="status"><strong>คืนเงินแล้ว (โหมดทดสอบ)</strong><p>จำนวน {{Number(mockPayment.refundAmount || 0).toLocaleString('th-TH')}} บาท</p><p>เหตุผลผู้ดูแล: {{mockPayment.refundNotes || '—'}}</p></div>
      <div class="head">
        <div class="who">
          <div class="avatar">👤</div>
          <div>
            <div class="title">{{ job.title }}</div>
            <div class="sub">{{ job.description }}</div>
          </div>
        </div>
        <StatusBadge :status="job.status" :label="job.statusLabel" />
      </div>

      <dl class="rows">
        <div class="row"><dt>ประเภทงาน</dt><dd>{{ job.category }}</dd></div>
        <div class="row"><dt>รายละเอียด</dt><dd>{{ job.description || "ไม่ได้ระบุรายละเอียด" }}</dd></div>
        <div class="row"><dt>วันและเวลาเริ่มงาน</dt><dd>{{ job.scheduledLabel }}</dd></div>
        <div v-if="job.durationStart && job.durationEnd" class="row"><dt>ระยะเวลาทำงาน</dt><dd>{{ job.durationLabel }}</dd></div>
        <div class="row"><dt>ค่าจ้างผู้รับจ้าง</dt><dd>{{ Number(job.price || 0).toFixed(2) }} บาท</dd></div>
        <div v-if="job.serviceFee" class="row"><dt>ค่าบริการเพิ่มเติม</dt><dd>{{ Number(job.serviceFee).toFixed(2) }} บาท</dd></div>
        <div class="row"><dt>ค่าบริการแพลตฟอร์มรวมค่าธรรมเนียมธุรกรรม</dt><dd>{{job.transactionFee == null ? 'รอคำนวณ' : job.transactionFee.toFixed(2)+' บาท'}}</dd></div>
        <div class="row total"><dt>ยอดรวม</dt><dd>{{job.total == null ? 'รอคำนวณ' : job.total+' บาท'}}</dd></div>
      </dl>

      <div v-if="job.category === 'delivery'" class="locations">
        <div class="loc">
          <span class="pin">📍</span>
          <div><span class="loc-label">จุดรับสิ่งของ</span><br />{{ job.from.label }}</div>
        </div>
        <div class="loc">
          <span class="pin">🏁</span>
          <div><span class="loc-label">จุดส่งสิ่งของ</span><br />{{ job.to.label }}</div>
        </div>
      </div>
      <div v-else class="locations">
        <div class="loc"><span class="pin">📍</span><div><span class="loc-label">สถานที่ทำงาน</span><br />{{ job.from.label }}</div></div>
      </div>

      <div class="notes">
        <span class="loc-label">หมายเหตุเพิ่มเติม (ไม่บังคับ)</span>
        <p>{{ job.notes || "-" }}</p>
      </div>

      <button v-if="canCancelJob" class="btn danger" :disabled="cancellingJob" @click="cancelJob">
        {{ cancellingJob ? "Cancelling..." : "ยกเลิกประกาศงาน" }}
      </button>
      <!-- FR-JOB-08 / FR-MATCH-03: ยังไม่เลือกช่าง ให้ดูผู้สมัครได้ -->
      <button v-if="job.status === 'waiting'" class="btn primary" @click="goApplicants">
        ดูผู้สมัคร ({{ job.applicants.length }})
      </button>

      <!-- FR-TRACK-01/02/03, FR-SOS-01: งานกำลังดำเนินการ -->
      <!-- Worker contact and progress after selection -->
      <div v-if="mockPayment" class="mock-banner">
        <strong>{{paymentStatus(mockPayment.status, mockPayment.paymentMode)}}</strong>
        <p v-if="mockPayment.status === 'pending'">ชำระผ่าน Stripe ด้วยบัตรหรือ QR ได้โดยไม่ต้องแนบสลิป ระบบยืนยันเงินก่อนเริ่มงาน</p>
        <p v-if="mockPayment.status === 'slip_rejected'">สลิปจำลองถูกปฏิเสธ กรุณาตรวจเหตุผลและแนบใหม่</p>
        <p v-if="mockPayment.slipReviewNotes">ผลตรวจสลิป: {{mockPayment.slipReviewNotes}}</p>
        <button type="button" class="btn primary" @click="goMockPayment">ดูการชำระเงินและหลักฐานจ่ายค่าจ้าง</button>
      </div>
      <template v-if="['assigned', 'in_progress', 'awaiting_confirmation', 'completed'].includes(job.status)">
        <h2 class="section-title">ช่องทางติดต่อ</h2>
        <div class="contact-row">
          <a v-if="workerProfile?.phone" class="contact-btn phone-contact" :href="`tel:${workerProfile.phone}`">
            &#128222; <span>{{ workerProfile.phone }}<br /><small>โทรศัพท์</small></span>
          </a>
          <div v-else class="contact-btn phone-contact unavailable">&#128222; <span>ไม่มีเบอร์โทรศัพท์<br /><small>ไม่ได้ระบุในโปรไฟล์</small></span></div>
          <a v-if="workerProfile?.lineId" class="contact-btn line-contact" :href="`https://line.me/R/ti/p/~${encodeURIComponent(workerProfile.lineId)}`" target="_blank" rel="noopener noreferrer">
            &#128172; <span>@{{ workerProfile.lineId }}<br /><small>LINE ID</small></span>
          </a>
          <div v-else class="contact-btn line-contact unavailable">&#128172; <span>ไม่มี LINE ID<br /><small>ไม่ได้ระบุในโปรไฟล์</small></span></div>
        </div>

        <ol class="timeline">
          <li v-for="step in progressSteps" :key="step.label" :class="{ done: step.done, current: step.current }">
            <span class="dot" />
            <div>
              <div class="t-label">{{ step.label }}</div>
              <div v-if="step.timestamp" class="t-time">{{ step.timestamp }}</div>
              <div v-else-if="step.current && step.label === 'เสร็จสิ้น'" class="t-time">ผู้ว่าจ้างยืนยันแล้ว</div>
              <div v-else-if="step.current && step.label === 'เลือกผู้รับจ้างแล้ว'" class="t-time">เลือกผู้รับจ้างแล้ว</div>
              <div v-else-if="step.current && step.label === 'กำลังดำเนินงาน'" class="t-time">ผู้รับจ้างกำลังทำงาน</div>
              <div v-else-if="step.current && step.label === 'รอยืนยันงาน'" class="t-time">ส่งหลักฐานแล้ว รอคุณตรวจสอบ</div>
            </div>
          </li>
        </ol>

        <p v-if="['assigned', 'in_progress'].includes(job.status)" class="proof-note">หากงานมีปัญหาระหว่างดำเนินการ กรุณาติดต่อผู้ดูแลก่อนยกเลิก เพื่อไม่ให้ข้อมูลการจ่ายเงินจำลองผิดพลาด</p>
        <RouterLink v-if="mockPayment?.status === 'held' && ['assigned', 'in_progress'].includes(job.status)" class="btn danger refund-link" :to="{name:'hirer-refund',params:{id:job._id}}">ไม่ยอมรับงาน / ขอคืนเงิน</RouterLink>
      </template>

      <!-- Authorized proof preview is available while pending and after confirmation. -->
      <template v-if="['awaiting_confirmation', 'completed'].includes(job.status)">
        <h2 class="section-title">รูปหลักฐานที่ผู้รับจ้างส่งแล้ว</h2>
        <p v-if="timelineError" class="proof-note">{{ timelineError }}</p>
        <p v-if="proofLoading" class="proof-note" role="status">กำลังโหลดรูปหลักฐาน…</p>
        <a v-else-if="proofObjectUrl" class="proof-link" :href="proofObjectUrl" target="_blank" rel="noopener noreferrer">
          <img class="completion-proof" :src="proofObjectUrl" alt="รูปหลักฐานที่ผู้รับจ้างส่งสำหรับงานนี้" @error="proofLoader.fail('ไม่สามารถแสดงภาพหลักฐานได้ กรุณาลองโหลดใหม่')" />
          ดูรูปขนาดเต็ม
        </a>
        <div v-else-if="proofError" role="alert" class="proof-missing">
          {{ proofError }}
          <button type="button" class="btn outline" @click="retryProof">ลองโหลดรูปอีกครั้ง</button>
        </div>
        <p v-else class="proof-missing">ยังไม่มีรูปหลักฐานที่ส่งสำเร็จสำหรับงานนี้</p>
      </template>

      <template v-if="job.status === 'awaiting_confirmation'">
        <p class="proof-note">กรุณาตรวจรูปและยืนยันเมื่องานส่งมอบเรียบร้อยแล้ว</p>
        <p v-if="completionError" class="completion-error" role="alert">{{ completionError }}</p>
        <div class="job-action-row">
          <RouterLink v-if="mockPayment?.status === 'held'" class="btn danger refund-link" :to="{name:'hirer-refund',params:{id:job._id}}">ไม่ยอมรับงาน / ขอคืนเงิน</RouterLink>
          <button class="btn primary" :disabled="confirmingCompletion || !proofObjectUrl || mockPayment?.status !== 'held'" @click="confirmCompletion">
            {{ confirmingCompletion ? "กำลังยืนยัน…" : "ยืนยันรับงานและปิดงาน" }}
          </button>
        </div>
      </template>
      <JobPaymentStatus v-if="['completed','disputed','cancelled'].includes(job.status)" :payment="mockPayment" role="hirer" />
      <div v-if="job.status === 'completed'">
        <p class="completion-success" role="status">
          ผู้ว่าจ้างยืนยันปิดงานแล้ว<span v-if="job.completionConfirmedAt"> เมื่อ {{ new Date(job.completionConfirmedAt).toLocaleString('th-TH') }}</span>.
          การจ่ายค่าจ้างติดตามแยกจากการตรวจรับงาน ดูสถานะและหลักฐานด้านล่าง
        </p>
        <div class="actions">
          <button v-if="!reviewDone" class="btn primary" @click="goReview">ให้ดาวและรีวิว</button>
          <p v-else class="review-done" role="status">รีวิวงานนี้แล้ว</p>
          <button v-if="reviewDone" class="btn primary home-button" @click="goHome">กลับหน้าโฮม</button>

        </div>
      </div>

      <!-- FR-JOB-07: รายละเอียดการยกเลิก -->
      <template v-if="job.status === 'cancelled' && job.cancellation">
        <h2 class="section-title">รายละเอียดการยกเลิก</h2>
        <dl class="rows">
          <div class="row"><dt>ผู้ยกเลิก</dt><dd>{{ job.cancellation.cancelledBy }}</dd></div>
          <div class="row"><dt>เหตุผล</dt><dd>{{ job.cancellation.reason }}</dd></div>
        </dl>
        <button class="btn primary" @click="router.push({ name: 'hirer-my-jobs' })">กลับไปงานของฉัน</button>
      </template>
    </section>
    <JobReviewModal v-if="showReviewModal" role="hirer" :job-id="String(job._id)" @close="showReviewModal = false" @reviewed="reviewDone = true; reviewStatusLoaded = true" />
  </main>
  <main v-else class="job-detail">
    <AppHeader title="รายละเอียดงาน" />
    <p v-if="loading" class="placeholder">กำลังโหลดรายละเอียดงาน...</p>
    <p v-else class="placeholder" role="alert">{{ errorMsg || "ไม่พบงานนี้" }}</p>
  </main>
</template>

<style scoped>
.job-detail { padding-bottom: 32px; }
.card { padding: 16px; }
.head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.who { display: flex; gap: 10px; align-items: flex-start; }
.avatar { width: 36px; height: 36px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.title { font-weight: 700; font-size: 15px; }
.sub { font-size: 12px; color: #888; margin-top: 2px; }
.rows { margin: 12px 0; border-top: 1px solid #f0f0f0; }
.row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.row dt { color: #888; }
.row dd { margin: 0; font-weight: 600; }
.row.total dd { font-size: 15px; }
.locations { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.loc { display: flex; gap: 8px; }
.loc-label { font-size: 11px; color: #aaa; }
.notes { padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.notes p { margin: 4px 0 0; color: #555; }
.section-title { font-size: 14px; margin: 16px 0 8px; }
.contact-row { display: flex; gap: 10px; }
.contact-btn {
  flex: 1; display: flex; align-items: center; gap: 8px; padding: 10px;
  border: 1px solid #e5e7eb; border-radius: 10px; background: white; font-size: 12px;
  min-height: 48px; text-decoration: none; color: #111; cursor: pointer;
}
.contact-btn span { display: flex; flex-direction: column; min-width: 0; overflow-wrap: anywhere; }
.contact-btn small { color: #888; font-size: 10px; }
.contact-btn.unavailable { color: #999; cursor: default; }
.contact-btn.phone-contact { border-color: #bfdbfe; background: #eff6ff; }
.contact-btn.phone-contact.unavailable { color: #475569; }
.contact-btn.line-contact { border-color: #06c755; background: #06c755; color: #fff; }
.contact-btn.line-contact span, .contact-btn.line-contact small { color: #fff; }
.timeline { list-style: none; margin: 18px 0 8px; padding: 0; }
.timeline li { display: flex; gap: 10px; align-items: flex-start; padding: 0 0 18px 2px; position: relative; }
.timeline li:not(:last-child)::before { content: ""; position: absolute; left: 7px; top: 14px; bottom: -2px; width: 2px; background: #e5e7eb; }
.timeline .dot { width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 2px solid #d1d5db; margin-top: 1px; flex-shrink: 0; }
.timeline li.done .dot, .timeline li.current .dot { background: #fbbf24; border-color: #fbbf24; }
.timeline li.current .t-label, .timeline li.done .t-label { color: #b8860b; font-weight: 700; }
.t-label { font-size: 12px; color: #777; }
.t-time { font-size: 11px; color: #999; }
.btn { width: 100%; min-height: 44px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-top: 10px; border: 1px solid #e5e7eb; background: white; cursor: pointer; }
.btn.primary { background: #fbbf24; color: #78350f; border: none; }
.btn.danger { background: #ef4444; color: white; border: none; }
.btn.outline { background: white; color: #555; }
.job-action-row { display: flex; gap: 10px; margin-top: 10px; }
.job-action-row > .btn { flex: 1; width: 0; min-width: 0; margin-top: 0; padding: 8px 6px; font-size: 12px; }
.refund-link { display: flex; align-items: center; justify-content: center; margin-top: 12px; text-decoration: none; text-align: center; }
.actions { display: flex; gap: 10px; }
.proof-link { display: inline-flex; flex-direction: column; align-items: flex-start; gap: 6px; color: #1d4ed8; font-size: 13px; margin: 4px 0; }
.completion-proof { display: block; max-width: 100%; max-height: 320px; border-radius: 8px; object-fit: contain; }
.proof-missing, .proof-note, .completion-error, .completion-success { font-size: 12px; margin: 8px 0; }
.proof-note { color: #555; }
.proof-missing, .completion-error { color: #dc2626; }
.completion-success { color: #15803d; }
.review-done { margin: 16px 0 0; color: #555; font-size: 13px; text-align: center; }
.home-button { min-height: 44px; padding: 0 18px; border-radius: 9px; font-weight: 700; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.actions .btn { margin-top: 16px; }
.placeholder { padding: 16px; color: #888; }
.mock-banner { margin: 14px 0; padding: 14px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; }
.mock-banner p { font-size: 12px; }
</style>

