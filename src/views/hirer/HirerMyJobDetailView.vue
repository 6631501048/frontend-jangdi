<script setup>
// FR-JOB-01/08, FR-TRACK-02/03/04, FR-SOS-01, FR-JOB-07: รายละเอียดงานของ Hirer ปรับเนื้อหาตามสถานะ
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
import AppHeader from "../../components/AppHeader.vue";
import StatusBadge from "../../components/StatusBadge.vue";

const route = useRoute();
const router = useRouter();
const job = ref(null);
const loading = ref(true);
const errorMsg = ref("");
const applicants = ref([]);
const applicantsLoaded = ref(false);
const workerProfile = ref(null);
const cancellingJob = ref(false);
const canCancelJob = computed(() => job.value?.status === "waiting");

// Private proof images cannot be loaded with <img src="/uploads/...">:
// that bypasses JWT authorization. Fetch authenticated image bytes once and
// show a revocable object URL; access is limited by the backend to the job parties.
const proofObjectUrl = ref(null);
const proofLoading = ref(false);
const proofError = ref("");
let loadedProofKey = null;
function clearProofImage() {
  if (proofObjectUrl.value) URL.revokeObjectURL(proofObjectUrl.value);
  proofObjectUrl.value = null;
}
async function loadProofImage(jobData, force = false) {
  const key = jobData?.completionProofUrl ? `${jobData._id}:${jobData.completionProofUrl}` : null;
  if (!force && loadedProofKey === key) return;
  loadedProofKey = key;
  clearProofImage();
  proofError.value = "";
  if (!key) return;
  proofLoading.value = true;
  try {
    const { data } = await api.get(`/jobs/${jobData._id}/completion-proof`, { responseType: "blob" });
    // Avoid reusing the image from a job that has changed while a request was pending.
    if (loadedProofKey === key) proofObjectUrl.value = URL.createObjectURL(data);
  } catch (err) {
    if (loadedProofKey === key) {
      let message = err.response?.data?.message;
      // Axios keeps error bodies as Blob when responseType is "blob".
      if (!message && err.response?.data instanceof Blob) {
        try {
          const body = await err.response.data.text();
          message = JSON.parse(body).message;
        } catch {
          // Keep the HTTP status as a useful fallback for non-JSON responses.
        }
      }
      const status = err.response?.status;
      proofError.value = message || `Unable to load the completion photo${status ? ` (HTTP ${status})` : ". Check your connection and try again."}`;
    }
  } finally {
    proofLoading.value = false;
  }
}
function retryProof() {
  if (job.value) loadProofImage(job.value, true);
}

function formatDuration(data) {
  if (data.durationStart && data.durationEnd) {
    return `${new Date(data.durationStart).toLocaleString("th-TH")} - ${new Date(data.durationEnd).toLocaleString("th-TH")}`;
  }
  return data.scheduledAt ? new Date(data.scheduledAt).toLocaleString("th-TH") : "-";
}

async function loadJob() {
  if (!job.value) loading.value = true;
  errorMsg.value = "";
  try {
    const { data } = await api.get(`/jobs/${route.params.id}`);
    let events = [];
    if (["assigned", "in_progress", "awaiting_confirmation", "completed"].includes(data.status)) {
      const { data: timeline } = await api.get(`/jobs/${route.params.id}/timeline`);
      events = timeline;
    }
    await loadProofImage(data);
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
      serviceFee: data.deliveryFee || 0,
      transactionFee: Math.round(Number(data.price || 0) * 0.05 * 100) / 100,
      total: Number(data.price || 0) + Number(data.deliveryFee || 0) + Math.round(Number(data.price || 0) * 0.05 * 100) / 100,
      from: { label: data.fromText || data.locationText || "-" },
      to: { label: data.toText || "-" },
      applicants: applicants.value,
      timelineEvents: events,
      cancellation: data.status === "cancelled" ? { cancelledBy: "Hirer", reason: data.cancelReason || "Not specified", at: data.cancelledAt } : null,
      statusLabel: ({ assigned: "Worker selected", in_progress: "In Progress", awaiting_confirmation: "Waiting for your confirmation", completed: "Completed", cancelled: "Cancelled" })[data.status] || data.status,
    };
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "Unable to load job details.";
  } finally {
    loading.value = false;
  }
}
let statusRefreshTimer;
onMounted(async () => {
  await loadJob();
  statusRefreshTimer = window.setInterval(() => {
    if (["assigned", "in_progress", "awaiting_confirmation"].includes(job.value?.status)) loadJob();
  }, 5000);
});
onUnmounted(() => {
  window.clearInterval(statusRefreshTimer);
  clearProofImage();
});

