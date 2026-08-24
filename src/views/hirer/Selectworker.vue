<script setup>
// FR-MATCH-03: ผู้ว่าจ้างดูรายชื่อผู้สมัคร (applicants) ของงานที่ตัวเองประกาศ เรียงตามระยะทางใกล้สุดก่อน
// FR-MATCH-04: ผู้ว่าจ้างเลือกผู้สมัครคนใดคนหนึ่งมาเป็นผู้รับจ้าง (Select Worker)
//   -> job เข้าสถานะ assigned + สร้าง Payment เข้า escrow (held) ทันที (ดูหมายเหตุ Escrow ใน API reference)
// หน้านี้ใช้ได้เฉพาะกับงานที่ status = "waiting" และเป็นเจ้าของงานเท่านั้น (เช็คจริงตอนเรียก API)
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";

const route = useRoute();
const router = useRouter();

const jobId = route.params.id;

/* ---------- ข้อมูลงานที่ประกาศไว้ ----------
   TODO FR-MATCH-03: แทนที่ mock นี้ด้วย GET /api/jobs/{jobId}
   (ใช้ยืนยันว่างานเป็นของเรา และแสดงสรุปงานด้านบน) */
const job = ref({
  id: jobId,
  title: "Buy Fresh Fruit from Bo Market",
  category: "delivery",
  description: "อยากได้คนช่วยไปซื้อผลไม้สดที่ตลาดโบใกล้ประตูมหาวิทยาลัย แล้วนำมาส่งที่หอพัก",
  price: 50,
  deliveryFee: 20,
  from: "MFU Market",
  to: "Lamduan 3",
  duration: "within 1 hour",
  status: "waiting", // "waiting" | "assigned" ...
  selectedWorkerId: null,
});

const loading = ref(false);
const errorMsg = ref("");

/* ---------- รายชื่อผู้สมัคร ----------
   TODO FR-MATCH-03: แทนที่ mock นี้ด้วย GET /api/jobs/{jobId}/applicants
   (backend คืนเรียงตามระยะทางใกล้สุดก่อนให้แล้ว ไม่ต้อง sort ฝั่ง frontend ซ้ำ) */
const applicants = ref([
  {
    id: "app1",
    workerId: "w1",
    name: "Somsak",
    avatarUrl: "",
    credibilityScore: 4.8,
    reviewCount: 12,
    distanceKm: 0.8,
    appliedAgo: "5m ago",
  },
  {
    id: "app2",
    workerId: "w2",
    name: "Mo",
    avatarUrl: "",
    credibilityScore: 4.5,
    reviewCount: 6,
    distanceKm: 1.2,
    appliedAgo: "9m ago",
  },
  {
    id: "app3",
    workerId: "w3",
    name: "Modeng",
    avatarUrl: "",
    credibilityScore: 4.9,
    reviewCount: 21,
    distanceKm: 2.4,
    appliedAgo: "15m ago",
  },
]);

const isAssigned = computed(() => job.value.status === "assigned");

function ratingStars(score) {
  return Math.round(score || 0);
}

/* ---------- ยืนยันเลือกผู้สมัคร ---------- */
const confirmTarget = ref(null); // applicant object รอยืนยัน
const submitting = ref(false);
const showSuccessModal = ref(false);
const hiredName = ref("");

function openConfirm(applicant) {
  if (isAssigned.value || submitting.value) return;
  confirmTarget.value = applicant;
}
function closeConfirm() {
  if (submitting.value) return;
  confirmTarget.value = null;
}

async function confirmSelect() {
  if (!confirmTarget.value) return;
  submitting.value = true;
  errorMsg.value = "";

  // FR-MATCH-04: POST /api/jobs/{jobId}/select-worker { workerId }
  // -> job.status: "waiting" -> "assigned", selectedWorker ตั้งเป็น workerId
  // -> backend สร้าง Payment ใหม่เข้าสถานะ "held" ทันที (escrow)
  try {
    await api.post(`/jobs/${jobId}/select-worker`, {
      workerId: confirmTarget.value.workerId,
    });

    job.value.status = "assigned";
    job.value.selectedWorkerId = confirmTarget.value.workerId;
    hiredName.value = confirmTarget.value.name;
    confirmTarget.value = null;
    showSuccessModal.value = true;
  } catch (err) {
    // เช่น 409 ถ้ามีคนอื่นถูกเลือกไปแล้ว, 403 ถ้าไม่ใช่เจ้าของงาน
    errorMsg.value = err.response?.data?.message || "เลือกผู้รับจ้างไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  } finally {
    submitting.value = false;
  }
}

