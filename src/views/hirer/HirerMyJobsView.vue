<script setup>
import { useRouteChoice } from "../../composables/useRouteChoice";
import { usePageNavigation } from "../../composables/usePageNavigation";
// FR-JOB-08: ดูงานที่ตนเองประกาศ จัดกลุ่มตามสถานะ
// เป็นจุดเข้าสู่หน้า "เลือกผู้รับจ้าง" (FR-MATCH-03/04) สำหรับงานที่เปิดรับสมัครอยู่
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import api from "../../services/api";
import { workflowLabels } from "../../services/workflowStatus";
import HirerServiceRequests from '../../components/HirerServiceRequests.vue';
const { goBack: navigateBack } = usePageNavigation();

const router = useRouter();
const route = useRoute();
const viewMode = useRouteChoice("view", ["jobs", "services"], "jobs");

const tabs = [
  { value: "pending_review", label: "รอตรวจสอบ" },
  { value: "waiting", label: "เปิดรับสมัคร" },
  { value: "assigned", label: "กำลังดำเนินการ" },
  { value: "disputed", label: "รอคืนเงิน" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "cancelled", label: "ยกเลิก" },
  { value: "rejected", label: "ถูกปฏิเสธ" },
];
const activeTab = useRouteChoice("status", tabs.map(tab => tab.value), "pending_review");
const jobs = ref([]);
const loading = ref(true);
const errorMsg = ref("");

let requestId = 0;
async function loadJobs({ background = false } = {}) {
  const currentRequest = ++requestId;
  if (!background) loading.value = true;
  errorMsg.value = "";
  if (!background) jobs.value = [];
  try {
    const { data } = await api.get("/jobs/my", { params: { status: activeTab.value } });
    if (currentRequest === requestId) jobs.value = data;
  } catch (err) {
    if (currentRequest === requestId) errorMsg.value = err.response?.data?.message || "โหลดรายการงานไม่สำเร็จ";
  } finally {
    if (currentRequest === requestId) loading.value = false;
  }
}
onMounted(() => { if (viewMode.value === 'jobs') loadJobs(); });
watch(activeTab, () => { if (viewMode.value === 'jobs') loadJobs(); });
watch(viewMode, value => { if (value === 'jobs') loadJobs(); });
let refreshTimer;
onMounted(() => { refreshTimer = window.setInterval(() => { if (viewMode.value === 'jobs') loadJobs({ background: true }); }, 5000); });
onUnmounted(() => window.clearInterval(refreshTimer));

function openJob(job) {
  if (job.status === "waiting") {
    router.push(`/hirer/my-jobs/${job._id}/applicants`); // FR-MATCH-03
  } else {
    router.push(`/hirer/my-jobs/${job._id}`); // ดูรายละเอียด/ติดตามงานของตัวเอง
  }
}

function goBack() {
  navigateBack();
}
</script>

