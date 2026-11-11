<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../../services/api";
import AdminDecisionDialog from '../../components/AdminDecisionDialog.vue';
import {useAdminDecision} from '../../composables/useAdminDecision';
const {decision,askDecision,confirmDecision,cancelDecision}=useAdminDecision();

const route = useRoute();

const statuses = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending_review", label: "รออนุมัติ" },
  { key: "pending_filter", label: "รอกรองเนื้อหา" },
  { key: "rejected", label: "ไม่อนุมัติ" },
  { key: "waiting", label: "เปิดรับสมัคร" },
  { key: "assigned", label: "เลือก Worker แล้ว" },
  { key: "in_progress", label: "กำลังทำงาน" },
  { key: "awaiting_confirmation", label: "รอ Hirer ยืนยัน" },
  { key: "completed", label: "เสร็จสิ้น" },
  { key: "cancelled", label: "ยกเลิก" },
  { key: "disputed", label: "ข้อพิพาท" },
  { key: "active", label: "เปิดรับบริการ" },
  { key: "closed", label: "ปิดประกาศ" },
  { key: "expired", label: "หมดอายุ" },
];
const jobStatusGroups = [
  { key: "all", label: "ทั้งหมด", statuses: ["all"] },
  { key: "review", label: "รอตรวจสอบ", statuses: ["pending_review", "pending_filter", "rejected"] },
  { key: "progress", label: "กำลังดำเนินการ", statuses: ["waiting", "assigned", "in_progress", "awaiting_confirmation"] },
  { key: "finished", label: "สิ้นสุดงาน", statuses: ["completed", "cancelled", "disputed"] },
];
const serviceStatusGroups = [
  { key: "all", label: "ทั้งหมด", statuses: ["all"] },
  { key: "review", label: "รอตรวจสอบ", statuses: ["pending_review", "rejected"] },
  { key: "progress", label: "กำลังดำเนินการ", statuses: ["active"] },
  { key: "finished", label: "สิ้นสุดงาน", statuses: ["closed", "expired"] },
];
const posts = ref([]);
// The Manage Posts route was only querying Hirer jobs. Worker service listings
// have their own moderation endpoint and need to be visible in this queue too.
const postType = ref(route.query.type === "services" ? "services" : "jobs");
const counts = ref({});
const validStatuses = new Set(statuses.map(({ key }) => key));
const serviceStatusKeys = new Set(["all", "pending_review", "active", "rejected", "closed", "expired"]);
const requestedStatus = String(route.query.status || "all");
const currentStatus = ref(postType.value === "services"
  ? (serviceStatusKeys.has(requestedStatus) ? requestedStatus : "pending_review")
  : (validStatuses.has(requestedStatus) ? requestedStatus : "all"));
