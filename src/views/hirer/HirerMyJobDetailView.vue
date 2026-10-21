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
const cancellingExpiredJob = ref(false);
const canCancelExpiredJob = computed(() => job.value?.status === "waiting" && applicantsLoaded.value && applicants.value.length === 0 && new Date(job.value.scheduledAt).getTime() < Date.now());

function resolveUploadUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
  return apiBase.replace(/\/api\/?$/, "") + pathOrUrl;
}

function formatDuration(data) {
  if (data.durationStart && data.durationEnd) {
    return `${new Date(data.durationStart).toLocaleString("th-TH")} - ${new Date(data.durationEnd).toLocaleString("th-TH")}`;
  }
  return data.scheduledAt ? new Date(data.scheduledAt).toLocaleString("th-TH") : "-";
}

async function loadJob() {
  loading.value = true;
  try {
    const { data } = await api.get(`/jobs/${route.params.id}`);
    const selectedWorkerId = data.selectedWorker?._id || data.selectedWorker;
    if (selectedWorkerId && ["assigned", "in_progress", "awaiting_confirmation", "completed"].includes(data.status)) {
      try {
        const { data: profile } = await api.get(`/users/${selectedWorkerId}`);
        workerProfile.value = profile;
      } catch {
        workerProfile.value = null;
      }
    }
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
      total: Number(data.price || 0) + Number(data.deliveryFee || 0),
      from: { label: data.fromText || data.locationText || "-" },
      to: { label: data.toText || "-" },
      applicants: data.applicants || [],
      statusLabel: ({ assigned: "Worker selected", in_progress: "In Progress", awaiting_confirmation: "Proof submitted", completed: "Complete" })[data.status] || data.status,
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
onUnmounted(() => window.clearInterval(statusRefreshTimer));

async function cancelExpiredJob() {
  if (!canCancelExpiredJob.value || cancellingExpiredJob.value) return;
  if (!window.confirm("งานนี้เลยเวลานัดและไม่มีผู้สมัคร ต้องการยกเลิกประกาศงานหรือไม่?")) return;
  cancellingExpiredJob.value = true;
  try {
    const { data } = await api.post(`/jobs/${job.value._id}/cancel`, {
      expiredNoApplicants: true,
      reason: "Expired: no applicants before the scheduled time.",
    });
    job.value = { ...job.value, ...data.job, statusLabel: data.job.status };
    router.push({ name: "hirer-dashboard" });
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "Unable to cancel this expired job.";
  } finally {
    cancellingExpiredJob.value = false;
  }
}
function goApplicants() {
  router.push({ name: "hirer-applicants", params: { id: job.value._id } });
}
function goRefund() {
  router.push({ name: "hirer-refund", params: { id: job.value.id } });
}
function goReview() {
  router.push({ name: "hirer-review", params: { id: job.value.id } });
}
const confirmingCompletion = ref(false);
const completionConfirmed = ref(false);
const completionError = ref("");
const progressSteps = computed(() => {
  const currentStep = job.value?.status === "assigned" ? 0
    : job.value?.status === "in_progress" ? 1
    : job.value?.status === "awaiting_confirmation" ? 2
    : job.value?.status === "completed" ? 4
    : -1;
  return ["Start", "In Progress", "Submit Proof", "Complete"].map((label, index) => ({
    label, done: currentStep > index, current: currentStep === index,
  }));
});

async function confirmCompletion() {
  if (!job.value || job.value.status !== "awaiting_confirmation" || confirmingCompletion.value || completionConfirmed.value) return;
  if (!window.confirm("Confirm that this job is complete and release the held payment to the worker?")) return;

  confirmingCompletion.value = true;
  completionError.value = "";
  try {
    const { data } = await api.post(`/jobs/${job.value._id}/confirm-completion`);
    job.value = { ...job.value, ...data.job, statusLabel: "Complete" };
    completionConfirmed.value = true;
  } catch (err) {
    completionError.value = err.response?.data?.message || "Unable to confirm job completion.";
  } finally {
    confirmingCompletion.value = false;
  }
}

</script>

<template>
  <main v-if="job" class="job-detail">
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
        <div class="row"><dt>Price</dt><dd>{{ job.price }} Baht</dd></div>
        <div class="row"><dt>Service Fee</dt><dd>{{ job.serviceFee }} Baht</dd></div>
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

      <button v-if="canCancelExpiredJob" class="btn danger" :disabled="cancellingExpiredJob" @click="cancelExpiredJob">
        {{ cancellingExpiredJob ? "Cancelling..." : "Cancel expired job" }}
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
              <div v-if="step.current && step.label === 'Complete'" class="t-time">Waiting for your confirmation</div>
              <div v-else-if="step.current && step.label === 'Start'" class="t-time">Worker has been selected</div>
              <div v-else-if="step.current && step.label === 'In Progress'" class="t-time">Worker is doing the job</div>
              <div v-else-if="step.current && step.label === 'Submit Proof'" class="t-time">Completion proof submitted</div>
            </div>
          </li>
        </ol>

        <div v-if="!['completed', 'awaiting_confirmation'].includes(job.status)" class="actions">
          <button class="btn outline" @click="goRefund">Cancel</button>
          <button class="btn danger" @click="goRefund">Refund</button>
        </div>
      </template>

      <!-- FR-REV-01, FR-PAY-06: งานเสร็จแล้ว รีวิวได้ / ขอคืนเงินได้ -->
      <template v-if="job.status === 'awaiting_confirmation'">
        <h2 class="section-title">Completion proof</h2>
        <a v-if="job.completionProofUrl" class="proof-link" :href="resolveUploadUrl(job.completionProofUrl)" target="_blank" rel="noopener noreferrer">
          <img class="completion-proof" :src="resolveUploadUrl(job.completionProofUrl)" alt="Worker completion proof" />
          View worker's completion photo
        </a>
        <p v-else class="proof-missing">The worker has not provided a completion photo.</p>
        <p v-if="completionError" class="completion-error" role="alert">{{ completionError }}</p>
        <p v-if="completionConfirmed" class="completion-success" role="status">Job completion confirmed and payment released.</p>
        <button v-if="!completionConfirmed" class="btn primary" :disabled="confirmingCompletion || !job.completionProofUrl" @click="confirmCompletion">
          {{ confirmingCompletion ? "Confirming..." : "Complete" }}
        </button>
        <div class="actions">
          <button class="btn danger" @click="goRefund">Refund</button>
        </div>
      </template>
      <div v-if="job.status === 'completed'" class="actions">
        <button class="btn primary" @click="goReview">Review</button>
        <button class="btn danger" @click="goRefund">Refund</button>
      </div>

      <!-- FR-JOB-07: รายละเอียดการยกเลิก -->
      <template v-if="job.status === 'cancelled' && job.cancellation">
        <h2 class="section-title">Cancellation Details</h2>
        <dl class="rows">
          <div class="row"><dt>Cancelled By</dt><dd>{{ job.cancellation.cancelledBy }}</dd></div>
          <div class="row"><dt>Reason</dt><dd>{{ job.cancellation.reason }}</dd></div>
        </dl>
        <button class="btn primary" @click="router.push({ name: 'hirer-dashboard' })">Back to My Jobs</button>
      </template>
    </section>
  </main>
  <main v-else class="job-detail">
    <AppHeader title="Job Details" />
    <p class="placeholder">Job not found.</p>
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
.proof-missing, .completion-error, .completion-success { font-size: 12px; margin: 8px 0; }
.proof-missing, .completion-error { color: #dc2626; }
.completion-success { color: #15803d; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.actions .btn { margin-top: 16px; }
.placeholder { padding: 16px; color: #888; }
</style>