<template>
  <div class="page jd-page">
    <header class="topbar">
      <button class="icon-btn" aria-label="ย้อนกลับ" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="title">งานของฉัน</h1>
      <span class="spacer"></span>
    </header>

    <nav class="section-tabs" aria-label="ประเภทงานของฉัน">
      <button :aria-pressed="viewMode === 'jobs'" type="button" :class="{ active: viewMode === 'jobs' }" @click="viewMode = 'jobs'">งานที่ประกาศ</button>
      <button :aria-pressed="viewMode === 'services'" type="button" :class="{ active: viewMode === 'services' }" @click="viewMode = 'services'">คำขอใช้บริการ</button>
    </nav>
    <HirerServiceRequests v-if="viewMode === 'services'" class="service-history" />
    <template v-else>
    <nav class="tabs">
      <button :aria-pressed="activeTab === t.value" v-for="t in tabs" :key="t.value" :class="{ active: activeTab === t.value }" @click="activeTab = t.value">
        {{ t.label }}
      </button>
    </nav>

    <main class="content">
      <p v-if="loading" class="hint">กำลังโหลด...</p>
      <p v-else-if="errorMsg" class="error">{{ errorMsg }}</p>
      <p v-else-if="!jobs.length" class="hint">ยังไม่มีงานในสถานะนี้</p>

      <article v-for="job in jobs" :key="job._id" class="card" role="link" tabindex="0" @keydown.enter.self="openJob(job)" @click="openJob(job)">
        <div class="card-body">
          <p class="title-text">{{ job.title }}</p>
          <p class="desc">{{ job.description }}</p>
          <p v-if="job.status === 'pending_review'" class="status-note pending">⏳ รอ Admin ตรวจสอบก่อนเปิดรับสมัคร</p>
          <p v-if="job.status === 'rejected'" class="status-note rejected">✕ {{ job.rejectionReason || "ไม่ผ่านการตรวจสอบเนื้อหา" }}</p>
          <p v-if="job.status === 'awaiting_confirmation'" class="status-note pending">มีหลักฐานรอให้คุณตรวจสอบและยืนยันงานเสร็จ</p>
          <p v-if="['disputed', 'refund_pending', 'refunded'].includes(job.paymentStatus)" class="status-note pending">{{ workflowLabels[job.paymentStatus] }}</p>
          <div class="tags">
            <span class="tag">฿{{ job.price }}</span>
            <span class="tag">{{ job.category }}</span>
          </div>
        </div>
        <span v-if="job.status === 'waiting'" class="cta">ดูผู้สมัคร ›</span>
        <span v-else class="cta muted">รายละเอียด ›</span>
      </article>
    </main>
    </template>
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; background: var(--jd-canvas); }
.section-tabs{display:flex;gap:8px;padding:12px;background:var(--jd-surface)}.section-tabs button{flex:1;min-height: 44px;border:1px solid var(--jd-input-border);border-radius:10px;background:var(--jd-surface);cursor:pointer}.section-tabs button.active{background:var(--jd-accent);border-color: var(--jd-warning);font-weight:700}.service-history{padding:16px}
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--jd-surface); position: sticky; top: 0; z-index: 10; border-bottom: 1px solid var(--jd-line); }
.icon-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: none; background: transparent; border-radius: 50%; color: var(--jd-ink); cursor: pointer; }
.title { margin: 0; font-size: 0.9375rem; font-weight: 700; color: var(--jd-ink); }
.spacer { width: 40px; }

.tabs { display: flex; gap: 6px; overflow-x: auto; padding: 10px 12px; background: var(--jd-surface); border-bottom: 1px solid var(--jd-line); }
.tabs button { flex-shrink: 0; min-height: 44px; padding: 6px 14px; border-radius: 20px; border: 1px solid var(--jd-input-border); background: var(--jd-surface); font-size: 0.875rem; color: var(--jd-muted); cursor: pointer; }
.tabs button.active { background: var(--jd-accent); border-color: var(--jd-warning); color: var(--jd-ink); font-weight: 700; }

.content { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.hint, .error { text-align: center; color: var(--jd-muted); margin-top: 24px; font-size: 0.875rem; }
.error { color: #e11d48; }

.card { display: flex; align-items: center; gap: 10px; background: var(--jd-surface); border-radius: 12px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; }
.card-body { flex: 1; min-width: 0; }
.title-text { margin: 0; font-size: 0.875rem; font-weight: 700; color: var(--jd-ink); }
.desc { margin: 4px 0 8px; font-size: 0.875rem; color: var(--jd-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-note { margin: 0 0 8px; font-size: 0.875rem; }
.status-note.pending { color: #b45309; }
.status-note.rejected { color: #b91c1c; }
.tags { display: flex; gap: 6px; }
.tag { background: var(--jd-line); color: var(--jd-muted); font-size: 0.875rem; padding: 3px 8px; border-radius: 10px; }
.cta { flex-shrink: 0; font-size: 0.875rem; font-weight: 700; color: var(--jd-warning); }
.cta.muted { color: var(--jd-muted); }
</style>