const groupsForType = computed(() => postType.value === "services" ? serviceStatusGroups : jobStatusGroups);
const currentGroup = ref(groupsForType.value.find((group) => group.statuses.includes(currentStatus.value))?.key || "all");
const search = ref("");
const appliedSearch = ref("");
const page = ref(1);
const totalPages = ref(0);
const total = ref(0);
const loading = ref(false);
const actionLoading = ref(null);
const expandedId = ref(null);
const errorMessage = ref("");
let requestId = 0;
const totalCount = computed(() => Object.values(counts.value).reduce((sum, number) => sum + Number(number || 0), 0));
const activeStatus = (status) => statuses.find((s) => s.key === status)?.label || status;
const statusCount = (status) => status === "all" ? totalCount.value : Number(counts.value[status] || 0);
const currentGroupStatuses = computed(() => {
  const group = groupsForType.value.find((item) => item.key === currentGroup.value);
  return (group?.statuses || ["all"]).map((key) => statuses.find((item) => item.key === key));
});
function selectGroup(groupKey) {
  currentGroup.value = groupKey;
  const group = groupsForType.value.find((item) => item.key === groupKey);
  if (group && !group.statuses.includes(currentStatus.value)) currentStatus.value = group.statuses[0];
}
function money(value) { return `฿${Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`; }
function date(value) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}
async function loadPosts() {
  const id = ++requestId;
  loading.value = true;
  errorMessage.value = "";
  try {
    const isService = postType.value === "services";
    const endpoint = isService ? "/admin/service-posts" : "/admin/jobs";
    const status = currentStatus.value;
    let data;
    try {
      ({ data } = await api.get(endpoint, { params: {
        status, page: page.value, limit: 20, search: appliedSearch.value,
      } }));
    } catch (error) {
      // Older deployed API versions may reject service statuses that the current
      // API supports. Fall back to its universally supported "all" filter so
      // admins can still review Worker listings while backend versions converge.
      if (!isService || error.response?.status !== 400 || status === "all") throw error;
      ({ data } = await api.get(endpoint, { params: {
        status: "all", page: page.value, limit: 100, search: appliedSearch.value,
      } }));
      const matchingPosts = (data.posts || []).filter((post) => post.status === status);
      data = { ...data, posts: matchingPosts, total: matchingPosts.length, totalPages: 1 };
    }
    if (requestId !== id) return;
    posts.value = isService ? (data.posts || []) : (data.jobs || []);
    if (!isService) counts.value = data.counts || {};
    total.value = data.total || 0;
    totalPages.value = data.totalPages || 0;
    expandedId.value = null;
    if (isService) await loadServiceStatusCounts(id);
  } catch (error) {
    if (requestId !== id) return;
    errorMessage.value = error.response?.data?.message || "ไม่สามารถโหลดงานทั้งหมดได้";
    posts.value = [];
    total.value = 0;
    totalPages.value = 0;
  } finally { if (requestId === id) loading.value = false; }
}
function selectPostType(type) {
  postType.value = type;
  currentStatus.value = type === "services" ? "pending_review" : "all";
  currentGroup.value = type === "services" ? "review" : "all";
  page.value = 1;
  loadPosts();
}
watch(currentStatus, () => {
  currentGroup.value = groupsForType.value.find((group) => group.statuses.includes(currentStatus.value))?.key || "all";
  page.value = 1;
  loadPosts();
});
onMounted(loadPosts);
function doSearch() { page.value = 1; appliedSearch.value = search.value.trim(); loadPosts(); }
function changePage(delta) { page.value += delta; loadPosts(); }
async function loadServiceStatusCounts(id = requestId) {
  const serviceStatuses = [...serviceStatusKeys].filter((status) => status !== "all");
  const results = await Promise.all(serviceStatuses.map(async (status) => {
    try {
      const { data } = await api.get("/admin/service-posts", { params: { status, page: 1, limit: 1, search: appliedSearch.value } });
      return [status, Number(data.total) || 0];
    } catch {
      return [status, 0];
    }
  }));
  if (id === requestId) counts.value = Object.fromEntries(results);
}
async function approve(post) {
  if (actionLoading.value || post.status !== "pending_review") return;
  if (await askDecision({title:'อนุมัติประกาศ',message:post.title,confirmLabel:'ยืนยันอนุมัติ'}) === null) return;
  actionLoading.value = post._id;
  try {
    const endpoint = postType.value === "services" ? "service-posts" : "jobs";
    await api.post(`/admin/${endpoint}/${post._id}/approve`);
    await loadPosts();
  }
  catch (error) { errorMessage.value = error.response?.data?.message || "อนุมัติประกาศไม่สำเร็จ"; }
  finally { actionLoading.value = null; }
}
async function reject(post) {
  if (actionLoading.value || post.status !== "pending_review") return;
  const reason = await askDecision({title:'ปฏิเสธประกาศ',message:post.title,requireReason:true,minLength:5,maxLength:500});
  if (reason === null) return;
  actionLoading.value = post._id;
  try {
    const endpoint = postType.value === "services" ? "service-posts" : "jobs";
    await api.post(`/admin/${endpoint}/${post._id}/reject`, { reason: reason.trim() });
    await loadPosts();
  }
  catch (error) { errorMessage.value = error.response?.data?.message || "ปฏิเสธประกาศไม่สำเร็จ"; }
  finally { actionLoading.value = null; }
}
</script>

