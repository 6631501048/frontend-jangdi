<script setup>
// MVP-03: All job lifecycle states and Worker service posts (Admin read-only overview).
import { ref, computed, onMounted, watch } from "vue";
import api from "../../services/api";
const loading = ref(false);
const errorMessage = ref("");
const search = ref("");
const type = ref("jobs");
const status = ref("all");
const page = ref(1);
const total = ref(0);
const totalPages = ref(1);
const entries = ref([]);
const expanded = ref(null);
const jobStatuses = ["all", "pending_review", "rejected", "waiting", "assigned", "in_progress", "awaiting_confirmation", "completed", "cancelled", "disputed"];
const serviceStatuses = ["all", "active", "closed", "expired"];
const statuses = computed(() => type.value === "jobs" ? jobStatuses : serviceStatuses);
const statusText = { pending_review:"รออนุมัติ", waiting:"เปิดรับ", assigned:"มอบหมายงานแล้ว", in_progress:"กำลังทำงาน", awaiting_confirmation:"รอยืนยัน", completed:"เสร็จแล้ว", cancelled:"ยกเลิก", rejected:"ปฏิเสธ", disputed:"มีข้อพิพาท", active:"เปิดบริการ", closed:"ปิดแล้ว", expired:"หมดอายุ" };
let requestNo = 0;
async function loadJobs() {
  const n = ++requestNo;
  loading.value = true; errorMessage.value = "";
  try {
    const endpoint = type.value === "jobs" ? "/admin/jobs" : "/admin/service-posts";
    const { data } = await api.get(endpoint, { params: { status: status.value, page: page.value, limit: 20, search: search.value.trim() } });
    if (n !== requestNo) return;
    entries.value = type.value === "jobs" ? data.jobs : data.posts;
    total.value = data.total;
    totalPages.value = data.totalPages || 1;
    expanded.value = null;
  } catch (err) { if (n === requestNo) errorMessage.value = err.response?.data?.message || "โหลดประกาศไม่สำเร็จ"; }
  finally { if (n === requestNo) loading.value = false; }
}
function changeType(next) { type.value = next; status.value = "all"; page.value = 1; loadJobs(); }
function changeStatus() { page.value = 1; loadJobs(); }
function changePage(next) { if (next < 1 || next > totalPages.value) return; page.value = next; loadJobs(); }
let searchTimer;
watch(search, () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { page.value=1;loadJobs(); }, 350); });
onMounted(loadJobs);
function formatDate(value) { return value ? new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "-"; }
function money(value) { return `฿${Number(value || 0).toLocaleString("th-TH")}`; }
function initials(name) { return String(name || "U").split(" ").map(s=>s[0]).join("").slice(0,2).toUpperCase(); }
</script>

