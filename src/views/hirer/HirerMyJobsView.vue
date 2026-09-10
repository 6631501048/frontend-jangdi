<script setup>
// FR-JOB-08: ดูงานที่ตนเองประกาศ จัดกลุ่มตามสถานะ
// เป็นจุดเข้าสู่หน้า "เลือกผู้รับจ้าง" (FR-MATCH-03/04) สำหรับงานที่เปิดรับสมัครอยู่
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import api from "../../services/api";

const router = useRouter();

const tabs = [
  { value: "waiting", label: "เปิดรับสมัคร" },
  { value: "assigned", label: "กำลังดำเนินการ" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "cancelled", label: "ยกเลิก" },
];
const activeTab = ref("waiting");
const jobs = ref([]);
const loading = ref(true);
const errorMsg = ref("");

async function loadJobs() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const { data } = await api.get("/jobs/my", { params: { status: activeTab.value } });
    jobs.value = data;
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "โหลดรายการงานไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}
onMounted(loadJobs);
watch(activeTab, loadJobs);

function openJob(job) {
  if (job.status === "waiting") {
    router.push(`/hirer/my-jobs/${job._id}/applicants`); // FR-MATCH-03
  } else {
    router.push(`/hirer/my-jobs/${job._id}`); // ดูรายละเอียด/ติดตามงานของตัวเอง
  }
}

function goBack() {
  router.back();
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <button class="icon-btn" aria-label="ย้อนกลับ" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="title">My Jobs</h1>
      <span class="spacer"></span>
    </header>

    <nav class="tabs">
      <button v-for="t in tabs" :key="t.value" :class="{ active: activeTab === t.value }" @click="activeTab = t.value">
        {{ t.label }}
      </button>
    </nav>

    <main class="content">
      <p v-if="loading" class="hint">กำลังโหลด...</p>
      <p v-else-if="errorMsg" class="error">{{ errorMsg }}</p>
      <p v-else-if="!jobs.length" class="hint">ยังไม่มีงานในสถานะนี้</p>

      <article v-for="job in jobs" :key="job._id" class="card" @click="openJob(job)">
        <div class="card-body">
          <p class="title-text">{{ job.title }}</p>
          <p class="desc">{{ job.description }}</p>
          <div class="tags">
            <span class="tag">฿{{ job.price }}</span>
            <span class="tag">{{ job.category }}</span>
          </div>
        </div>
        <span v-if="job.status === 'waiting'" class="cta">ดูผู้สมัคร ›</span>
        <span v-else class="cta muted">รายละเอียด ›</span>
      </article>
    </main>
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; background: #f0f0f0; }
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #fff; position: sticky; top: 0; z-index: 10; border-bottom: 1px solid #eee; }
.icon-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: none; background: transparent; border-radius: 50%; color: #111; cursor: pointer; }
.title { margin: 0; font-size: 15px; font-weight: 700; color: #111; }
.spacer { width: 40px; }

.tabs { display: flex; gap: 6px; overflow-x: auto; padding: 10px 12px; background: #fff; border-bottom: 1px solid #eee; }
.tabs button { flex-shrink: 0; min-height: 36px; padding: 6px 14px; border-radius: 20px; border: 1px solid #ddd; background: #fff; font-size: 12.5px; color: #555; cursor: pointer; }
.tabs button.active { background: #ffc93c; border-color: #ffc93c; color: #111; font-weight: 700; }

.content { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.hint, .error { text-align: center; color: #888; margin-top: 24px; font-size: 13px; }
.error { color: #e11d48; }

.card { display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 12px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; }
.card-body { flex: 1; min-width: 0; }
.title-text { margin: 0; font-size: 14px; font-weight: 700; color: #111; }
.desc { margin: 4px 0 8px; font-size: 12.5px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tags { display: flex; gap: 6px; }
.tag { background: #eee; color: #444; font-size: 11px; padding: 3px 8px; border-radius: 10px; }
.cta { flex-shrink: 0; font-size: 12.5px; font-weight: 700; color: #d99a00; }
.cta.muted { color: #999; }
</style>