<template>
  <AdminDecisionDialog v-if="decision" v-bind="decision" @confirm="confirmDecision" @cancel="cancelDecision" />
  <section class="posts">
    <div class="header-row">
      <div>
        <p class="section-title">Manage Posts — ทุกสถานะงาน</p>
        <p class="subtitle">ติดตามงานตั้งแต่รออนุมัติจนถึงเสร็จสิ้นหรือยกเลิก · Admin แก้ผลอนุมัติได้เฉพาะประกาศที่รอตรวจสอบ</p>
      </div>
      <button class="refresh-btn" :disabled="loading" @click="loadPosts">{{ loading ? "Loading..." : "Refresh" }}</button>
    </div>
    <nav class="post-type-tabs" aria-label="ประเภทโพสต์">
      <button type="button" :class="{ chosen: postType === 'jobs' }" @click="selectPostType('jobs')">งานจาก Hirer</button>
      <button type="button" :class="{ chosen: postType === 'services' }" @click="selectPostType('services')">งานจาก Worker</button>
    </nav>
    <div class="status-filter-heading">
      <span>กรองตามกลุ่มสถานะ</span>
      <span class="status-filter-summary">{{ activeStatus(currentStatus) }} · {{ statusCount(currentStatus) }} รายการ</span>
    </div>
      <nav class="status-groups" aria-label="กลุ่มสถานะงาน">
      <button v-for="group in groupsForType" :key="group.key" type="button" class="group-tab"
        :class="{ chosen: currentGroup === group.key }" :aria-pressed="currentGroup === group.key"
        @click="selectGroup(group.key)">{{ group.label }}</button>
    </nav>
    <nav class="status-tabs" aria-label="สถานะย่อยของงาน">
      <button v-for="item in currentGroupStatuses" :key="item.key" type="button" class="tab"
        :class="{ chosen: currentStatus === item.key }" :aria-pressed="currentStatus === item.key"
        @click="currentStatus = item.key">{{ item.label }} ({{ statusCount(item.key) }})</button>
    </nav>
    <form class="search-box" @submit.prevent="doSearch">
      <input v-model="search" type="search" placeholder="ค้นหาชื่องานหรือรายละเอียดงาน" aria-label="ค้นหาประกาศ" />
      <button type="submit" class="refresh-btn" :disabled="loading">ค้นหา</button>
      <button v-if="appliedSearch" type="button" class="refresh-btn" @click="search = ''; doSearch()">ล้าง</button>
    </form>
    <p v-if="errorMessage" role="alert" class="error-box">{{ errorMessage }}</p>
    <p v-if="loading" class="empty">กำลังโหลดข้อมูล...</p>
    <template v-else>
      <p class="subtitle" style="margin-bottom: 10px">พบ {{ total }} รายการ</p>
      <ul class="post-list">
        <li v-for="post in posts" :key="post._id" class="post-card">
          <div class="post-top">
            <div>
              <p class="post-title">{{ post.title }}</p>
              <p class="post-meta">{{ (postType === 'services' ? post.worker?.fullName : post.hirer?.fullName) || "ไม่ทราบชื่อ" }} · {{ date(post.createdAt) }}</p>
            </div>
            <span class="status-badge" :class="`status-${post.status}`">{{ activeStatus(post.status) }}</span>
          </div>
          <p class="post-text">{{ post.description || "-" }}</p>
          <div class="post-info">
            <span>ประเภท: {{ post.category || "-" }}</span>
            <span>{{ postType === 'services' ? 'ค่าบริการ' : 'ค่าจ้าง' }}: {{ money(postType === 'services' ? post.fee : post.price) }}</span>
            <span v-if="postType === 'jobs'">Worker: {{ post.selectedWorker?.fullName || "ยังไม่ได้เลือก" }}</span>
          </div>
          <div class="action-row">
            <button type="button" class="action-btn outline" @click="expandedId = expandedId === post._id ? null : post._id">
              {{ expandedId === post._id ? "ซ่อนรายละเอียด" : "ดูรายละเอียด" }}
            </button>
            <template v-if="post.status === 'pending_review'">
              <button type="button" class="action-btn approve" :disabled="Boolean(actionLoading)" @click="approve(post)">Approve</button>
              <button type="button" class="action-btn reject" :disabled="Boolean(actionLoading)" @click="reject(post)">Reject</button>
            </template>
          </div>
          <dl v-if="expandedId === post._id" class="detail-box">
            <div><dt>รหัสงาน</dt><dd>{{ post._id }}</dd></div>
            <div><dt>{{ postType === 'services' ? 'Worker' : 'ผู้ว่าจ้าง' }}</dt><dd>{{ (postType === 'services' ? post.worker?.fullName : post.hirer?.fullName) || '-' }} ({{ (postType === 'services' ? post.worker?.email : post.hirer?.email) || '-' }})</dd></div>
            <div><dt>สถานะปัจจุบัน</dt><dd>{{ activeStatus(post.status) }}</dd></div>
            <div v-if="postType === 'jobs'"><dt>ผู้รับงาน</dt><dd>{{ post.selectedWorker?.fullName || '-' }}</dd></div>
            <div><dt>กำหนดนัดหมาย</dt><dd>{{ date(post.scheduledAt) }}</dd></div>
            <div><dt>อนุมัติเมื่อ</dt><dd>{{ date(post.approvedAt) }}</dd></div>
            <div v-if="post.rejectionReason"><dt>เหตุผลปฏิเสธ</dt><dd>{{ post.rejectionReason }}</dd></div>
            <div v-if="post.cancelReason"><dt>เหตุผลยกเลิก</dt><dd>{{ post.cancelReason }}</dd></div>
            <div v-if="post.proofSubmittedAt"><dt>ส่งหลักฐาน</dt><dd>{{ date(post.proofSubmittedAt) }}</dd></div>
            <div v-if="post.completionConfirmedAt"><dt>ยืนยันจบงาน</dt><dd>{{ date(post.completionConfirmedAt) }}</dd></div>
          </dl>
        </li>
        <li v-if="!posts.length" class="empty">ไม่พบงานในสถานะหรือคำค้นนี้</li>
      </ul>
      <div class="pager" v-if="totalPages > 1">
        <button class="refresh-btn" :disabled="page <= 1 || loading" @click="changePage(-1)">ก่อนหน้า</button>
        <span>หน้า {{ page }} / {{ totalPages }}</span>
        <button class="refresh-btn" :disabled="page >= totalPages || loading" @click="changePage(1)">ถัดไป</button>
      </div>
    </template>
  </section>
