<script setup>
// FR-BROWSE-03: ดูรายละเอียดงานแบบเต็ม (คำอธิบาย ราคา ตำแหน่งที่ตั้ง ระยะเวลา หมายเหตุ) ก่อนสมัคร
// FR-BROWSE-04: สมัครงาน โดยเพิ่มใบสมัครเข้าสู่คิวรอของงานนั้น (JOB_WAITING)
// FR-BROWSE-05: อนุญาตให้สมัครหลายงานพร้อมกันได้
// FR-BROWSE-06: ห้ามสมัคร Service Post ของตนเอง หรืองานที่เลือกผู้รับจ้างแล้ว (backend ตรวจสอบจริง)
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const errorMsg = ref("");

/* ---------- ข้อมูลงาน ---------- */
const job = ref({
  id: route.params.id,
  hirerName: "",
  title: "",
  backendStatus: "waiting",
  description: "",
  category: "",
  locationText: "-",
  deliveryFee: 0,
  price: 0,
  scheduledAt: null,
  durationStart: null,
  durationEnd: null,
  from: "-",
  to: "-",
  notes: "-",
});

async function loadJob() {
  loading.value = true;
  try {
    const { data } = await api.get(`/jobs/${route.params.id}`);
    // An existing application must stay visible after page refresh.
    try {
      const { data: applications } = await api.get("/jobs/my-as-worker", { params: { status: "waiting" } });
      alreadyApplied.value = applications.some((application) => String(application.id) === String(data._id));
    } catch {
      // Do not enable a duplicate action when application state cannot be confirmed.
      errorMsg.value = "ไม่สามารถตรวจสถานะการสมัครงานได้ กรุณาลองใหม่อีกครั้ง";
    }
    job.value = {
      id: data._id,
      hirerName: data.hirer?.fullName || "ผู้ว่าจ้าง",
      title: data.title || "ไม่มีชื่อประกาศ",
      backendStatus: data.status,
      description: data.description || "ไม่ได้ระบุรายละเอียด",
      category: data.category,
      locationText: data.locationText || data.fromText || "-",
      deliveryFee: Number(data.deliveryFee || 0),
      price: data.price == null ? null : Number(data.price),
      scheduledAt: data.scheduledAt,
      durationStart: data.durationStart,
      durationEnd: data.durationEnd,
      from: data.fromText || data.locationText || "-",
      to: data.toText || "-",
      notes: data.notes || "ไม่มีหมายเหตุเพิ่มเติม",
    };
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "โหลดรายละเอียดงานไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}
onMounted(loadJob);

const applying = ref(false);
const applied = ref(false);
const alreadyApplied = ref(false);
const durationHours = computed(() => {
  if (!job.value.durationStart || !job.value.durationEnd) return null;
  const hours = (new Date(job.value.durationEnd) - new Date(job.value.durationStart)) / 3600000;
  return Number.isFinite(hours) && hours > 0 ? Number.isInteger(hours) ? hours : Number(hours.toFixed(1)) : null;
});
const scheduledLabel = computed(() => job.value.scheduledAt ? new Date(job.value.scheduledAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "-");

async function applyForJob() {
  applying.value = true;
  errorMsg.value = "";
  try {
    await api.post(`/jobs/${job.value.id}/apply`); // FR-BROWSE-04
    applied.value = true;
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "สมัครงานไม่สำเร็จ";
  } finally {
    applying.value = false;
  }
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
  <div class="page jd-page">
    <!-- แถบด้านบนแบบ sub-page -->
    <header class="topbar">
      <button class="icon-btn" aria-label="ย้อนกลับ" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="title">รายละเอียดงาน</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>

    <main class="content">
      <p v-if="loading" class="loading-hint">กำลังโหลด...</p>
      <p v-if="errorMsg && loading === false && !job.title" class="error-msg" role="alert">{{ errorMsg }}</p>
      <div v-if="!loading && job.title" class="card">
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
        <section v-if="alreadyApplied" class="success">
          <p class="success-title">รอผู้ว่าจ้างเลือกผู้รับจ้าง</p>
          <p class="success-sub">คุณสมัครงานนี้แล้ว</p>
          <button class="btn-view-request" @click="viewMyRequest">กลับไปงานของฉัน</button>
        </section>
        <section v-else-if="applied" class="success">
          <div class="check-circle">
            <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <p class="success-title">ส่งใบสมัครเรียบร้อยแล้ว</p>
          <p class="success-sub">กรุณารอผู้ว่าจ้างเลือกผู้รับจ้าง</p>
          <button class="btn-view-request" @click="viewMyRequest">ดูใบสมัครของฉัน</button>
        </section>

        <!-- ===== รายละเอียดงาน + ปุ่มสมัคร ===== -->
        <template v-else>
          <dl class="detail-list">
            <div class="detail-row"><dt>ประเภทงาน</dt><dd>{{ job.category }}</dd></div>
            <div v-if="job.category !== 'delivery'" class="detail-row">
              <dt>สถานที่ทำงาน</dt>
              <dd>{{ job.locationText }}</dd>
            </div>
            <div v-if="job.category === 'delivery' && job.deliveryFee" class="detail-row">
              <dt>ค่าจัดส่ง</dt>
              <dd>{{ job.deliveryFee.toLocaleString("th-TH") }} บาท</dd>
            </div>
            <div class="detail-row">
              <dt>ค่าจ้าง</dt>
              <dd>{{ job.price == null ? "ไม่ได้ระบุ" : `${job.price.toLocaleString("th-TH")} บาท` }}</dd>
            </div>
            <div class="detail-row">
              <dt>เวลานัดหมาย</dt>
              <dd>{{ scheduledLabel }}</dd>
            </div>
            <div v-if="durationHours" class="detail-row"><dt>ระยะเวลาทำงาน</dt><dd>{{ durationHours }} ชั่วโมง</dd></div>
          </dl>

          <div v-if="job.category === 'delivery'" class="route-row">
            <div class="route-col">
              <p class="route-label">จาก</p>
              <p class="route-value">{{ job.from }}</p>
            </div>
            <div class="route-col">
              <p class="route-label">ถึง</p>
              <p class="route-value">{{ job.to }}</p>
            </div>
          </div>

          <div class="notes-row">
            <p class="notes-label">หมายเหตุเพิ่มเติม</p>
            <p class="notes-value">{{ job.notes }}</p>
          </div>

          <p v-if="job.backendStatus !== 'waiting'" class="error-msg">งานนี้ปิดรับสมัครแล้ว</p>
          <button v-else class="btn-apply" :disabled="applying || loading || !!errorMsg" @click="applyForJob">
            {{ applying ? "กำลังสมัคร…" : "สมัครงานนี้" }}
          </button>
          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; background: var(--jd-canvas); }
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

/* ---------- Top bar (sub-page) ---------- */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; background: var(--jd-surface); position: sticky; top: 0; z-index: 10;
  border-bottom: 1px solid var(--jd-line);
}
.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border: none; background: transparent;
  border-radius: 50%; color: var(--jd-ink); cursor: pointer;
}
.title { margin: 0; font-size: 0.9375rem; font-weight: 700; color: var(--jd-ink); }
.spacer { width: 40px; }

.content { padding: 16px; }
.card { background: var(--jd-surface); border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }

/* ---------- หัวข้องาน ---------- */
.job-head { display: flex; gap: 10px; padding-bottom: 12px; border-bottom: 1px solid var(--jd-subtle); margin-bottom: 12px; }
.job-avatar {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--jd-input-border);
  display: flex; align-items: center; justify-content: center; color: var(--jd-muted);
}
.hirer-name { margin: 0; font-size: 0.875rem; color: var(--jd-muted); }
.job-title { margin: 2px 0; font-size: 0.875rem; font-weight: 700; color: var(--jd-ink); }
.job-desc { margin: 0; font-size: 0.875rem; color: var(--jd-muted); }

