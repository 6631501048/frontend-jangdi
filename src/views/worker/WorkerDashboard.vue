<script setup>
// MVP-03: dashboard reads active jobs and the authenticated worker's real applications.
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import TopBar from "../../components/TopBar.vue";
import api from "../../services/api";
const router = useRouter();
const loading = ref(true);
const errorMsg = ref("");
const active = ref([]);
const waiting = ref([]);
const completed = ref([]);
const counts = computed(() => ({ active: active.value.length, waiting: waiting.value.length, completed: completed.value.length }));
const statusLabel = { assigned: "รอชำระเงินจำลอง / เริ่มงาน", in_progress: "กำลังทำงาน", awaiting_confirmation: "รอ Hirer ยืนยัน", completed: "เสร็จแล้ว" };
async function load() {
  loading.value = true; errorMsg.value = "";
  try {
    const [a, w, c] = await Promise.all([
      api.get("/jobs/my-as-worker", { params: { status: "in-progress" } }),
      api.get("/jobs/my-as-worker", { params: { status: "waiting" } }),
      api.get("/jobs/my-as-worker", { params: { status: "completed" } }),
    ]);
    active.value = a.data; waiting.value = w.data; completed.value = c.data;
  } catch (err) { errorMsg.value = err.response?.data?.message || "โหลดรายการงานไม่สำเร็จ"; }
  finally { loading.value = false; }
}
onMounted(load);
function openJob(job) { router.push(`/worker/jobs/${job.id}/tracking`); }
</script>
<template>
  <TopBar />
  <main class="dashboard">
    <header class="headline"><h1>งานของฉัน (Worker)</h1><button @click="load" :disabled="loading">{{ loading ? 'กำลังโหลด...' : 'รีเฟรช' }}</button></header>
    <p v-if="errorMsg" class="error" role="alert">{{ errorMsg }}</p>
    <section class="stats"><RouterLink to="/worker/jobs" class="stat"><strong>{{ counts.active }}</strong><span>งานที่กำลังรับผิดชอบ</span></RouterLink><RouterLink to="/worker/jobs" class="stat"><strong>{{ counts.waiting }}</strong><span>รอการคัดเลือก</span></RouterLink><RouterLink to="/worker/jobs" class="stat"><strong>{{ counts.completed }}</strong><span>งานเสร็จแล้ว</span></RouterLink></section>
    <h2>งานที่กำลังดำเนินการ</h2>
    <p v-if="loading">กำลังโหลดงาน...</p>
    <p v-else-if="!active.length" class="empty">ยังไม่มีงานที่กำลังทำอยู่</p>
    <button v-for="job in active" :key="job.id" class="job" @click="openJob(job)"><span><b>{{ job.title }}</b><small>{{ job.hirerName || 'Hirer' }} · {{ job.price }} บาท</small></span><em>{{ statusLabel[job.backendStatus] || job.backendStatus }}</em></button>
    <RouterLink to="/worker/jobs" class="secondary">ดูงานและใบสมัครทั้งหมด</RouterLink>
    <RouterLink to="/worker/feed" class="fab">ค้นหางานใหม่</RouterLink>
  </main>
</template>
<style scoped>
.dashboard { padding:18px; max-width:850px; margin:auto; }
.headline { display:flex; justify-content:space-between; gap:10px; align-items:center; }
h1 { font-size:20px; } h2 { margin-top:28px; font-size:17px; }
.headline button { padding:8px 14px; background:#fff; border:1px solid #ccc; border-radius:8px; }
.stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.stat { display:flex; flex-direction:column; padding:14px 8px; text-align:center; background:white; border:1px solid #eee; border-radius:12px; color:inherit; text-decoration:none; }
.stat strong { font-size:24px; } .stat span { font-size:12px; color:#666; }
.job { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:15px; margin:10px 0; width:100%; border:1px solid #eee; border-radius:12px; background:white; text-align:left; cursor:pointer; }
.job span { display:flex; flex-direction:column; gap:4px; } .job small { font-size:12px; color:#666; } .job em { font-size:12px; font-style:normal; color:#946100; }
.error { color:#b91c1c; } .empty { color:#666; padding:14px; }
.fab,.secondary { display:block; margin-top:16px; padding:13px; text-decoration:none; text-align:center; border-radius:10px; }
.fab { background:#ffca3a; color:#222; font-weight:700; }.secondary { background:white; border:1px solid #ddd; color:#333; }
@media(max-width:560px) { .stats { grid-template-columns:1fr 1fr; } .job { align-items:flex-start; flex-direction:column; } }
</style>
