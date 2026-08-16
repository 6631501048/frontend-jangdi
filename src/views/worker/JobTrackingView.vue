<script setup>
// FR-TRACK-01: อัปเดตสถานะงานตามขั้นตอน (เริ่มงาน, กำลังดำเนินการ, ส่งหลักฐาน, เสร็จสิ้น)
// FR-TRACK-02: ผู้ว่าจ้างเห็นการอัปเดตสถานะแบบเรียลไทม์ (ฝั่ง backend/WebSocket)
// FR-TRACK-03: ต้องอัปโหลดรูปภาพหลักฐานเมื่อทำเครื่องหมายว่างานเสร็จแล้ว
// FR-TRACK-04: ผู้ว่าจ้างยืนยันงานเสร็จ → ปล่อยเงิน Escrow
// FR-TRACK-05: ทุกการเปลี่ยนสถานะถูกบันทึกลง JOB_LOG (immutable audit trail)
// FR-SOS-01/02/03: ผู้รับจ้างกดสัญญาณฉุกเฉินได้ระหว่างงาน กำลังดำเนินอยู่ ระบบบันทึกตำแหน่ง+ส่งถึง Admin ภายใน 1 นาที
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

/* ---------- ข้อมูลงาน ----------
   TODO: แทนที่ mock นี้ด้วย GET /api/jobs/{route.params.id} */
const job = ref({
  id: route.params.id,
  hirerName: "Thanawit",
  title: "Buy food from Hachikyuu",
  description: "I'm looking for someone to pick up food from Hachikyuu.",
  status: "in-progress", // "in-progress" | "completed" | "cancelled"
  details: "Fried rice x1",
  duration: "1 hr",
  price: 50,
  serviceFee: 20,
  from: "Hachikyuu",
  to: "Lamduan2",
  notes: "-",
  hirerPhone: "081-234-5678",
  hirerLine: "@ThanawitBunphom",
  timeline: [
    { key: "start", label: "Start", timestamp: "2 May 2026, 09:24 AM", done: true },
    { key: "in-progress", label: "In Progress", timestamp: "2 May 2026, 09:35 AM", done: true },
    { key: "proof", label: "Submit Proof (optional)", timestamp: null, done: false },
    { key: "complete", label: "Complete", timestamp: null, done: false },
  ],
  cancellation: null, // { by: "Hirer", reason: "..." } เฉพาะงานที่ถูกยกเลิก
});

const total = computed(() => job.value.price + job.value.serviceFee);

const statusMeta = {
  "in-progress": { label: "In Process", class: "purple" },
  completed: { label: "Completed", class: "green" },
  cancelled: { label: "Cancelled", class: "red" },
};

/* ---------- อัปเดตสถานะ / ส่งหลักฐาน ---------- */
const updating = ref(false);
function updateStatus() {
  // TODO FR-TRACK-01: PATCH /api/jobs/{job.id}/status { next: "..." }
  // TODO FR-TRACK-03: ถ้าขั้นตอนถัดไปคือ "เสร็จสิ้น" ต้องแนบไฟล์รูปภาพหลักฐานไปด้วย
  // TODO FR-TRACK-05: backend จะบันทึกทุกการเปลี่ยนสถานะลง JOB_LOG พร้อมประทับเวลา
  updating.value = true;
  setTimeout(() => {
    updating.value = false;
    alert("TODO: เปิดหน้าจอ/โมดัลอัปเดตสถานะถัดไป (แนบรูปหลักฐานถ้าจำเป็น)");
  }, 300);
}

/* ---------- SOS ---------- */
function sendSOS() {
  // TODO FR-SOS-01/02/03: POST /api/sos { jobId, location } — ต้องขอ Geolocation ก่อนส่ง
  // ต้องถึง Admin ภายใน 1 นาที (NFR-PERF-02)
  if (confirm("ยืนยันการส่งสัญญาณฉุกเฉิน (SOS) ใช่หรือไม่?")) {
    alert("TODO: ส่งสัญญาณ SOS พร้อมตำแหน่งปัจจุบันไปยัง Admin");
  }
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
      <div class="card">
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
          <span class="status-tag" :class="statusMeta[job.status].class">{{ statusMeta[job.status].label }}</span>
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
              <button class="contact-btn" @click="callHirer">
                <svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.5 2.1L8 9.7a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.9.3 1.8.5 2.7.6a2 2 0 011.7 2z" /></svg>
                <span>
                  <strong>{{ job.hirerPhone }}</strong>
                  <small>Phone call</small>
                </span>
              </button>
              <button class="contact-btn" @click="() => {}">
                <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M8 10h8M8 14h5" /></svg>
                <span>
                  <strong>{{ job.hirerLine }}</strong>
                  <small>LINE ID</small>
                </span>
              </button>
            </div>
          </div>

          <div class="status-sos-row">
            <ol class="timeline">
              <li v-for="step in job.timeline" :key="step.key" :class="{ done: step.done }">
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

          <button class="btn-primary" :disabled="updating" @click="updateStatus">
            {{ updating ? "Updating..." : "Update Status" }}
          </button>
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
                <dd>{{ job.cancellation?.reason || "I found someone else to do this job." }}</dd>
              </div>
            </dl>
          </div>
          <button class="btn-primary" @click="backToMyJobs">Back to My Job</button>
        </template>

        <!-- ===== Completed: แสดงรายละเอียดเฉย ๆ ไม่มี action เพิ่ม ===== -->
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
.timeline li.done .dot { background: #ffc93c; border-color: #ffc93c; }
.step-label { margin: 0; font-size: 11.5px; color: #999; }
.timeline li.done .step-label { color: #b8860b; font-weight: 700; }
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
</style>