<script setup>
// FR-MATCH-03: ผู้ว่าจ้างดูรายชื่อผู้สมัครทั้งหมดของงานตนเอง (รูปโปรไฟล์ ชื่อ คะแนนความน่าเชื่อถือ ระยะทาง)
// FR-MATCH-04: เลือกผู้รับจ้างหนึ่งคนจากรายชื่อผู้สมัคร
// FR-MATCH-05/06: ผู้สมัครรายอื่นถูกทำเครื่องหมายไม่ได้รับเลือกอัตโนมัติ + แจ้งเตือนผู้ที่ได้รับเลือก (ฝั่ง backend)
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";

const route = useRoute();
const router = useRouter();

const job = ref(null);
const applicants = ref([]);
const loading = ref(true);
const errorMsg = ref("");
const selecting = ref(null); // เก็บ workerId ที่กำลังกดเลือกอยู่ (กันกดซ้ำ)

function resolveAvatar(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
  return apiBase.replace(/\/api\/?$/, "") + pathOrUrl;
}

async function load() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const [jobRes, applicantsRes] = await Promise.all([
      api.get(`/jobs/${route.params.id}`),
      api.get(`/jobs/${route.params.id}/applicants`),
    ]);
    job.value = jobRes.data;
    applicants.value = applicantsRes.data;
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "โหลดรายชื่อผู้สมัครไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}
onMounted(load);

async function selectWorker(applicant) {
  if (!confirm(`ยืนยันเลือก ${applicant.worker.fullName || "ผู้สมัครคนนี้"} ทำงานนี้?`)) return;

  selecting.value = applicant.worker._id;
  errorMsg.value = "";
  try {
    await api.post(`/jobs/${route.params.id}/select-worker`, { workerId: applicant.worker._id });
    alert("เลือกผู้รับจ้างสำเร็จ");
    router.push("/hirer/my-jobs");
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "เลือกผู้รับจ้างไม่สำเร็จ";
  } finally {
    selecting.value = null;
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
      <h1 class="title">ผู้สมัครงาน</h1>
      <span class="spacer"></span>
    </header>

    <main class="content">
      <p v-if="loading" class="hint">กำลังโหลด...</p>
      <template v-else>
        <div v-if="job" class="job-card">
          <p class="job-title">{{ job.title }}</p>
          <p class="job-desc">{{ job.description }}</p>
          <span class="tag">฿{{ job.price }}</span>
        </div>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        <p v-if="!applicants.length" class="hint">ยังไม่มีผู้สมัครงานนี้</p>

        <article v-for="a in applicants" :key="a._id" class="card">
          <span class="avatar">
            <img v-if="a.worker.avatarUrl" :src="resolveAvatar(a.worker.avatarUrl)" alt="" />
            <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
          </span>
          <div class="card-body">
            <p class="name">{{ a.worker.fullName || "ผู้ใช้" }}</p>
            <p class="meta">
              ⭐ {{ (a.worker.credibilityScore || 0).toFixed(1) }} ({{ a.worker.reviewCount || 0 }} รีวิว)
              <span v-if="a.distanceMeters != null"> · {{ (a.distanceMeters / 1000).toFixed(1) }} กม.</span>
            </p>
          </div>
          <button class="btn-select" :disabled="selecting === a.worker._id" @click="selectWorker(a)">
            {{ selecting === a.worker._id ? "กำลังเลือก..." : "เลือก" }}
          </button>
        </article>
      </template>
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

.content { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.hint, .error { text-align: center; color: #888; margin-top: 24px; font-size: 13px; }
.error { color: #e11d48; }

.job-card { background: #fff; border-radius: 12px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 4px; }
.job-title { margin: 0; font-size: 14px; font-weight: 700; color: #111; }
.job-desc { margin: 4px 0 8px; font-size: 12.5px; color: #666; }
.tag { background: #eee; color: #444; font-size: 11px; padding: 3px 8px; border-radius: 10px; }

.card { display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 12px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.avatar { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; overflow: hidden; color: #555; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.card-body { flex: 1; min-width: 0; }
.name { margin: 0; font-size: 13.5px; font-weight: 700; color: #111; }
.meta { margin: 3px 0 0; font-size: 11.5px; color: #999; }
.btn-select { flex-shrink: 0; min-height: 38px; padding: 0 16px; border-radius: 8px; border: none; background: #ffc93c; color: #111; font-weight: 700; font-size: 12.5px; cursor: pointer; }
.btn-select:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