/* ---------- รายละเอียด ---------- */
.detail-list { margin: 0; display: flex; flex-direction: column; }
.detail-row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid var(--jd-subtle); }
.detail-row dt { font-size: 0.875rem; color: var(--jd-muted); }
.detail-row dd { margin: 0; font-size: 0.875rem; color: var(--jd-ink); font-weight: 600; }

.route-row { display: flex; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--jd-subtle); }
.route-col { flex: 1; min-width: 0; }
.route-label { margin: 0; font-size: 0.875rem; color: var(--jd-muted); }
.route-value { margin: 2px 0 0; font-size: 0.875rem; font-weight: 600; color: var(--jd-ink); }

.notes-row { padding: 12px 0; }
.notes-label { margin: 0; font-size: 0.875rem; color: var(--jd-muted); }
.notes-value { margin: 2px 0 0; font-size: 0.875rem; color: var(--jd-ink); }

.btn-apply {
  width: 100%; min-height: 46px; margin-top: 6px; border: none; border-radius: 10px;
  background: var(--jd-accent); color: var(--jd-ink); font-size: 0.875rem; font-weight: 700; cursor: pointer;
}
.btn-apply:disabled { opacity: 0.6; cursor: not-allowed; }
.loading-hint { text-align: center; color: var(--jd-muted); }
.error-msg { margin: 8px 0 0; font-size: 0.875rem; color: #e11d48; text-align: center; }

/* ---------- หน้าจอสำเร็จ ---------- */
.success { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24px 4px 4px; }
.check-circle {
  width: 64px; height: 64px; border-radius: 50%; background: #22c55e; color: var(--jd-surface);
  display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
}
.check-circle svg { width: 32px; height: 32px; stroke-width: 3; }
.success-title { margin: 0 0 4px; font-size: 0.875rem; font-weight: 700; color: var(--jd-ink); }
.success-sub { margin: 0 0 24px; font-size: 0.875rem; color: var(--jd-muted); }
.btn-view-request {
  width: 100%; min-height: 46px; border: none; border-radius: 10px;
  background: #22c55e; color: var(--jd-surface); font-size: 0.875rem; font-weight: 700; cursor: pointer;
}
</style>