</template>
<style scoped>
.posts {
  padding: 16px;
}

.post-type-tabs {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}

.post-type-tabs button {
  flex: 1;
  min-height: 40px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
}

.post-type-tabs button.chosen {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-text);
  font-weight: 700;
}

.header-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.section-title {
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
  gap: 6px;
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

.post-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.post-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
}

.post-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.post-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.post-meta {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--color-text-muted);
}

.post-text {
  margin: 10px 0;
  font-size: 13px;
}

.post-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--color-text-muted);
}

.status-badge {
  height: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  font-size: 11px;
  font-weight: 700;
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

.error-box {
  padding: 12px;
  background: var(--color-red-bg);
  color: var(--color-red);
  border-radius: 8px;
}

.empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 24px;
}

@media (max-width: 600px) {
  .header-row {
    flex-direction: column;
  }

  .refresh-btn {
    width: 100%;
  }
}

.status-filter-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 14px; color: var(--color-text-muted); font-size: 12px; }
.status-filter-summary { color: var(--color-text); font-weight: 700; }
.status-groups { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin: 8px 0; }
.group-tab { min-height: 38px; border: 1px solid var(--color-border); background: var(--color-surface); border-radius: 8px; padding: 7px 8px; cursor: pointer; color: var(--color-text-muted); font-size: 12px; }
.group-tab.chosen { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-text); font-weight: 700; }
.status-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; padding: 8px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); }
.tab { border: 1px solid transparent; background: transparent; border-radius: 20px; padding: 7px 10px; cursor: pointer; color: var(--color-text-muted); font-size: 12px; }
.tab.chosen { background: var(--color-primary); color: #3a2a05; font-weight: 700; }
.status-badge { white-space: nowrap; }
.status-completed { background: #dcfce7; color: #166534; }
.status-in_progress, .status-assigned { background: #dbeafe; color: #1d4ed8; }
.status-awaiting_confirmation { background: #fef3c7; color: #92400e; }
.status-rejected, .status-cancelled, .status-disputed { background: #fee2e2; color: #991b1b; }
.status-waiting { background: #e0e7ff; color: #3730a3; }
.action-btn.outline { background: transparent; color: var(--color-text); border: 1px solid var(--color-border); }
.detail-box { margin: 12px 0 0; background: var(--color-surface); border-top: 1px solid var(--color-border); padding-top: 12px; font-size: 12px; }
.detail-box div { display: flex; justify-content: space-between; gap: 12px; margin: 7px 0; }
.detail-box dt { color: var(--color-text-muted); min-width: 108px; }
.detail-box dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
.pager { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 18px; font-size: 12px; }
.search-box { border-radius: 12px; }
.search-box .refresh-btn { flex-shrink: 0; }
@media (max-width: 600px) {
  .status-groups { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .status-filter-heading { align-items: flex-start; flex-direction: column; gap: 3px; }
}
</style>