<template>
  <section class="browse">
    <div class="header-row"><div><p class="greeting">Hello, Admin</p><p class="subtitle">ติดตามประกาศจาก Hirer และ Worker ทุกสถานะ (อ่านอย่างเดียว)</p></div><button class="refresh-btn" :disabled="loading" @click="loadJobs">{{ loading ? 'Loading...' : 'Refresh' }}</button></div>
    <nav class="post-switch" aria-label="ชนิดประกาศ"><button :class="{active:type==='jobs'}" @click="changeType('jobs')">ประกาศงาน Hirer</button><button :class="{active:type==='services'}" @click="changeType('services')">ประกาศบริการ Worker</button></nav>
    <div class="search-box"><span>⌕</span><input v-model="search" placeholder="ค้นหาชื่องานหรือรายละเอียด" aria-label="ค้นหาประกาศ" /></div>
    <label class="filter-label">สถานะ: <select v-model="status" @change="changeStatus"><option v-for="s in statuses" :key="s" :value="s">{{ s === 'all' ? 'ทุกสถานะ' : (statusText[s] || s) }}</option></select></label>
    <p v-if="errorMessage" class="error-box" role="alert">{{ errorMessage }}</p>
    <p v-if="loading" class="empty">กำลังโหลดประกาศ...</p>
    <template v-else>
      <p class="count">พบ {{ total }} รายการ</p>
      <ul class="job-list"><li v-for="entry in entries" :key="entry._id" class="job-card">
        <div class="avatar-circle">{{ initials(type==='jobs' ? entry.hirer?.fullName : entry.worker?.fullName) }}</div>
        <div class="job-body">
          <div class="job-heading">
            <p class="job-name">{{ type==='jobs' ? (entry.hirer?.fullName || 'Hirer') : (entry.worker?.fullName || 'Worker') }}</p>
            <span class="status-label" :class="`status-${entry.status}`">{{ statusText[entry.status] || entry.status }}</span>
          </div>
          <p class="job-title">{{ entry.title }}</p>
          <div class="job-info"><span>{{ entry.category || '-' }}</span><span>{{ money(type==='jobs' ? entry.price : entry.fee) }}</span><span>{{ formatDate(entry.createdAt) }}</span></div>
          <button class="detail-btn" @click="expanded = expanded === entry._id ? null : entry._id">{{ expanded === entry._id ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด' }}</button>
          <div v-if="expanded === entry._id" class="detail-box">
            <p v-if="entry.description"><b>รายละเอียด:</b> {{ entry.description }}</p>
            <p><b>อีเมลผู้ประกาศ:</b> {{ type==='jobs' ? entry.hirer?.email : entry.worker?.email }}</p>
            <p><b>ID:</b> {{ entry._id }}</p><p><b>สถานะ:</b> {{ entry.status }}</p>
            <template v-if="type==='jobs'"><p><b>Worker:</b> {{ entry.selectedWorker?.fullName || 'ยังไม่มี' }}</p><p><b>นัดหมาย:</b> {{ formatDate(entry.scheduledAt) }}</p><p v-if="entry.rejectionReason"><b>เหตุผลที่ปฏิเสธ:</b> {{ entry.rejectionReason }}</p></template>
            <template v-else><p><b>จำนวนที่รับ:</b> {{ entry.currentOrderCount }} / {{ entry.maxSimultaneousOrders }}</p><p><b>หมดเขตรับ:</b> {{ formatDate(entry.availabilityEnd) }}</p></template>
            <RouterLink v-if="type==='jobs' && entry.status==='pending_review'" to="/admin/posts">ไปหน้า Manage Posts เพื่ออนุมัติ/ปฏิเสธ</RouterLink>
          </div>
        </div>
      </li><li v-if="!entries.length" class="empty">ไม่พบประกาศในเงื่อนไขที่เลือก</li></ul>
      <div class="pagination"><button :disabled="page<=1" @click="changePage(page-1)">ก่อนหน้า</button><span>หน้า {{ page }} / {{ totalPages }}</span><button :disabled="page>=totalPages" @click="changePage(page+1)">ถัดไป</button></div>
    </template>
  </section>
</template>

<style scoped>
.browse {
  padding: 16px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.greeting {
  margin: 0;
  font-weight: 700;
}

.subtitle {
  margin: 3px 0 0;
  color: var(--color-text-muted);
  font-size: 12px;
}

.refresh-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 8px;
  padding: 8px 12px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 7px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 8px 14px;
  margin-bottom: 12px;
}

.search-box input {
  border: none;
  outline: none;
  flex: 1;
  background: transparent;
}

.error-box {
  padding: 12px;
  border-radius: 8px;
  background: var(--color-red-bg);
  color: var(--color-red);
  margin-bottom: 12px;
  font-size: 13px;
}

.job-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.job-card {
  display: flex;
  gap: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 12px;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.job-body {
  flex: 1;
  min-width: 0;
}

.job-name {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.job-title {
  margin: 4px 0;
  font-size: 14px;
  font-weight: 700;
}

.job-text {
  margin: 0 0 8px;
  font-size: 13px;
  opacity: 0.85;
}

.job-info {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.job-info span,
.email {
  font-size: 11px;
  color: var(--color-text-muted);
}

.email {
  margin: 5px 0 0;
}

.action-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.action-btn {
  flex: 1;
  min-height: 40px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

.action-btn:disabled {
  opacity: 0.6;
}

.approve {
  background: var(--color-primary);
  color: #3a2a05;
}

.reject {
  background: var(--color-red-bg);
  color: var(--color-red);
}

.empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 24px 0;
}

@media (max-width: 600px) {
  .header-row {
    flex-direction: column;
  }

  .refresh-btn {
    width: 100%;
  }
}
</style>
<style scoped>
.post-switch { display:flex; gap:8px; margin-bottom:12px; }
.post-switch button { padding:10px; border:1px solid #ddd; border-radius:8px; background:#fff; }
.post-switch button.active { background:#ffca3a; font-weight:700; }
.filter-label,.count { display:block; margin-bottom:12px; font-size:13px; }
.filter-label select { margin-left:8px; padding:8px; border:1px solid #ddd; background:white; border-radius:8px; }
.job-heading { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.status-label { display:inline-block; flex-shrink:0; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:700; line-height:1.2; }
.status-pending_review, .status-awaiting_confirmation { background:#fef3c7; color:#92400e; }
.status-waiting, .status-active { background:#dbeafe; color:#1d4ed8; }
.status-assigned, .status-in_progress { background:#e0e7ff; color:#4338ca; }
.status-completed { background:#dcfce7; color:#166534; }
.status-rejected, .status-cancelled, .status-disputed, .status-closed, .status-expired { background:#fee2e2; color:#b91c1c; }
.detail-btn { display:block; margin-top:9px; border:1px solid var(--color-border); border-radius:7px; background:transparent; padding:6px 10px; color:var(--color-text); font-size:12px; font-weight:700; }
.detail-box { margin-top:8px; padding:10px; background:#f8fafc; overflow-wrap:anywhere; font-size:12px; border-radius:8px; }
.detail-box p { margin:0 0 6px; }
.detail-box p:last-of-type { margin-bottom:0; }
.pagination { display:flex; gap:14px; justify-content:center; align-items:center; padding:18px; }
.pagination button { padding:9px 12px; background:white; border:1px solid #ddd; border-radius:8px; }
.pagination button:disabled { opacity:.45; }
</style>
