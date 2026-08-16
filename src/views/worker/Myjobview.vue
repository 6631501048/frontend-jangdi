<script setup>
// FR-BROWSE-07: ดูสถานะใบสมัครที่ส่งไปแล้วของตนเอง (แท็บ Waiting = คิว JOB_WAITING)
// FR-TRACK-01/06: ดูงานที่กำลังดำเนินการ/เสร็จสิ้น/ยกเลิก และถืองานพร้อมกันได้อย่างน้อย 2 งาน
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const tabs = [
  { value: "waiting", label: "Waiting" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
const activeTab = ref("waiting");

/* ---------- ข้อมูลงาน ----------
   TODO: แทนที่ mock นี้ด้วย GET /api/jobs?worker=me&status={activeTab}
   - แท็บ Waiting: ใบสมัครที่ยังอยู่ในคิว JOB_WAITING ของงานนั้น ๆ (ยังไม่ถูกเลือก)
   - แท็บอื่น: งานที่ได้รับมอบหมายแล้ว (FR-MATCH-04) พร้อมชื่อผู้ว่าจ้าง */
const jobs = ref([
  {
    id: "w1",
    status: "waiting",
    title: "Laundry Washing",
    hirerName: null,
    price: 100,
    duration: "1:30 hour",
    distance: "534 m.",
  },
  {
    id: "w2",
    status: "waiting",
    title: "Buy food at D1",
    hirerName: null,
    price: 50,
    duration: "1 hour",
    distance: "2 km.",
  },
  {
    id: "j1",
    status: "in-progress",
    title: "Buy food from Hachikyuu",
    hirerName: "Thanawit",
    price: 50,
    duration: "30 Minutes",
    distance: "2 km.",
  },
  {
    id: "j2",
    status: "completed",
    title: "Buy food from Hachikyuu",
    hirerName: "Thanawit",
    price: 50,
    duration: "30 Minutes",
    distance: "2 km.",
  },
  {
    id: "j3",
    status: "cancelled",
    title: "Buy food from Hachikyuu",
    hirerName: "Thanawit",
    price: 50,
    duration: "30 Minutes",
    distance: "2 km.",
  },
]);

const filteredJobs = computed(() => jobs.value.filter((j) => j.status === activeTab.value));

const statusMeta = {
  waiting: { label: "Waiting for selection", class: "gold" },
  "in-progress": { label: "In Process", class: "purple" },
  completed: { label: "Completed", class: "green" },
  cancelled: { label: "Cancelled", class: "red" },
};

function openJob(job) {
  if (job.status === "waiting") return; // ยังไม่มีงานจริงให้ติดตามจนกว่าจะถูกเลือก (FR-MATCH-04)
  router.push(`/worker/jobs/${job.id}`);
}
</script>

<template>
  <div class="page">
    <!-- แถบด้านบนแบบ sub-page -->
    <header class="topbar">
      <button class="icon-btn" aria-label="ย้อนกลับ" @click="router.back()">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="title">My Job</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>

    <main class="content">
      <!-- แท็บสถานะ -->
      <nav class="tabs">
        <button
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
          :class="{ clickable: job.status !== 'waiting' }"
          @click="openJob(job)"
        >
          <span class="job-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
          </span>
          <div class="job-body">
            <p v-if="job.hirerName" class="job-hirer">{{ job.hirerName }}</p>
            <p class="job-title">{{ job.title }}</p>
            <p class="job-meta">{{ job.price }} Baht &nbsp;•&nbsp; {{ job.duration }} &nbsp;•&nbsp; {{ job.distance }}</p>
          </div>
          <div class="job-right">
            <span class="status-tag" :class="statusMeta[job.status].class">{{ statusMeta[job.status].label }}</span>
            <svg v-if="job.status !== 'waiting'" class="chevron" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </button>

        <p v-if="!filteredJobs.length" class="empty">ยังไม่มีงานในหมวดนี้</p>
      </section>
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

/* ---------- Tabs ---------- */
.tabs {
  display: flex; background: #fff; border-radius: 10px; overflow: hidden;
  border: 1px solid #eee; margin-bottom: 14px;
}
.tabs button {
  flex: 1; min-height: 40px; border: none; background: transparent;
  font-size: 12.5px; color: #555; cursor: pointer;
}
.tabs button.active { background: #ffc93c; color: #111; font-weight: 700; }

/* ---------- รายการงาน ---------- */
.job-list { display: flex; flex-direction: column; gap: 10px; }
.job-row {
  display: flex; align-items: center; gap: 10px; text-align: left;
  background: #fff; border: none; border-radius: 12px; padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); cursor: default; width: 100%;
}
.job-row.clickable { cursor: pointer; }
.job-avatar {
  flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; border: 1px solid #ddd;
  display: flex; align-items: center; justify-content: center; color: #555;
}
.job-body { flex: 1; min-width: 0; }
.job-hirer { margin: 0; font-size: 11px; color: #999; }
.job-title { margin: 1px 0; font-size: 13px; font-weight: 700; color: #111; }
.job-meta { margin: 0; font-size: 11px; color: #888; }
.job-right { flex-shrink: 0; display: flex; align-items: center; gap: 4px; }
.status-tag { font-size: 11px; font-weight: 700; white-space: nowrap; }
.status-tag.gold { color: #b8860b; }
.status-tag.purple { color: #6d5bd0; }
.status-tag.green { color: #1a9c4a; }
.status-tag.red { color: #e11d48; }
.chevron { width: 14px; height: 14px; color: #ccc; }

.empty { text-align: center; color: #888; margin-top: 40px; font-size: 14px; }
</style>