<script setup>
import UserAvatar from "../../components/UserAvatar.vue";
// FR-BROWSE-07: ดูสถานะใบสมัครที่ส่งไปแล้วของตนเอง (แท็บ Waiting = คิว JOB_WAITING)
// FR-TRACK-01/06: ดูงานที่กำลังดำเนินการ/เสร็จสิ้น/ยกเลิก และถืองานพร้อมกันได้อย่างน้อย 2 งาน
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
import { workflowLabels } from "../../services/workflowStatus";
import WorkerMyServicePostView from "./WorkerMyServicePostView.vue";

const router = useRouter();
const route = useRoute();
const viewMode = ref(route.query.view === "services" ? "services" : "jobs");
watch(() => route.query.view, value => { viewMode.value = value === 'services' ? 'services' : 'jobs'; });

const tabs = [
  { value: "waiting", label: "รอผู้ว่าจ้างเลือก" },
  { value: "in-progress", label: "กำลังดำเนินงาน" },
  { value: "disputed", label: "คำขอคืนเงิน" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "cancelled", label: "ยกเลิก" },
];
const activeTab = ref("waiting");
const loading = ref(true);
const errorMsg = ref("");

/* ---------- ข้อมูลงาน ---------- */
const jobs = ref([]);

let requestId = 0;
async function loadJobs({ background = false } = {}) {
  const currentRequest = ++requestId;
  if (!background) loading.value = true;
  errorMsg.value = "";
  if (!background) jobs.value = [];
  try {
    const { data } = await api.get("/jobs/my-as-worker", { params: { status: activeTab.value } });
    if (currentRequest !== requestId) return;
    jobs.value = data.map((j) => ({
      ...j,
      duration: j.scheduledAt ? new Date(j.scheduledAt).toLocaleString("th-TH") : "-",
    }));
  } catch (err) {
    if (currentRequest === requestId) errorMsg.value = err.response?.data?.message || "โหลดรายการงานไม่สำเร็จ";
  } finally {
    if (currentRequest === requestId) loading.value = false;
  }
}

onMounted(() => { if (viewMode.value === "jobs") loadJobs(); else loading.value = false; });
let refreshTimer;
onMounted(() => { refreshTimer = window.setInterval(() => { if (viewMode.value === 'jobs') loadJobs({ background: true }); }, 5000); });
onUnmounted(() => window.clearInterval(refreshTimer));
watch(activeTab, () => { if (viewMode.value === "jobs") loadJobs(); });
watch(viewMode, (mode) => { if (mode === "jobs") loadJobs(); });

const filteredJobs = computed(() => jobs.value); // backend กรองตาม tab ให้แล้วผ่าน query param

const statusMeta = {
  waiting: { label: "รอผู้ว่าจ้างเลือก", class: "gold" },
  "in-progress": { label: "กำลังดำเนินงาน", class: "purple" },
  assigned: { label: "ได้รับเลือกแล้ว", class: "purple" },
  in_progress: { label: "กำลังดำเนินงาน", class: "purple" },
  awaiting_confirmation: { label: "รอผู้ว่าจ้างยืนยัน", class: "gold" },
  completed: { label: "เสร็จสิ้น", class: "green" },
  cancelled: { label: "ยกเลิก", class: "red" },
  disputed: { label: "รอพิจารณาคืนเงิน", class: "gold" },
};

function formatMoney(value) {
  return value == null ? "ไม่ระบุค่าจ้าง" : `฿${Number(value).toLocaleString("th-TH")}`;
}

function openJob(job) {
  // Waiting is the original application detail (read-only after applying).
  // Assigned / active / completed / cancelled use the tracking detail.
  router.push(job.status === "waiting"
    ? `/worker/jobs/${job.id}`
    : `/worker/jobs/${job.id}/tracking`);
}
</script>

