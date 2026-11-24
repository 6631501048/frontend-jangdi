<script setup>
import UserProfileLink from "../../components/UserProfileLink.vue";
import { usePageNavigation } from "../../composables/usePageNavigation";
import UserAvatar from "../../components/UserAvatar.vue";
// FR-BROWSE-01: ดูรายละเอียดประกาศงาน (Job) ของผู้ว่าจ้างรายอื่นในฟีด
// หมายเหตุ: หน้านี้เป็นแบบอ่านอย่างเดียว ไม่มีปุ่ม "สมัคร" เพราะ FR-BROWSE-04 (สมัครงาน)
//           เป็นสิทธิ์เฉพาะของผู้รับจ้างเท่านั้น ผู้ว่าจ้างดูได้แค่ข้อมูลประกาศ
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
const { goBack: navigateBack } = usePageNavigation();

const route = useRoute();
// This page is keyed by route.path; keep in-flight requests bound to its original resource.
const pageId = route.params.id;
const router = useRouter();
const loading = ref(true);
const errorMsg = ref("");

function timeAgo(dateStr) {
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
  if (diffMin < 1) return "เมื่อสักครู่";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชม.ที่แล้ว`;
  return `${Math.floor(diffHr / 24)} วันที่แล้ว`;
}

const job = ref({
  id: pageId,
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
    const { data } = await api.get(`/jobs/${pageId}`);
    job.value = {
      id: data._id,
      hirerId: data.hirer?._id || data.hirer,
      hirerAvatarUrl: data.hirer?.avatarUrl,
      hirerName: data.hirer?.fullName || "ผู้ว่าจ้าง",
      postedAgo: timeAgo(data.createdAt),
      description: data.description || "ไม่ได้ระบุรายละเอียด",
      serviceFee: data.price == null ? null : Number(data.price),
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
  navigateBack();
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
      <div class="card">
        <div class="job-head">
          <span class="avatar"><UserAvatar :src="job.hirerAvatarUrl" :name="job.hirerName" /></span>
          <div>
            <p class="hirer-name">{{ job.hirerName }} <span class="posted-ago">{{ job.postedAgo }}</span></p>
<UserProfileLink :user-id="job.hirerId" label="ดูโปรไฟล์ผู้ว่าจ้าง" />
            <p class="job-desc">{{ job.description }}</p>
          </div>
        </div>
        <div class="tags">
          <span class="tag">{{ job.serviceFee == null ? "ไม่ได้ระบุ" : `฿${job.serviceFee.toLocaleString("th-TH")}` }}</span>
          <span class="tag">{{ job.duration }}</span>
        </div>
      </div>

      <div class="card">
        <p class="section-title">ข้อมูลงาน</p>
        <dl class="detail-list">
          <div class="detail-row">
            <dt>ค่าจ้าง</dt>
            <dd>{{ job.serviceFee == null ? "ไม่ได้ระบุ" : `฿${job.serviceFee.toLocaleString("th-TH")}` }}</dd>
          </div>
          <div class="detail-row">
            <dt>จาก</dt>
            <dd>{{ job.from }}</dd>
          </div>
          <div class="detail-row">
            <dt>ถึง</dt>
            <dd>{{ job.to }}</dd>
          </div>
          <div class="detail-row">
            <dt>เวลานัดหมาย</dt>
            <dd>{{ job.duration }}</dd>
          </div>
        </dl>
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

.content { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.card { background: var(--jd-surface); border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }

/* ---------- หัวข้องาน ---------- */
.job-head { display: flex; gap: 10px; }
.avatar {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--jd-input-border);
  display: flex; align-items: center; justify-content: center; color: var(--jd-muted);
}
.hirer-name { margin: 0; font-size: 0.875rem; font-weight: 700; color: var(--jd-ink); }
.posted-ago { font-size: 0.875rem; font-weight: 400; color: var(--jd-muted); margin-left: 4px; }
.job-desc { margin: 2px 0 0; font-size: 0.875rem; color: var(--jd-muted); }
.tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.tag { background: var(--jd-line); color: var(--jd-muted); font-size: 0.875rem; padding: 3px 8px; border-radius: 10px; }

/* ---------- รายละเอียด ---------- */
.section-title { margin: 0 0 10px; font-size: 0.875rem; font-weight: 700; color: var(--jd-ink); }
.detail-list { margin: 0; display: flex; flex-direction: column; }
.detail-row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid var(--jd-subtle); }
.detail-row:last-child { border-bottom: none; }
.detail-row dt { font-size: 0.875rem; color: var(--jd-muted); }
.detail-row dd { margin: 0; font-size: 0.875rem; color: var(--jd-ink); font-weight: 600; }
</style>
