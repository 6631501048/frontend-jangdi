<script setup>
// FR-TRACK-01: อัปเดตสถานะงานตามขั้นตอน (เริ่มงาน, กำลังดำเนินการ, ส่งหลักฐาน, เสร็จสิ้น)
// FR-TRACK-02: ผู้ว่าจ้างเห็นการอัปเดตสถานะแบบเรียลไทม์ (ฝั่ง backend/WebSocket)
// FR-TRACK-03: ต้องอัปโหลดรูปภาพหลักฐานเมื่อทำเครื่องหมายว่างานเสร็จแล้ว
// FR-TRACK-04: ผู้ว่าจ้างยืนยันงานเสร็จ → ปล่อยเงิน Escrow
// FR-TRACK-05: ทุกการเปลี่ยนสถานะถูกบันทึกลง JOB_LOG (immutable audit trail)
// FR-SOS-01/02/03: ผู้รับจ้างกดสัญญาณฉุกเฉินได้ระหว่างงาน กำลังดำเนินอยู่ ระบบบันทึกตำแหน่ง+ส่งถึง Admin ภายใน 1 นาที
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
import { fetchCompletionProof, proofRequestError } from "../../services/completionProof";
import ReportUserForm from "../../components/ReportUserForm.vue";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const hasLoaded = ref(false);
const errorMsg = ref("");
const demoPaymentStatus = ref(null);
const hirerProfile = ref(null);

// backend status: assigned | in_progress | awaiting_confirmation | completed | cancelled -> UI status ที่หน้านี้ใช้
function toUiStatus(backendStatus) {
  if (["assigned", "in_progress", "awaiting_confirmation"].includes(backendStatus)) return "in-progress";
  return backendStatus; // completed | cancelled ใช้ชื่อเดียวกัน
}

const job = ref({
  id: route.params.id,
  hirerName: "",
  title: "",
  description: "",
  status: "in-progress",
  backendStatus: "assigned",
  details: "-",
  duration: "-",
  price: 0,
  serviceFee: 0,
  from: "-",
  to: "-",
  notes: "-",
  hirerPhone: "-",
  hirerLine: "-",
  timeline: [],
  cancellation: null,
});

function formatStatusTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}
function buildTimeline(backendStatus, events = [], proofSubmittedAt, completionConfirmedAt) {
  const currentStep = { assigned: 0, in_progress: 1, awaiting_confirmation: 2, completed: 3 }[backendStatus] ?? -1;
  const labels = ["Start", "In Progress", "Submit Proof", "Complete"];
  const statuses = ["assigned", "in_progress", "awaiting_confirmation", "completed"];
  return labels.map((label, index) => {
    const event = events.find((e) => e.status === statuses[index]);
    const actualTime = event?.at || (index === 2 ? proofSubmittedAt : index === 3 ? completionConfirmedAt : null);
    return {
      key: statuses[index], label,
      timestamp: formatStatusTime(actualTime),
      done: currentStep > index, current: currentStep === index,
    };
  });
}

