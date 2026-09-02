<script setup>
// FR-BROWSE-01: ดูรายละเอียดประกาศงาน (Job) ของผู้ว่าจ้างรายอื่นในฟีด
// หมายเหตุ: หน้านี้เป็นแบบอ่านอย่างเดียว ไม่มีปุ่ม "สมัคร" เพราะ FR-BROWSE-04 (สมัครงาน)
//           เป็นสิทธิ์เฉพาะของผู้รับจ้างเท่านั้น ผู้ว่าจ้างดูได้แค่ข้อมูลประกาศ
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const errorMsg = ref("");

function timeAgo(dateStr) {
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

const job = ref({
  id: route.params.id,
  hirerName: "",
  postedAgo: "-",
  description: "",
  serviceFee: 0,
  from: "-",
  to: "-",
  duration: "-",
});

async function loadJob() {
  loading.value = true;
  try {
    const { data } = await api.get(`/jobs/${route.params.id}`);
    job.value = {
      id: data._id,
      hirerName: data.hirer?.fullName || "ผู้ว่าจ้าง",
      postedAgo: timeAgo(data.createdAt),
      description: data.description,
      serviceFee: data.price,
      from: data.fromText || data.locationText || "-",
      to: data.toText || "-",
      duration: data.scheduledAt ? new Date(data.scheduledAt).toLocaleString("th-TH") : "-",
    };
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "โหลดรายละเอียดงานไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}
onMounted(loadJob);

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
      <h1 class="title">Details</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>

    <main class="content">
      <div class="card">
        <div class="job-head">
          <span class="avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
          </span>
          <div>
            <p class="hirer-name">{{ job.hirerName }} <span class="posted-ago">{{ job.postedAgo }}</span></p>
            <p class="job-desc">{{ job.description }}</p>
          </div>
        </div>
        <div class="tags">
          <span class="tag">฿{{ job.serviceFee }}</span>
          <span class="tag">{{ job.duration }}</span>
        </div>
      </div>

      <div class="card">
        <p class="section-title">Work details</p>
        <dl class="detail-list">
          <div class="detail-row">
            <dt>Service Fee</dt>
            <dd>฿{{ job.serviceFee }}</dd>
          </div>
          <div class="detail-row">
            <dt>From</dt>
            <dd>{{ job.from }}</dd>
          </div>
          <div class="detail-row">
            <dt>To</dt>
            <dd>{{ job.to }}</dd>
          </div>
          <div class="detail-row">
            <dt>Duration</dt>
            <dd>{{ job.duration }}</dd>
          </div>
        </dl>
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

.content { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }

/* ---------- หัวข้องาน ---------- */
.job-head { display: flex; gap: 10px; }
.avatar {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; border: 1px solid #ddd;
  display: flex; align-items: center; justify-content: center; color: #555;
}
.hirer-name { margin: 0; font-size: 14px; font-weight: 700; color: #111; }
.posted-ago { font-size: 11px; font-weight: 400; color: #999; margin-left: 4px; }
.job-desc { margin: 2px 0 0; font-size: 12.5px; color: #555; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.tag { background: #eee; color: #444; font-size: 11px; padding: 3px 8px; border-radius: 10px; }

/* ---------- รายละเอียด ---------- */
.section-title { margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #111; }
.detail-list { margin: 0; display: flex; flex-direction: column; }
.detail-row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #f2f2f2; }
.detail-row:last-child { border-bottom: none; }
.detail-row dt { font-size: 12px; color: #999; }
.detail-row dd { margin: 0; font-size: 13px; color: #111; font-weight: 600; }
</style>