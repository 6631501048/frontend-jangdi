<script setup>
// FR-JOB-01/08, FR-TRACK-02/03/04, FR-SOS-01, FR-JOB-07: รายละเอียดงานของ Hirer ปรับเนื้อหาตามสถานะ
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHirerJobsStore } from "../../stores/hirerJobs";
import AppHeader from "../../components/AppHeader.vue";
import StatusBadge from "../../components/StatusBadge.vue";

const route = useRoute();
const router = useRouter();
const store = useHirerJobsStore();

const job = computed(() => store.byId(route.params.id));

function goApplicants() {
  router.push({ name: "hirer-applicants", params: { id: job.value.id } });
}
function goRefund() {
  router.push({ name: "hirer-refund", params: { id: job.value.id } });
}
function goReview() {
  router.push({ name: "hirer-review", params: { id: job.value.id } });
}
function confirmCompletion() {
  // FR-TRACK-04: ยืนยันงานเสร็จหลังตรวจสอบรูปหลักฐาน -> ปล่อยเงินจาก escrow
  store.confirmCompletion(job.value.id);
}
function sendSos() {
  // FR-SOS-01/02/03: ปุ่มนี้ใช้งานฝั่ง Worker เป็นหลัก แต่ Hirer เห็นสถานะ/ติดต่อฉุกเฉินได้เช่นกัน
  alert("TODO: POST /api/sos { jobId } (FR-SOS-01/02/03)");
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

      <!-- FR-JOB-08 / FR-MATCH-03: ยังไม่เลือกช่าง ให้ดูผู้สมัครได้ -->
      <button v-if="job.status === 'waiting'" class="btn primary" @click="goApplicants">
        View Applicants ({{ job.applicants.length }})
      </button>

      <!-- FR-TRACK-01/02/03, FR-SOS-01: งานกำลังดำเนินการ -->
      <template v-if="job.status === 'in_progress'">
        <h2 class="section-title">Contact</h2>
        <div class="contact-row">
          <a class="contact-btn" :href="`tel:${job.selectedWorker?.phone || ''}`">
            📞 <span>{{ job.selectedWorker?.name }}<br /><small>Phone call</small></span>
          </a>
          <button class="contact-btn" @click="alert('TODO: เปิดหน้าแชท (FR-NOTIF-01)')">
            💬 <span>Message<br /><small>Chat</small></span>
          </button>
        </div>

        <div class="progress-sos">
          <ol class="timeline">
            <li v-for="(t, i) in job.timeline" :key="i" :class="{ done: t.done, current: t.current }">
              <span class="dot" />
              <div>
                <div class="t-label">{{ t.label }}</div>
                <div class="t-time">{{ t.time }}</div>
              </div>
            </li>
          </ol>
          <div class="sos-box">
            <div class="sos-title">🆘 SOS Emergency</div>
            <p>If you feel unsafe or something is wrong with this task, alert our Admin team immediately.</p>
            <button class="btn danger" @click="sendSos">Tap to Send SOS</button>
          </div>
        </div>

        <button
          v-if="job.proofPhoto || true"
          class="btn primary"
          @click="confirmCompletion"
        >Confirm Job Completed</button>

        <div class="actions">
          <button class="btn outline" @click="goRefund">Cancel</button>
          <button class="btn danger" @click="goRefund">Refund</button>
        </div>
      </template>

      <!-- FR-REV-01, FR-PAY-06: งานเสร็จแล้ว รีวิวได้ / ขอคืนเงินได้ -->
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
  min-height: 44px; text-decoration: none; color: #111; cursor: pointer;
}
.progress-sos { display: flex; gap: 16px; margin: 16px 0; flex-wrap: wrap; }
.timeline { list-style: none; margin: 0; padding: 0; flex: 1; min-width: 130px; }
.timeline li { display: flex; gap: 10px; align-items: flex-start; padding-bottom: 18px; position: relative; }
.timeline li::before { content: ""; position: absolute; left: 5px; top: 16px; bottom: -2px; width: 2px; background: #e5e7eb; }
.timeline li:last-child::before { display: none; }
.timeline .dot { width: 12px; height: 12px; border-radius: 50%; background: #e5e7eb; margin-top: 2px; flex-shrink: 0; }
.timeline li.done .dot { background: #fbbf24; }
.t-label { font-size: 12px; font-weight: 500; }
.timeline li.current .t-label { color: #d97706; font-weight: 700; }
.t-time { font-size: 11px; color: #aaa; }
.sos-box { flex: 1; min-width: 160px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px; }
.sos-title { color: #dc2626; font-weight: 700; margin-bottom: 6px; font-size: 13px; }
.sos-box p { font-size: 11px; color: #7f1d1d; margin: 0 0 10px; }
.btn { width: 100%; min-height: 44px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-top: 10px; border: 1px solid #e5e7eb; background: white; cursor: pointer; }
.btn.primary { background: #fbbf24; color: #78350f; border: none; }
.btn.danger { background: #ef4444; color: white; border: none; }
.btn.outline { background: white; color: #555; }
.actions { display: flex; gap: 10px; }
.actions .btn { margin-top: 16px; }
.placeholder { padding: 16px; color: #888; }
</style>