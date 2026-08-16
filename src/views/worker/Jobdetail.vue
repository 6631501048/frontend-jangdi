<script setup>
// FR-BROWSE-03: ดูรายละเอียดงานแบบเต็ม (คำอธิบาย ราคา ตำแหน่งที่ตั้ง ระยะเวลา หมายเหตุ) ก่อนสมัคร
// FR-BROWSE-04: สมัครงาน โดยเพิ่มใบสมัครเข้าสู่คิวรอของงานนั้น (JOB_WAITING)
// FR-BROWSE-05: อนุญาตให้สมัครหลายงานพร้อมกันได้
// FR-BROWSE-06: ห้ามสมัคร Service Post ของตนเอง หรืองานที่เลือกผู้รับจ้างแล้ว (เช็คจริงตอนเรียก API)
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

/* ---------- ข้อมูลงาน ----------
   TODO: แทนที่ mock นี้ด้วย GET /api/jobs/{route.params.id} (FR-BROWSE-03) */
const job = ref({
  id: route.params.id,
  hirerName: "Thanawit",
  title: "Buy Fresh Fruit from Bo Market",
  description: "อยากได้คนช่วยไปซื้อผลไม้สดที่ตลาดโบใกล้ประตูมหาวิทยาลัย แล้วนำมาส่งที่หอพัก",
  category: "delivery",
  deliveryFee: 20,
  price: 50,
  duration: "1 ชม.",
  from: "MFU Market",
  to: "หอพักลำดวน 3",
  notes: "None",
});

const applying = ref(false);
const applied = ref(false);

function applyForJob() {
  // TODO FR-BROWSE-04: POST /api/jobs/{job.id}/apply → เพิ่มใบสมัครเข้าคิว JOB_WAITING
  // TODO FR-BROWSE-06: backend ต้องปฏิเสธถ้าเป็นประกาศของตนเอง หรือมีการเลือกผู้รับจ้างไปแล้ว
  applying.value = true;
  setTimeout(() => {
    applying.value = false;
    applied.value = true;
  }, 400);
}

function viewMyRequest() {
  // FR-BROWSE-07: ไปหน้าดูสถานะใบสมัครของตนเอง (งานของฉัน)
  router.push("/worker/jobs");
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
      <h1 class="title">Job Details</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>

    <main class="content">
      <div class="card">
        <!-- หัวข้อ: ผู้ว่าจ้าง + ชื่องาน + คำอธิบาย -->
        <div class="job-head">
          <span class="job-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
          </span>
          <div>
            <p class="hirer-name">{{ job.hirerName }}</p>
            <p class="job-title">{{ job.title }}</p>
            <p class="job-desc">{{ job.description }}</p>
          </div>
        </div>

        <!-- ===== หน้าจอสำเร็จหลังสมัคร ===== -->
        <section v-if="applied" class="success">
          <div class="check-circle">
            <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <p class="success-title">Your request has been submitted successfully</p>
          <p class="success-sub">Please wait for the hirer to select you.</p>
          <button class="btn-view-request" @click="viewMyRequest">View My Request</button>
        </section>

        <!-- ===== รายละเอียดงาน + ปุ่มสมัคร ===== -->
        <template v-else>
          <dl class="detail-list">
            <div class="detail-row">
              <dt>Details</dt>
              <dd>{{ job.from }}</dd>
            </div>
            <div class="detail-row">
              <dt>Delivery fee</dt>
              <dd>{{ job.deliveryFee }} Baht</dd>
            </div>
            <div class="detail-row">
              <dt>Price</dt>
              <dd>{{ job.price }} Baht</dd>
            </div>
            <div class="detail-row">
              <dt>Time</dt>
              <dd>{{ job.duration }}</dd>
            </div>
          </dl>

          <div class="route-row">
            <div class="route-col">
              <p class="route-label">From</p>
              <p class="route-value">{{ job.from }}</p>
            </div>
            <div class="route-col">
              <p class="route-label">To</p>
              <p class="route-value">{{ job.to }}</p>
            </div>
          </div>

          <div class="notes-row">
            <p class="notes-label">Additional Notes</p>
            <p class="notes-value">{{ job.notes }}</p>
          </div>

          <button class="btn-apply" :disabled="applying" @click="applyForJob">
            {{ applying ? "Applying..." : "Apply for the job" }}
          </button>
        </template>
      </div>
    </main>
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

.content { padding: 16px; }
.card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }

/* ---------- หัวข้องาน ---------- */
.job-head { display: flex; gap: 10px; padding-bottom: 12px; border-bottom: 1px solid #f2f2f2; margin-bottom: 12px; }
.job-avatar {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; border: 1px solid #ddd;
  display: flex; align-items: center; justify-content: center; color: #555;
}
.hirer-name { margin: 0; font-size: 12px; color: #999; }
.job-title { margin: 2px 0; font-size: 14px; font-weight: 700; color: #111; }
.job-desc { margin: 0; font-size: 12px; color: #777; }

/* ---------- รายละเอียด ---------- */
.detail-list { margin: 0; display: flex; flex-direction: column; }
.detail-row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #f2f2f2; }
.detail-row dt { font-size: 12px; color: #999; }
.detail-row dd { margin: 0; font-size: 13px; color: #111; font-weight: 600; }

.route-row { display: flex; gap: 16px; padding: 12px 0; border-bottom: 1px solid #f2f2f2; }
.route-col { flex: 1; min-width: 0; }
.route-label { margin: 0; font-size: 11px; color: #999; }
.route-value { margin: 2px 0 0; font-size: 13px; font-weight: 600; color: #111; }

.notes-row { padding: 12px 0; }
.notes-label { margin: 0; font-size: 11px; color: #999; }
.notes-value { margin: 2px 0 0; font-size: 13px; color: #333; }

.btn-apply {
  width: 100%; min-height: 46px; margin-top: 6px; border: none; border-radius: 10px;
  background: #ffc93c; color: #111; font-size: 14px; font-weight: 700; cursor: pointer;
}
.btn-apply:disabled { opacity: 0.6; cursor: not-allowed; }

/* ---------- หน้าจอสำเร็จ ---------- */
.success { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24px 4px 4px; }
.check-circle {
  width: 64px; height: 64px; border-radius: 50%; background: #22c55e; color: #fff;
  display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
}
.check-circle svg { width: 32px; height: 32px; stroke-width: 3; }
.success-title { margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #111; }
.success-sub { margin: 0 0 24px; font-size: 12px; color: #999; }
.btn-view-request {
  width: 100%; min-height: 46px; border: none; border-radius: 10px;
  background: #22c55e; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer;
}
</style>