async function loadJob() {
  // Avoid clearing the entire page during background status checks.
  if (!hasLoaded.value) loading.value = true;
  errorMsg.value = "";
  try {
    const { data } = await api.get(`/jobs/${route.params.id}`);
    let events = [];
    if (["assigned", "in_progress", "awaiting_confirmation", "completed"].includes(data.status)) {
      // The timeline endpoint also verifies that the current user belongs to this job.
      const { data: timeline } = await api.get(`/jobs/${route.params.id}/timeline`);
      events = timeline;
    }
    if (data.status === "assigned") {
      try { const { data: pay } = await api.get(`/payments/${route.params.id}/mock`); demoPaymentStatus.value = pay.status; }
      catch { demoPaymentStatus.value = null; }
    } else demoPaymentStatus.value = null;
    const hirerId = data.hirer?._id || data.hirer;
    let profile = data.hirer || {};
    if (hirerId && ["assigned", "in_progress", "awaiting_confirmation", "completed"].includes(data.status)) {
      try {
        const { data: loadedProfile } = await api.get(`/users/${hirerId}`);
        profile = loadedProfile;
      } catch {
        profile = data.hirer || {};
      }
    }
    hirerProfile.value = profile;
    job.value = {
      id: data._id,
      hirerName: data.hirer?.fullName || "ผู้ว่าจ้าง",
      title: data.title,
      description: data.description,
      status: toUiStatus(data.status),
      backendStatus: data.status,
      details: data.description,
      duration: data.scheduledAt ? new Date(data.scheduledAt).toLocaleString("th-TH") : "-",
      price: data.price,
      serviceFee: data.deliveryFee || 0,
      from: data.fromText || data.locationText || "-",
      to: data.toText || "-",
      notes: data.notes || "-",
      hirerPhone: profile.phone || "-",
      hirerLine: profile.lineId || "-",
      timeline: buildTimeline(data.status, events, data.proofSubmittedAt, data.completionConfirmedAt),
      completionConfirmedAt: data.completionConfirmedAt,
      completionProofUrl: data.completionProofUrl,
      cancellation: data.status === "cancelled" ? { by: "Hirer", reason: data.cancelReason || "Not specified", at: data.cancelledAt } : null,
    };
    hasLoaded.value = true;
    if (["awaiting_confirmation", "completed"].includes(data.status) && data.completionProofUrl) {
      await loadSubmittedProof(data);
    } else {
      loadedSubmittedProofKey = null;
      clearSubmittedProof();
    }
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "โหลดรายละเอียดงานไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}
let statusRefreshTimer;
onMounted(async () => {
  await loadJob();
  statusRefreshTimer = window.setInterval(() => {
    if (["assigned", "awaiting_confirmation"].includes(job.value.backendStatus)) loadJob();
  }, 5000);
});
onUnmounted(() => {
  window.clearInterval(statusRefreshTimer);
  clearSelectedProof();
  clearSubmittedProof();
  loadedSubmittedProofKey = null;
});

const total = computed(() => job.value.price + job.value.serviceFee);

const statusMeta = {
  "in-progress": { label: "In Process", class: "purple" },
  assigned: { label: "Assigned", class: "purple" },
  in_progress: { label: "In Progress", class: "purple" },
  awaiting_confirmation: { label: "Waiting for Hirer", class: "purple" },
  completed: { label: "Completed", class: "green" },
  cancelled: { label: "Cancelled", class: "red" },
  disputed: { label: "Disputed", class: "red" },
  waiting: { label: "Waiting", class: "purple" },
};

/* ---------- อัปเดตสถานะ / ส่งหลักฐาน ---------- */
const updating = ref(false);
const proofInput = ref(null);
const selectedProof = ref(null);
const selectedProofUrl = ref(null);
const selectedProofError = ref("");
const submittedProofUrl = ref(null);
const submittedProofLoading = ref(false);
const submittedProofError = ref("");
let loadedSubmittedProofKey = null;

function clearSelectedProof() {
  if (selectedProofUrl.value) URL.revokeObjectURL(selectedProofUrl.value);
  selectedProofUrl.value = null;
  selectedProof.value = null;
  selectedProofError.value = "";
  if (proofInput.value) proofInput.value.value = "";
}
function clearSubmittedProof() {
  if (submittedProofUrl.value) URL.revokeObjectURL(submittedProofUrl.value);
  submittedProofUrl.value = null;
}
async function loadSubmittedProof(data, force = false) {
  const key = `${data._id}:${data.completionProofUrl}`;
  if (!force && loadedSubmittedProofKey === key) return;
  loadedSubmittedProofKey = key;
  clearSubmittedProof();
  submittedProofError.value = "";
  submittedProofLoading.value = true;
  try {
    const imageUrl = await fetchCompletionProof(data._id);
    if (loadedSubmittedProofKey === key) submittedProofUrl.value = imageUrl;
    else URL.revokeObjectURL(imageUrl);
  } catch (err) {
    if (loadedSubmittedProofKey === key) submittedProofError.value = await proofRequestError(err);
  } finally {
    if (loadedSubmittedProofKey === key) submittedProofLoading.value = false;
  }
}
function retrySubmittedProof() {
  if (job.value.id && job.value.completionProofUrl) loadSubmittedProof({ _id: job.value.id, completionProofUrl: job.value.completionProofUrl }, true);
}
function selectProof() { if (!updating.value) proofInput.value?.click(); }

// assigned -> in_progress -> awaiting_confirmation (the Hirer alone confirms completion)
function updateStatus() {
  if (job.value.backendStatus === "awaiting_confirmation") return;
  if (job.value.backendStatus === "in_progress") {
    selectProof(); // choose first, preview, explicitly confirm later
    return;
  }
  submitStatusUpdate(null);
}

function onProofSelected(e) {
  const file = e.target.files?.[0];
  e.target.value = ""; // Allow choosing the same file again after cancel/retry.
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    clearSelectedProof();
    selectedProofError.value = "กรุณาเลือกรูป JPG, PNG หรือ WebP เท่านั้น";
    return;
  }
  if (!file.size || file.size > 5 * 1024 * 1024) {
    clearSelectedProof();
    selectedProofError.value = "รูปต้องมีขนาดไม่เกิน 5 MB และไม่เป็นไฟล์ว่าง";
    return;
  }
  const previewUrl = URL.createObjectURL(file);
  if (selectedProofUrl.value) URL.revokeObjectURL(selectedProofUrl.value);
  selectedProof.value = file;
  selectedProofUrl.value = previewUrl;
  selectedProofError.value = "";
  errorMsg.value = "";
  // No upload here: the Worker must review and confirm the image first.
}

async function confirmSelectedProof() {
  if (!selectedProof.value || updating.value) return;
  if (!["in_progress", "awaiting_confirmation"].includes(job.value.backendStatus)) return;
  updating.value = true;
  selectedProofError.value = "";
  errorMsg.value = "";
  try {
    const formData = new FormData();
    formData.append("proof", selectedProof.value);
    if (job.value.backendStatus === "in_progress") {
      formData.append("next", "awaiting_confirmation");
      await api.patch(`/jobs/${job.value.id}/status`, formData);
    } else {
      // Worker may replace the submitted image until Hirer has confirmed completion.
      await api.patch(`/jobs/${job.value.id}/completion-proof`, formData);
    }
    clearSelectedProof();
    // Re-fetch authenticated image; don't reuse a previous version after replacement.
    loadedSubmittedProofKey = null;
    await loadJob();
  } catch (err) {
    selectedProofError.value = err.response?.data?.message || "ส่งรูปหลักฐานไม่สำเร็จ กรุณาลองอีกครั้ง";
    // Keep the selected file and preview so the user can retry.
  } finally {
    updating.value = false;
  }
}

async function submitStatusUpdate() {
  if (job.value.backendStatus === "assigned" && demoPaymentStatus.value !== "held") {
    errorMsg.value = "รอ Hirer กดยืนยัน Mock Payment ก่อนเริ่มงาน";
    return;
  }
  const next = job.value.backendStatus === "assigned" ? "in_progress" : "awaiting_confirmation";
  updating.value = true;
  errorMsg.value = "";
  try {
    const formData = new FormData();
    formData.append("next", next);
    await api.patch(`/jobs/${job.value.id}/status`, formData);
    await loadJob(); // โหลดสถานะล่าสุดกลับมาแสดง
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "อัปเดตสถานะไม่สำเร็จ";
  } finally {
    updating.value = false;
  }
}

/* ---------- SOS ---------- */
function sendSOS() {
  if (!confirm("ยืนยันการส่งสัญญาณฉุกเฉิน (SOS) ใช่หรือไม่?")) return;
  if (!navigator.geolocation) {
    alert("เบราว์เซอร์นี้ไม่รองรับการขอตำแหน่ง ไม่สามารถส่ง SOS ได้");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        await api.post("/sos", {
          jobId: job.value.id,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        alert("ส่งสัญญาณ SOS สำเร็จ ผู้ดูแลระบบกำลังติดต่อกลับโดยเร็วที่สุด");
      } catch (err) {
        alert(err.response?.data?.message || "ส่งสัญญาณ SOS ไม่สำเร็จ");
      }
    },
    () => alert("ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง ไม่สามารถส่ง SOS ได้")
  );
}

function callHirer() {
  window.location.href = `tel:${job.value.hirerPhone}`;
}

function goBack() {
  router.back();
}
function backToMyJobs() {
  router.push("/worker/jobs");
}
function goToReview() {
  router.push(`/worker/jobs/${job.value.id}/review`);
}
</script>

<template>
  <div class="page">
    <!-- แถบด้านบนแบบ sub-page -->
    <header class="topbar">
      <button class="icon-btn" aria-label="ย้อนกลับ" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="title">Job Details</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>

    <main class="content">
      <p v-if="loading && !hasLoaded" class="page-message">กำลังโหลดรายละเอียดงาน...</p>
      <p v-else-if="!hasLoaded" class="page-message error-msg" role="alert">{{ errorMsg || "ไม่พบรายละเอียดงาน" }}</p>
      <div v-else class="card">
        <p v-if="errorMsg" class="error-msg" role="alert">{{ errorMsg }}</p>
        <!-- หัวข้อ: ผู้ว่าจ้าง + ชื่องาน + สถานะ -->
        <div class="job-head">
          <span class="job-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
          </span>
          <div class="job-head-body">
            <p class="hirer-name">{{ job.hirerName }}</p>
            <p class="job-title">{{ job.title }}</p>
            <p class="job-desc">{{ job.description }}</p>
          </div>
          <span class="status-tag" :class="(statusMeta[job.backendStatus] || statusMeta[job.status] || statusMeta.waiting).class">{{ (statusMeta[job.backendStatus] || statusMeta[job.status] || statusMeta.waiting).label }}</span>
        </div>

        <!-- รายละเอียด -->
        <dl class="detail-list">
          <div class="detail-row">
            <dt>Details</dt>
            <dd>{{ job.details }}</dd>
          </div>
          <div class="detail-row">
            <dt>Time</dt>
            <dd>{{ job.duration }}</dd>
          </div>
          <div class="detail-row">
            <dt>Price</dt>
            <dd>{{ job.price }} Baht</dd>
          </div>
          <div class="detail-row">
            <dt>Service fee</dt>
            <dd>{{ job.serviceFee }} Baht</dd>
          </div>
          <div class="detail-row total">
            <dt>Total</dt>
            <dd>{{ total }} Baht</dd>
          </div>
        </dl>

        <div class="route-row">
          <div class="route-col">
            <p class="route-label"><svg class="pin" viewBox="0 0 24 24"><path d="M12 21s-7-6.5-7-11a7 7 0 0114 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>From</p>
            <p class="route-value">{{ job.from }}</p>
          </div>
          <div class="route-col">
            <p class="route-label">To</p>
            <p class="route-value">{{ job.to }}</p>
          </div>
        </div>

        <div class="notes-row">
          <p class="notes-label">Additional Notes (Optional)</p>
          <p class="notes-value">{{ job.notes }}</p>
        </div>

        <!-- ===== In Progress: ติดต่อ + Timeline + SOS + ปุ่มอัปเดตสถานะ ===== -->
        <template v-if="job.status === 'in-progress'">
          <div class="contact-block">
            <p class="block-title">Contact</p>
            <p class="block-hint">You can contact this hirer only during the job is in progress.</p>
            <div class="contact-buttons">
              <button class="contact-btn" :disabled="job.hirerPhone === '-'" @click="callHirer">
                <svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.5 2.1L8 9.7a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.9.3 1.8.5 2.7.6a2 2 0 011.7 2z" /></svg>
                <span>
                  <strong>{{ job.hirerPhone }}</strong>
                  <small>Phone call</small>
                </span>
              </button>
              <a v-if="job.hirerLine !== '-'" class="contact-btn" :href="`https://line.me/R/ti/p/~${encodeURIComponent(job.hirerLine)}`" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M8 10h8M8 14h5" /></svg>
                <span>
                  <strong>{{ job.hirerLine }}</strong>
                  <small>LINE ID</small>
                </span>
              </a>
              <div v-else class="contact-btn unavailable">
                <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M8 10h8M8 14h5" /></svg>
                <span><strong>LINE ID unavailable</strong><small>Not provided in profile</small></span>
              </div>
            </div>
          </div>

          <div class="status-sos-row">
            <ol class="timeline">
              <li v-for="step in job.timeline" :key="step.key" :class="{ done: step.done, current: step.current }">
                <span class="dot"></span>
                <div>
                  <p class="step-label">{{ step.label }}</p>
                  <p v-if="step.timestamp" class="step-time">{{ step.timestamp }}</p>
                </div>
              </li>
            </ol>

            <div class="sos-box">
              <p class="sos-title">
                <svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>
                SOS Emergency
              </p>
              <p class="sos-desc">If you're in an emergency or dangerous situation, tap the red button below to get immediate support and coordination assistance.</p>
              <button class="btn-sos" @click="sendSOS">
                <svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>
                Tap to Send SOS
              </button>
            </div>
          </div>

          <p v-if="job.backendStatus === 'assigned' && demoPaymentStatus !== 'held'" class="pending-confirmation">Waiting for Hirer Mock Payment (no real transfer)</p>
          <button v-if="job.backendStatus === 'assigned'" class="btn-primary" :disabled="updating || demoPaymentStatus !== 'held'" @click="updateStatus">
            {{ updating ? "Updating..." : "Start Job" }}
          </button>
          <button v-if="job.backendStatus === 'in_progress' && !selectedProof" class="btn-primary" :disabled="updating" @click="selectProof">เลือกรูปหลักฐาน</button>
          <p v-if="job.backendStatus === 'awaiting_confirmation'" class="pending-confirmation">ส่งหลักฐานแล้ว รอ Hirer ยืนยันงาน คุณยังเปลี่ยนรูปได้ก่อน Hirer ยืนยัน</p>
          <input v-if="['in_progress', 'awaiting_confirmation'].includes(job.backendStatus)" ref="proofInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden-input" @change="onProofSelected" />

          <!-- Review BEFORE sending: selecting a file never uploads it. -->
          <section v-if="selectedProof && selectedProofUrl" class="proof-panel" aria-label="ตรวจรูปก่อนส่งหลักฐาน">
            <h2 class="proof-heading">ตรวจรูปหลักฐานก่อนส่ง</h2>
            <img :src="selectedProofUrl" class="proof-photo" alt="ตัวอย่างรูปหลักฐานที่เลือก" />
            <p class="proof-caption">{{ selectedProof.name }} ({{ (selectedProof.size / 1024 / 1024).toFixed(2) }} MB)</p>
            <p class="proof-caption">รูปนี้ยังไม่ได้อัปโหลด กรุณาตรวจให้ถูกต้องก่อนกดยืนยัน</p>
            <div class="proof-buttons">
              <button type="button" class="proof-secondary" :disabled="updating" @click="selectProof">เปลี่ยนรูป</button>
              <button type="button" class="proof-secondary" :disabled="updating" @click="clearSelectedProof">ยกเลิก</button>
              <button type="button" class="proof-primary" :disabled="updating" @click="confirmSelectedProof">
                {{ updating ? "กำลังส่ง..." : job.backendStatus === 'awaiting_confirmation' ? "ยืนยันเปลี่ยนรูป" : "ยืนยันส่งหลักฐาน" }}
              </button>
            </div>
          </section>
          <p v-if="selectedProofError" class="error-msg" role="alert">{{ selectedProofError }}</p>
          <section v-if="job.backendStatus === 'awaiting_confirmation'" class="proof-panel" aria-label="หลักฐานที่ส่งแล้ว">
            <h2 class="proof-heading">รูปหลักฐานที่ส่งแล้ว</h2>
            <p v-if="submittedProofLoading" class="proof-caption">กำลังโหลดรูป...</p>
            <a v-else-if="submittedProofUrl" :href="submittedProofUrl" target="_blank" rel="noopener noreferrer">
              <img :src="submittedProofUrl" class="proof-photo" alt="รูปหลักฐานที่ส่งให้ Hirer" @error="submittedProofError = 'แสดงรูปไม่สำเร็จ กรุณาลองอีกครั้ง'; clearSubmittedProof()" />
              <span class="proof-caption">ดูรูปขนาดเต็ม</span>
            </a>
            <div v-else-if="submittedProofError" class="proof-caption error-msg" role="alert">
              {{ submittedProofError }}
              <button type="button" class="proof-secondary" @click="retrySubmittedProof">ลองโหลดรูปอีกครั้ง</button>
            </div>
            <button v-if="!selectedProof" type="button" class="proof-secondary" :disabled="updating" @click="selectProof">เปลี่ยนรูปหลักฐานที่ส่งแล้ว</button>
          </section>
          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
          <ReportUserForm :reported-user="hirerProfile" :job-id="job.id" />
        </template>

        <!-- ===== Cancelled: รายละเอียดการยกเลิก ===== -->
        <template v-else-if="job.status === 'cancelled'">
          <div class="cancel-block">
            <p class="block-title">Cancellation Details</p>
            <dl class="detail-list">
              <div class="detail-row">
                <dt>Cancelled By</dt>
                <dd>{{ job.cancellation?.by || "Hirer" }}</dd>
              </div>
              <div class="detail-row">
                <dt>Reason</dt>
                <dd>{{ job.cancellation?.reason || "Not specified" }}</dd>
              </div>
            </dl>
          </div>
          <button class="btn-primary" @click="backToMyJobs">Back to My Job</button>
        </template>

        <!-- ===== Completed: ให้รีวิวผู้ว่าจ้าง (SRS 3.5.15 / FR-REV-01–02) ===== -->
        <template v-if="job.status === 'completed'">
          <section class="proof-panel" aria-label="หลักฐานหลังเสร็จงาน">
            <h2 class="proof-heading">รูปหลักฐานที่ส่งไว้ (แก้ไขไม่ได้หลังยืนยัน)</h2>
            <p v-if="submittedProofLoading" class="proof-caption">กำลังโหลดรูป...</p>
            <a v-else-if="submittedProofUrl" :href="submittedProofUrl" target="_blank" rel="noopener noreferrer">
              <img :src="submittedProofUrl" class="proof-photo" alt="หลักฐานงานที่เสร็จแล้ว" @error="submittedProofError = 'แสดงรูปไม่สำเร็จ กรุณาลองอีกครั้ง'; clearSubmittedProof()" />
              <span class="proof-caption">ดูรูปขนาดเต็ม</span>
            </a>
            <div v-else-if="submittedProofError" class="error-msg" role="alert">{{ submittedProofError }} <button type="button" class="proof-secondary" @click="retrySubmittedProof">ลองอีกครั้ง</button></div>
          </section>
          <p class="completion-note">Completed<span v-if="job.completionConfirmedAt"> — confirmed on {{ formatStatusTime(job.completionConfirmedAt) }}</span></p>
          <ReportUserForm :reported-user="hirerProfile" :job-id="job.id" />
          <button class="btn-primary" @click="goToReview">Review Hirer</button>
          <button class="btn-outline" @click="backToMyJobs">Back to My Jobs</button>
        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; background: #f0f0f0; }
svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

/* ---------- Top bar (sub-page) ---------- */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; background: #fff; position: sticky; top: 0; z-index: 10;
  border-bottom: 1px solid #eee;
}
.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border: none; background: transparent;
  border-radius: 50%; color: #111; cursor: pointer;
}
.title { margin: 0; font-size: 15px; font-weight: 700; color: #111; }
.spacer { width: 40px; }

.content { padding: 16px; }
.card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }

/* ---------- หัวข้องาน ---------- */
.job-head { display: flex; gap: 10px; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid #f2f2f2; margin-bottom: 12px; }
.job-avatar {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; border: 1px solid #ddd;
  display: flex; align-items: center; justify-content: center; color: #555;
}
.job-head-body { flex: 1; min-width: 0; }
.hirer-name { margin: 0; font-size: 12px; color: #999; }
.job-title { margin: 2px 0; font-size: 14px; font-weight: 700; color: #111; }
.job-desc { margin: 0; font-size: 11px; color: #999; }
.status-tag { flex-shrink: 0; font-size: 12px; font-weight: 700; white-space: nowrap; }
.status-tag.purple { color: #6d5bd0; }
.status-tag.green { color: #1a9c4a; }
.status-tag.red { color: #e11d48; }

/* ---------- รายละเอียด ---------- */
.detail-list { margin: 0; display: flex; flex-direction: column; }
.detail-row { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0; }
.detail-row dt { font-size: 12px; color: #999; }
.detail-row dd { margin: 0; font-size: 13px; color: #111; font-weight: 600; }
.detail-row.total { border-top: 1px solid #f2f2f2; margin-top: 2px; padding-top: 10px; }
.detail-row.total dt, .detail-row.total dd { font-weight: 700; color: #111; }

.route-row { display: flex; gap: 16px; padding: 12px 0; border-top: 1px solid #f2f2f2; }
.route-col { flex: 1; min-width: 0; }
.route-label { margin: 0; display: flex; align-items: center; gap: 4px; font-size: 11px; color: #999; }
.route-label .pin { width: 13px; height: 13px; }
.route-value { margin: 2px 0 0; font-size: 13px; font-weight: 600; color: #111; }

.notes-row { padding: 12px 0; border-top: 1px solid #f2f2f2; }
.notes-label { margin: 0; font-size: 11px; color: #999; }
.notes-value { margin: 2px 0 0; font-size: 13px; color: #333; }

/* ---------- ติดต่อ ---------- */
.contact-block { padding-top: 12px; border-top: 1px solid #f2f2f2; }
.block-title { margin: 0 0 2px; font-size: 13px; font-weight: 700; color: #111; }
.block-hint { margin: 0 0 10px; font-size: 11px; color: #999; }
.contact-buttons { display: flex; gap: 10px; }
.contact-btn {
  flex: 1; display: flex; align-items: center; gap: 8px; min-height: 52px;
  border: 1px solid #ddd; border-radius: 10px; background: #fff; padding: 8px 10px; cursor: pointer;
}
.contact-btn svg { flex-shrink: 0; color: #333; }
.contact-btn span { display: flex; flex-direction: column; text-align: left; min-width: 0; }
.contact-btn strong { font-size: 11.5px; color: #111; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.contact-btn small { font-size: 10.5px; color: #999; }

/* ---------- Timeline + SOS ---------- */
.status-sos-row { display: flex; gap: 12px; margin-top: 16px; }
.timeline { list-style: none; margin: 0; padding: 0; flex-shrink: 0; width: 42%; }
.timeline li { position: relative; display: flex; gap: 8px; padding-bottom: 20px; padding-left: 2px; }
.timeline li:not(:last-child)::before {
  content: ""; position: absolute; left: 5px; top: 14px; bottom: -6px; width: 1px; background: #e5d9b0;
}
.timeline .dot { width: 11px; height: 11px; border-radius: 50%; background: #fff; border: 2px solid #ddd; flex-shrink: 0; margin-top: 2px; }
.timeline li.done .dot, .timeline li.current .dot { background: #ffc93c; border-color: #ffc93c; }
.step-label { margin: 0; font-size: 11.5px; color: #999; }
.timeline li.done .step-label, .timeline li.current .step-label { color: #b8860b; font-weight: 700; }
.step-time { margin: 1px 0 0; font-size: 9.5px; color: #bbb; }

.sos-box { flex: 1; min-width: 0; border: 1px solid #f3c9c9; background: #fff6f6; border-radius: 10px; padding: 10px; }
.sos-title { margin: 0 0 4px; display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: #e11d48; }
.sos-title svg { width: 15px; height: 15px; }
.sos-desc { margin: 0 0 8px; font-size: 10px; line-height: 1.4; color: #b91c1c; }
.btn-sos {
  width: 100%; min-height: 38px; border: none; border-radius: 8px; background: #e11d48; color: #fff;
  font-size: 11.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;
}
.btn-sos svg { width: 14px; height: 14px; }

/* ---------- ยกเลิก ---------- */
.cancel-block { padding-top: 12px; border-top: 1px solid #f2f2f2; }

/* ---------- ปุ่มหลัก ---------- */
.btn-primary {
  width: 100%; min-height: 46px; margin-top: 16px; border: none; border-radius: 10px;
  background: #ffc93c; color: #111; font-size: 14px; font-weight: 700; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.hidden-input { display: none; }
.error-msg { margin: 8px 0 0; font-size: 12px; color: #e11d48; text-align: center; }
.page-message { padding: 30px 12px; text-align: center; color: #777; }
.completion-note { font-size: 12px; color: #16803c; margin: 14px 0; }
.btn-outline { display: block; margin-top: 10px; border: 1px solid #ddd; background: white; border-radius: 8px; padding: 12px; width: 100%; cursor: pointer; }
.pending-confirmation { margin: 12px 0 0; font-size: 12px; color: #92400e; line-height: 1.45; }
</style>

<style scoped>
.proof-panel { margin: 16px 0; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; background: #fafafa; }
.proof-heading { font-size: 15px; font-weight: 700; margin: 0 0 10px; }
.proof-photo { display: block; max-width: 100%; width: auto; max-height: 320px; object-fit: contain; border-radius: 8px; background: #fff; }
.proof-caption { display: block; font-size: 12px; color: #555; margin: 8px 0; }
.proof-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.proof-secondary { background: #fff; border: 1px solid #ccc; color: #222; border-radius: 8px; padding: 9px 12px; cursor: pointer; }
.proof-primary { background: #facc15; color: #171717; border: none; font-weight: 700; border-radius: 8px; padding: 9px 12px; cursor: pointer; }
.proof-primary:disabled, .proof-secondary:disabled { opacity: .5; cursor: not-allowed; }
</style>