function closeSuccessModal() {
  showSuccessModal.value = false;
  router.push("/hirer");
}

function goBack() {
  router.back();
}
</script>

<template>
  <div class="page">
    <!-- แถบด้านบนแบบ sub-page -->
    <header class="topbar">
      <button class="icon-btn" aria-label="ย้อนกลับ" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="title">Select Worker</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>

    <main class="content">
      <!-- สรุปงานที่ประกาศไว้ -->
      <div class="card job-card">
        <div class="job-head">
          <div>
            <p class="job-title">{{ job.title }}</p>
            <p class="job-desc">{{ job.description }}</p>
          </div>
          <span class="status-pill" :class="isAssigned ? 'is-assigned' : 'is-waiting'">
            {{ isAssigned ? "Assigned" : "Waiting" }}
          </span>
        </div>
        <div class="tags">
          <span class="tag">฿{{ job.price }}</span>
          <span class="tag">{{ job.duration }}</span>
          <span class="tag">{{ job.from }} → {{ job.to }}</span>
        </div>
      </div>

      <p v-if="errorMsg" class="error-banner">{{ errorMsg }}</p>

      <p v-if="isAssigned" class="assigned-hint">
        You already hired a worker for this job. New applicants can no longer be selected.
      </p>

      <!-- รายชื่อผู้สมัคร -->
      <div class="applicants-head">
        <h2>Applicants ({{ applicants.length }})</h2>
        <span class="sort-hint">Nearest first</span>
      </div>

      <section class="applicant-list">
        <article
          v-for="a in applicants"
          :key="a.id"
          class="card applicant-card"
          :class="{ selected: job.selectedWorkerId === a.workerId }"
        >
          <div class="applicant-head">
            <span class="avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
            </span>
            <div class="applicant-body">
              <p class="name">{{ a.name }}</p>
              <div class="rating-row">
                <span class="stars">
                  <span v-for="n in 5" :key="n" :class="{ filled: n <= ratingStars(a.credibilityScore) }">★</span>
                </span>
                <span class="rating-value">{{ a.credibilityScore.toFixed(1) }}</span>
                <span class="rating-count">({{ a.reviewCount }})</span>
              </div>
            </div>
            <div class="applicant-meta">
              <span class="distance">{{ a.distanceKm }} km</span>
              <span class="applied-ago">{{ a.appliedAgo }}</span>
            </div>
          </div>

          <div class="applicant-actions">
            <button class="btn-details" @click="router.push(`/users/${a.workerId}`)">Profile</button>
            <button
              v-if="job.selectedWorkerId !== a.workerId"
              class="btn-select"
              :disabled="isAssigned"
              @click="openConfirm(a)"
            >Select</button>
            <span v-else class="hired-pill">Hired</span>
          </div>
        </article>

        <p v-if="!applicants.length" class="empty">No applicants yet. Check back soon.</p>
      </section>
    </main>

    <!-- โมดัลยืนยันการเลือก -->
    <Transition name="fade">
      <div v-if="confirmTarget" class="modal-backdrop" @click.self="closeConfirm">
        <div class="modal-card">
          <h2 class="modal-title">Hire {{ confirmTarget.name }}?</h2>
          <p class="modal-sub">
            This will assign the job to {{ confirmTarget.name }} and move your payment into escrow.
            Other applicants will no longer be selectable.
          </p>
          <div class="modal-actions">
            <button class="btn-muted" :disabled="submitting" @click="closeConfirm">Cancel</button>
            <button class="btn-primary" :disabled="submitting" @click="confirmSelect">
              {{ submitting ? "Confirming..." : "Confirm" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- โมดัลสำเร็จ -->
    <Transition name="fade">
      <div v-if="showSuccessModal" class="modal-backdrop" @click="closeSuccessModal">
        <div class="modal-card" @click.stop>
          <div class="check-circle">
            <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 class="modal-title">Hiring Successful</h2>
          <p class="modal-sub">You have successfully hired {{ hiredName }}.</p>
          <button class="btn-primary" @click="closeSuccessModal">Done</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; background: #f0f0f0; }
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

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

.content { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }

/* ---------- การ์ดสรุปงาน ---------- */
.job-card { padding: 14px; }
.job-head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.job-title { margin: 0; font-size: 14px; font-weight: 700; color: #111; }
.job-desc { margin: 3px 0 0; font-size: 12px; color: #777; }
.status-pill { flex-shrink: 0; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 10px; }
.status-pill.is-waiting { background: #fff3cd; color: #8a6300; }
.status-pill.is-assigned { background: #dcf7e3; color: #1a7a3d; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.tag { background: #eee; color: #444; font-size: 11px; padding: 3px 8px; border-radius: 10px; }

.error-banner {
  margin: 0; padding: 10px 12px; border-radius: 8px; background: #fdecea;
  color: #b3261e; font-size: 12.5px;
}
.assigned-hint {
  margin: 0; padding: 10px 12px; border-radius: 8px; background: #fff3cd;
  color: #8a6300; font-size: 12.5px;
}

/* ---------- หัวข้อผู้สมัคร ---------- */
.applicants-head { display: flex; align-items: baseline; justify-content: space-between; margin-top: 4px; }
.applicants-head h2 { margin: 0; font-size: 13px; font-weight: 700; color: #111; }
.sort-hint { font-size: 11px; color: #999; }

/* ---------- รายการผู้สมัคร ---------- */
.applicant-list { display: flex; flex-direction: column; gap: 10px; }
.applicant-card { padding: 14px; }
.applicant-card.selected { outline: 2px solid #ffc93c; }
.applicant-head { display: flex; gap: 10px; align-items: flex-start; }
.avatar {
  flex-shrink: 0; width: 38px; height: 38px; border-radius: 50%; border: 1px solid #ddd;
  display: flex; align-items: center; justify-content: center; color: #555;
}
.applicant-body { flex: 1; min-width: 0; }
.name { margin: 0; font-size: 14px; font-weight: 700; color: #111; }
.rating-row { display: flex; align-items: center; gap: 4px; margin-top: 3px; }
.stars { color: #ddd; letter-spacing: 1px; font-size: 12px; }
.stars .filled { color: #ffc93c; }
.rating-value { font-size: 11.5px; font-weight: 700; color: #111; }
.rating-count { font-size: 11px; color: #999; }
.applicant-meta { flex-shrink: 0; text-align: right; }
.distance { display: block; font-size: 12.5px; font-weight: 700; color: #111; }
.applied-ago { font-size: 10.5px; color: #999; }

.applicant-actions { display: flex; gap: 8px; margin-top: 12px; }
.btn-details, .btn-select {
  flex: 1; min-height: 40px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.btn-details { background: #e5e5e5; border: none; color: #333; }
.btn-select { background: #ffc93c; border: none; color: #111; }
.btn-select:disabled { opacity: 0.5; cursor: not-allowed; }
.hired-pill {
  flex: 1; display: flex; align-items: center; justify-content: center;
  min-height: 40px; border-radius: 8px; background: #dcf7e3; color: #1a7a3d; font-size: 13px; font-weight: 700;
}

.empty { text-align: center; color: #888; margin-top: 20px; font-size: 14px; }

/* ---------- โมดัล (ยืนยัน / สำเร็จ) ---------- */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 30; padding: 24px;
}
.modal-card {
  width: 100%; max-width: 320px; background: #fff; border-radius: 14px; padding: 24px 20px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.check-circle {
  width: 56px; height: 56px; border-radius: 50%; background: #22c55e; color: #fff;
  display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
}
.check-circle svg { width: 28px; height: 28px; stroke-width: 3; }
.modal-title { margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #111; }
.modal-sub { margin: 0 0 20px; font-size: 12.5px; color: #888; }
.modal-card .btn-primary { width: 100%; }
.modal-actions { display: flex; gap: 10px; width: 100%; }
.modal-actions .btn-muted, .modal-actions .btn-primary { flex: 1; }
.btn-primary, .btn-muted {
  min-height: 44px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;
}
.btn-primary { background: #ffc93c; border: none; color: #111; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-muted { background: #e5e5e5; border: none; color: #333; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>