async function cancelJob() {
  if (!canCancelJob.value || cancellingJob.value) return;
  const reason = window.prompt("เหตุผลที่ต้องการยกเลิกประกาศงาน (งานที่ยังไม่เลือก Worker เท่านั้น):");
  if (reason === null) return;
  if (!reason.trim()) {
    errorMsg.value = "กรุณาระบุเหตุผลในการยกเลิก";
    return;
  }
  if (!window.confirm("ต้องการยกเลิกประกาศงานนี้ใช่หรือไม่?")) return;
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
  router.push({ name: "hirer-review", params: { id: job.value.id } });
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
  return ["Assigned", "In Progress", "Awaiting Confirmation", "Completed"].map((label, index) => ({
    label,
    done: currentStep > index,
    current: currentStep === index,
    timestamp: formatStatusTime(job.value?.timelineEvents?.find((event) => event.status === statuses[index])?.at ||
      (index === 2 ? job.value?.proofSubmittedAt : index === 3 ? job.value?.completionConfirmedAt : null)),
  }));
});

async function confirmCompletion() {
  if (!job.value || job.value.status !== "awaiting_confirmation" || confirmingCompletion.value || !proofObjectUrl.value) return;
  if (!window.confirm("Have you reviewed the completion photo and received the work? Confirm completion? (Demo payment only.)")) return;

  confirmingCompletion.value = true;
  completionError.value = "";
  try {
    const { data } = await api.post(`/jobs/${job.value._id}/confirm-completion`);
    job.value = { ...job.value, ...data.job, statusLabel: "Completed" };
    await loadJob();
  } catch (err) {
    completionError.value = err.response?.data?.message || "Unable to confirm job completion.";
  } finally {
    confirmingCompletion.value = false;
  }
}

</script>