<template>
  <div class="page jd-page">
    <!-- แถบด้านบนแบบ sub-page -->
    <header class="topbar">
      <button class="icon-btn" aria-label="ย้อนกลับ" @click="router.back()">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="title">งานของฉัน</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>

    <main class="content">
      <nav class="section-tabs" aria-label="ประเภทงานของฉัน">
        <button :aria-pressed="viewMode === 'jobs'" type="button" :class="{ active: viewMode === 'jobs' }" @click="viewMode = 'jobs'">งานที่สมัคร</button>
        <button :aria-pressed="viewMode === 'services'" type="button" :class="{ active: viewMode === 'services' }" @click="viewMode = 'services'">บริการที่โพสต์</button>
      </nav>

      <WorkerMyServicePostView v-if="viewMode === 'services'" embedded />

      <template v-else>
      <!-- แท็บสถานะ -->
      <nav class="tabs">
        <button :aria-pressed="activeTab === t.value"
          v-for="t in tabs"
          :key="t.value"
          :class="{ active: activeTab === t.value }"
          @click="activeTab = t.value"
        >{{ t.label }}</button>
      </nav>

      <!-- รายการงาน -->
      <section class="job-list">
        <button
          v-for="job in filteredJobs"
          :key="job.id"
          type="button"
          class="job-row"
          :class="{ clickable: true }"
          @click="openJob(job)"
        >
          <span class="job-avatar"><UserAvatar :src="job.hirerAvatarUrl" :name="job.hirerName" /></span>
          <div class="job-body">
            <p v-if="job.hirerName" class="job-hirer">{{ job.hirerName }}</p>
            <p class="job-title">{{ job.title }}</p>
            <p class="job-meta">{{ formatMoney(job.price) }} &nbsp;•&nbsp; {{ job.duration }}</p>
          </div>
          <div class="job-right">
            <span class="status-tag" :class="(statusMeta[job.backendStatus] || statusMeta[job.status]).class">{{ ['disputed', 'refund_pending', 'refunded'].includes(job.paymentStatus) ? workflowLabels[job.paymentStatus] : (statusMeta[job.backendStatus] || statusMeta[job.status]).label }}</span>
            <svg class="chevron" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </button>

        <p v-if="loading" class="empty">กำลังโหลดรายการงาน...</p>
        <p v-else-if="errorMsg" class="error-msg" role="alert">{{ errorMsg }}</p>
        <p v-else-if="!filteredJobs.length" class="empty">ยังไม่มีงานในหมวดนี้</p>
      </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; background: var(--jd-canvas); }
svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

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

.section-tabs { display:flex; gap:8px; margin-bottom:14px; padding:4px; border:1px solid var(--jd-line); border-radius:11px; background:var(--jd-surface); }
.section-tabs button { flex:1; min-height: 44px; border:0; border-radius:8px; background:transparent; color:var(--jd-muted); font-size: 0.875rem; cursor:pointer; }
.section-tabs button.active { background:var(--jd-accent); color:var(--jd-ink); font-weight:700; }

/* ---------- Tabs ---------- */
.tabs {
  display: flex; gap: 8px; margin-bottom: 14px;
}
.tabs button {
  flex: 1; min-height: 44px; border: 1px solid var(--jd-line); border-radius: 10px;
  background: var(--jd-surface);
  font-size: 0.875rem; color: var(--jd-muted); cursor: pointer;
}
.tabs button.active { background: var(--jd-accent); color: var(--jd-ink); font-weight: 700; }

/* ---------- รายการงาน ---------- */
.job-list { display: flex; flex-direction: column; gap: 10px; }
.job-row {
  display: flex; align-items: center; gap: 10px; text-align: left;
  background: var(--jd-surface); border: none; border-radius: 12px; padding: 14px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); cursor: default; width: 100%;
}
.job-row.clickable { cursor: pointer; }
.job-avatar {
  flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--jd-input-border);
  display: flex; align-items: center; justify-content: center; color: var(--jd-muted);
}
.job-body { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 3px; }
.job-hirer { margin: 0; font-size: 0.875rem; line-height: 1.35; color: var(--jd-muted); }
.job-title { margin: 0; font-size: 0.875rem; line-height: 1.35; font-weight: 700; color: var(--jd-ink); }
.job-meta { margin: 0; font-size: 0.875rem; line-height: 1.35; color: var(--jd-muted); }
.job-right { flex-shrink: 0; display: flex; align-items: center; gap: 4px; }
.status-tag { font-size: 0.875rem; font-weight: 700; white-space: nowrap; }
.status-tag.gold { color: var(--jd-warning); }
.status-tag.purple { color: #6d5bd0; }
.status-tag.green { color: var(--jd-success); }
.status-tag.red { color: #e11d48; }
.chevron { width: 14px; height: 14px; color: var(--jd-input-border); }

.error-msg { color: #b91c1c; padding: 12px; text-align: center; font-size: 0.875rem; }
.empty { text-align: center; color: var(--jd-muted); margin-top: 40px; font-size: 0.875rem; }
</style>