<template>
  <main v-if="job" class="job-detail">
    <p v-if="errorMsg" class="completion-error" role="alert">{{ errorMsg }}</p>
    <AppHeader title="Job Details" />

    <section class="card">
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
        <div class="row"><dt>Details</dt><dd>{{ job.description }}</dd></div>
        <div class="row"><dt>Time</dt><dd>{{ job.durationLabel }}</dd></div>
        <div class="row"><dt>Worker Fee</dt><dd>{{ Number(job.price || 0).toFixed(2) }} Baht</dd></div>
        <div v-if="job.serviceFee" class="row"><dt>Additional Service Fee</dt><dd>{{ Number(job.serviceFee).toFixed(2) }} Baht</dd></div>
        <div class="row"><dt>Transaction Fee (5%)</dt><dd>{{ job.transactionFee.toFixed(2) }} Baht</dd></div>
        <div class="row total"><dt>Total</dt><dd>{{ job.total }} Baht</dd></div>
      </dl>

      <div class="locations">
        <div class="loc">
          <span class="pin">📍</span>
          <div><span class="loc-label">From</span><br />{{ job.from.label }}</div>
        </div>
        <div class="loc">
          <span class="pin">🏁</span>
          <div><span class="loc-label">To</span><br />{{ job.to.label }}</div>
        </div>
      </div>

      <div class="notes">
        <span class="loc-label">Additional Notes (Optional)</span>
        <p>{{ job.notes || "-" }}</p>
      </div>

      <button v-if="canCancelJob" class="btn danger" :disabled="cancellingJob" @click="cancelJob">
        {{ cancellingJob ? "Cancelling..." : "Cancel Job" }}
      </button>
      <!-- FR-JOB-08 / FR-MATCH-03: ยังไม่เลือกช่าง ให้ดูผู้สมัครได้ -->
      <button v-if="job.status === 'waiting'" class="btn primary" @click="goApplicants">
        View Applicants ({{ job.applicants.length }})
      </button>

      <!-- FR-TRACK-01/02/03, FR-SOS-01: งานกำลังดำเนินการ -->
      <!-- Worker contact and progress after selection -->
      <template v-if="['assigned', 'in_progress', 'awaiting_confirmation', 'completed'].includes(job.status)">
        <h2 class="section-title">Contact</h2>
        <div class="contact-row">
          <a v-if="workerProfile?.phone" class="contact-btn" :href="`tel:${workerProfile.phone}`">
            &#128222; <span>{{ workerProfile.phone }}<br /><small>Phone call</small></span>
          </a>
          <div v-else class="contact-btn unavailable">&#128222; <span>Phone unavailable<br /><small>Not provided in profile</small></span></div>
          <a v-if="workerProfile?.lineId" class="contact-btn" :href="`https://line.me/R/ti/p/~${encodeURIComponent(workerProfile.lineId)}`" target="_blank" rel="noopener noreferrer">
            &#128172; <span>@{{ workerProfile.lineId }}<br /><small>LINE ID</small></span>
          </a>
          <div v-else class="contact-btn unavailable">&#128172; <span>LINE ID unavailable<br /><small>Not provided in profile</small></span></div>
        </div>

        <ol class="timeline">
          <li v-for="step in progressSteps" :key="step.label" :class="{ done: step.done, current: step.current }">
            <span class="dot" />
            <div>
              <div class="t-label">{{ step.label }}</div>
              <div v-if="step.timestamp" class="t-time">{{ step.timestamp }}</div>
              <div v-else-if="step.current && step.label === 'Completed'" class="t-time">Confirmed by Hirer</div>
              <div v-else-if="step.current && step.label === 'Assigned'" class="t-time">Worker has been selected</div>
              <div v-else-if="step.current && step.label === 'In Progress'" class="t-time">Worker is doing the job</div>
              <div v-else-if="step.current && step.label === 'Awaiting Confirmation'" class="t-time">Completion proof submitted, waiting for your approval</div>
            </div>
          </li>
        </ol>

        <p v-if="['assigned', 'in_progress'].includes(job.status)" class="proof-note">หากงานมีปัญหาระหว่างดำเนินการ กรุณาติดต่อผู้ดูแลก่อนยกเลิก เพื่อไม่ให้ข้อมูลการจ่ายเงินจำลองผิดพลาด</p>
      </template>

      <!-- Authorized proof preview is available while pending and after confirmation. -->
      <template v-if="['awaiting_confirmation', 'completed'].includes(job.status)">
        <h2 class="section-title">Completion proof</h2>
        <p v-if="proofLoading" class="proof-note">Loading photo...</p>
        <a v-else-if="proofObjectUrl" class="proof-link" :href="proofObjectUrl" target="_blank" rel="noopener noreferrer">
          <img class="completion-proof" :src="proofObjectUrl" alt="Worker completion proof" />
          Open full-size photo
        </a>
        <div v-else-if="proofError" role="alert" class="proof-missing">
          {{ proofError }}
          <button type="button" class="btn outline" @click="retryProof">Retry photo</button>
        </div>
        <p v-else class="proof-missing">The worker has not provided a completion photo.</p>
      </template>

      <template v-if="job.status === 'awaiting_confirmation'">
        <p class="proof-note">Please review the photo and make sure the work was delivered before confirming.</p>
        <p v-if="completionError" class="completion-error" role="alert">{{ completionError }}</p>
        <button class="btn primary" :disabled="confirmingCompletion || !proofObjectUrl" @click="confirmCompletion">
          {{ confirmingCompletion ? "Confirming..." : "Confirm Job Completed" }}
        </button>
      </template>
      <div v-if="job.status === 'completed'">
        <p class="completion-success" role="status">
          Job confirmed by Hirer<span v-if="job.completionConfirmedAt"> on {{ new Date(job.completionConfirmedAt).toLocaleString('th-TH') }}</span>.
          Payment is recorded in DEMO mode; no real transfer occurred.
        </p>
        <div class="actions">
          <button class="btn primary" @click="goReview">Review</button>
          <!-- Refund remains outside this MVP flow; do not route to mock refunds. -->
        </div>
      </div>

      <!-- FR-JOB-07: รายละเอียดการยกเลิก -->
      <template v-if="job.status === 'cancelled' && job.cancellation">
        <h2 class="section-title">Cancellation Details</h2>
        <dl class="rows">
          <div class="row"><dt>Cancelled By</dt><dd>{{ job.cancellation.cancelledBy }}</dd></div>
          <div class="row"><dt>Reason</dt><dd>{{ job.cancellation.reason }}</dd></div>
        </dl>
        <button class="btn primary" @click="router.push({ name: 'hirer-my-jobs' })">Back to My Jobs</button>
      </template>
    </section>
  </main>
  <main v-else class="job-detail">
    <AppHeader title="Job Details" />
    <p v-if="loading" class="placeholder">กำลังโหลดรายละเอียดงาน...</p>
    <p v-else class="placeholder" role="alert">{{ errorMsg || "Job not found." }}</p>
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
.actions { display: flex; gap: 10px; }
.proof-link { display: inline-flex; flex-direction: column; align-items: flex-start; gap: 6px; color: #1d4ed8; font-size: 13px; margin: 4px 0; }
.completion-proof { display: block; max-width: 100%; max-height: 320px; border-radius: 8px; object-fit: contain; }
.proof-missing, .proof-note, .completion-error, .completion-success { font-size: 12px; margin: 8px 0; }
.proof-note { color: #555; }
.proof-missing, .completion-error { color: #dc2626; }
.completion-success { color: #15803d; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.actions .btn { margin-top: 16px; }
.placeholder { padding: 16px; color: #888; }
</style>
