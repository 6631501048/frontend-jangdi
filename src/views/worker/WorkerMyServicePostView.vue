<script setup>
// FR-SERV-03: ผู้รับจ้างปิด Service Post ด้วยตนเองได้ทุกเมื่อ ก่อนหมดเวลา
// FR-SERV-05: เจ้าของประกาศดู ยอมรับ หรือปฏิเสธ Service Request แต่ละรายการ
// FR-SERV-06: ปิดกั้น Service Request เพิ่มเติมเมื่อถึงจำนวนออร์เดอร์สูงสุด หรือถูกปิดไปแล้ว
// FR-SERV-07: Service Request ที่ยอมรับแล้วจะถูกแปลงเป็นบันทึกงาน (Job) เชื่อมโยงกับ Service Post ต้นทาง
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
import { servicePostWorkflowStatus, requestWorkflowLabel } from "../../services/workflowStatus";

const props = defineProps({ embedded: { type: Boolean, default: false } });
const router = useRouter();
const route = useRoute();
const isManagementDetail = computed(() => Boolean(route.params.id));
const loading = ref(true);
const errorMsg = ref("");
const now = ref(Date.now());
const showCancelForm = ref(false);
const cancelReason = ref("");
const cancelling = ref(false);
const categoryLabels = { delivery: "จัดส่ง", cleaning: "ทำความสะอาด", tutoring: "ติว/การศึกษา", writing: "เขียน/พิมพ์เอกสาร", errands: "งานจิปาถะ", it: "IT/โปรแกรมมิ่ง" };

function servicePostTime(post) {
  const dates = [post.availabilityStart, post.availabilityEnd].filter(Boolean);
  return dates.map((value) => new Date(value).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })).join(" – ") || "-";
}

function timeAgo(dateStr) {
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function servicePostAge(dateStr) {
  if (!dateStr) return "";
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
  if (diffMin < 1) return "เมื่อสักครู่";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชม.ที่แล้ว`;
  return `${Math.floor(diffHr / 24)} วันที่แล้ว`;
}

/* ---------- ข้อมูล Service Post ของตนเอง ----------
   หมายเหตุ: หน้านี้ออกแบบไว้สำหรับ 1 โพสต์ต่อครั้ง — ถ้ามีหลายโพสต์ จะเลือกโพสต์ที่ active ล่าสุด
   (หรือโพสต์ล่าสุดถ้าไม่มี active เลย) มาแสดง */
const post = ref(null);
const servicePosts = ref([]);
const chosenPostId = ref(String(route.params.id || ""));
const servicePostFilter = ref("pending_review");
const serviceRequestStatesByPost = ref({});
const sortOrder = ref("latest");
const allRequests = ref([]);
let clockTimer;
let statusRefreshTimer;
let loadInFlight = false;
const canRequestCancel = computed(() => Boolean(
  post.value?.status === "active" &&
  post.value.createdAt &&
  now.value - new Date(post.value.createdAt).getTime() >= 5 * 60 * 1000 &&
  allRequests.value.length === 0,
));
const servicePostFilters = [
  { value: "pending_review", label: "รออนุมัติ" },
  { value: "waiting", label: "รอผู้ขอรับบริการ" },
  { value: "in_progress", label: "กำลังดำเนินงาน" },
  { value: "disputed", label: "รอพิจารณาคืนเงิน" },
  { value: "refund_pending", label: "รอแอดมินคืนเงิน" },
  { value: "refunded", label: "คืนเงินแล้ว" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "cancelled", label: "ยกเลิก" },
  { value: "unknown", label: "ตรวจสอบสถานะ" },
];
function servicePostStatus(item) {
  return servicePostWorkflowStatus(item, serviceRequestStatesByPost.value[String(item._id)] || []);
}

function matchesServicePostFilter(item, filter) {
  return servicePostStatus(item) === filter;
}
const visibleServicePosts = computed(() => servicePosts.value.filter((item) => matchesServicePostFilter(item, servicePostFilter.value)));

function servicePostFilterCount(filter) {
  return servicePosts.value.filter((item) => matchesServicePostFilter(item, filter)).length;
}

function servicePostListStatus(item) {
  return ({
    pending_review: "รออนุมัติ",
    waiting: "รอผู้ขอรับบริการ",
    in_progress: "กำลังดำเนินงาน",
    disputed: "รอพิจารณาคืนเงิน",
    refund_pending: "อนุมัติแล้ว รอแอดมินคืนเงิน",
    refunded: "คืนเงินแล้ว",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก",
    unknown: "ยังตรวจสอบสถานะงานไม่ได้",
  })[servicePostStatus(item)];
}

function servicePostListStatusClass(item) {
  if (item.status === "pending_review") return "gold";
  if (servicePostListStatus(item) === "เสร็จสิ้น") return "green";
  if (["ยกเลิก"].includes(servicePostListStatus(item))) return "red";
  if (servicePostListStatus(item) === "กำลังดำเนินงาน") return "purple";
  return "gold";
}

async function load({ background = false } = {}) {
  if (loadInFlight) return;
  loadInFlight = true;
  if (!background) loading.value = true;
  errorMsg.value = "";
  try {
    const { data: posts } = await api.get("/service-posts/my");
    servicePosts.value = posts;
    const { data: requests } = await api.get("/service-posts/requests/my-as-worker");
    const requestStates = await Promise.all(requests.map(async (request) => {
      let jobStatus = null;
      if (request.status === "accepted") {
        if (request.resultingJob?.status) {
          jobStatus = request.resultingJob.status;
        } else {
          try {
            const { data } = await api.get(`/service-posts/requests/${request._id}`);
            jobStatus = data.resultingJob?.status || null;
            request.paymentStatus = data.paymentStatus || data.resultingJob?.paymentStatus || null;
          } catch {
            jobStatus = null;
          }
        }
      }
      const servicePostId = String(request.servicePost?._id || request.servicePost || "");
      return { ...request, servicePostId, jobStatus };
    }));
    serviceRequestStatesByPost.value = requestStates.reduce((grouped, request) => {
      (grouped[request.servicePostId] ||= []).push(request);
      return grouped;
    }, {});
    if (!posts.length) {
      post.value = null;
      return;
    }
    if (!chosenPostId.value || !posts.some(p => p._id === chosenPostId.value)) {
      chosenPostId.value = (posts.find(p => p.status === "active") || posts[0])._id;
    }
    const chosen = posts.find(p => p._id === chosenPostId.value);
    post.value = {
      id: chosen._id,
      title: chosen.title,
      description: chosen.description,
      status: chosen.status,
      createdAt: chosen.createdAt,
      closeReason: chosen.closeReason || null,
      closeNote: chosen.closeNote || "",
      rejectionReason: chosen.rejectionReason || "",
      isOpen: chosen.status === "active" && new Date(chosen.availabilityEnd) >= new Date() && chosen.currentOrderCount < chosen.maxSimultaneousOrders,
      maxOrders: chosen.maxSimultaneousOrders,
      currentOrderCount: chosen.currentOrderCount,
      location: chosen.category === "delivery"
        ? `รัศมี ${((chosen.serviceRadiusMeters || 0) / 1000).toFixed(1)} กม.`
        : chosen.locationLabel || categoryLabels[chosen.category] || chosen.category,
      time: [chosen.availabilityStart, chosen.availabilityEnd]
        .filter(Boolean)
        .map((value) => new Date(value).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }))
        .join(" – ") || "-",
      serviceFee: chosen.fee,
      feeUnit: chosen.category === "delivery"
        ? chosen.serviceType === "shopping" || !chosen.serviceType ? "ต่อออร์เดอร์" : "ต่อเที่ยว"
        : "ต่อรายการ",
    };

    allRequests.value = requestStates
      .filter((r) => r.servicePostId === String(chosen._id))
      .map((r) => ({
        id: r._id,
        requester: r.hirer?.fullName || "ผู้ว่าจ้าง",
        location: "-",
        postedAgo: timeAgo(r.createdAt),
        postedTimestamp: new Date(r.createdAt).getTime(),
        items: r.orderData?.requirements || r.orderDetails || "-",
        total: Number(r.servicePost?.fee || 0) + Number(r.orderData?.itemBudget || 0),
        status: r.status,
        declineReason: r.declineReason,
        jobStatus: r.jobStatus,
        paymentStatus: r.paymentStatus || r.resultingJob?.paymentStatus,
      }));
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "โหลดข้อมูลประกาศบริการไม่สำเร็จ";
  } finally {
    loading.value = false;
    loadInFlight = false;
  }
}
const refreshStatus = () => load({ background: true });
onMounted(load);
onMounted(() => {
  clockTimer = window.setInterval(() => { now.value = Date.now(); }, 1000);
  statusRefreshTimer = window.setInterval(refreshStatus, 5000);
  window.addEventListener("focus", refreshStatus);
});
onUnmounted(() => {
  window.clearInterval(clockTimer);
  window.clearInterval(statusRefreshTimer);
  window.removeEventListener("focus", refreshStatus);
});

const pendingCount = computed(() => allRequests.value.filter((r) => r.status === "pending").length);
const visibleRequests = computed(() => {
  // Keep pending requests visible when full/closed, so Worker can inspect/decline them.
  return [...allRequests.value].sort((a, b) => sortOrder.value === 'oldest' ? a.postedTimestamp - b.postedTimestamp : b.postedTimestamp - a.postedTimestamp);
});

/* ---------- ยอมรับคำขอ ---------- */
const showSuccess = ref(false);
const acceptedRequester = ref("");
const accepting = ref(null);

async function acceptRequest(req) {
  if (accepting.value) return;
  if (!post.value?.isOpen) {
    errorMsg.value = "ประกาศปิดรับแล้ว ไม่สามารถยอมรับคำขอเพิ่มได้";
    return;
  }
  accepting.value = req.id;
  errorMsg.value = "";
  try {
    await api.patch(`/service-posts/requests/${req.id}`, { action: "accept" });
    req.status = "accepted";
    acceptedRequester.value = req.requester;
    showSuccess.value = true;
    await load(); // รีเฟรชสถานะโพสต์ (เผื่อปิดอัตโนมัติเพราะเต็มแล้ว — FR-SERV-06)
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "ยอมรับคำขอไม่สำเร็จ";
  } finally {
    accepting.value = null;
  }
}

async function requestCancelService() {
  const reason = cancelReason.value.trim();
  if (!canRequestCancel.value || reason.length < 5 || cancelling.value) return;
  cancelling.value = true;
  errorMsg.value = "";
  try {
    await api.post(`/service-posts/${post.value.id}/close`, { reason });
    showCancelForm.value = false;
    cancelReason.value = "";
    await load();
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "ยกเลิกประกาศบริการไม่สำเร็จ";
  } finally {
    cancelling.value = false;
  }
}

function viewMyOrder() {
  showSuccess.value = false;
  router.push("/worker/jobs");
}

function viewDetails(req) {
  router.push(`/worker/service-requests/${req.id}`);
}

function createNewPost() {
  router.push("/worker/service-posts/new");
}
</script>

<template>
  <div class="page" :class="{ embedded: props.embedded }">
    <!-- แถบด้านบนแบบ sub-page -->
    <header v-if="!props.embedded" class="topbar">
      <button class="icon-btn" aria-label="ย้อนกลับ" @click="router.back()">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="title">{{ isManagementDetail ? "รายละเอียดบริการ" : "บริการของฉัน" }}</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>

    <main class="content">
      <p v-if="loading" class="empty">กำลังโหลด...</p>
      <p v-else-if="errorMsg" class="empty error-text">{{ errorMsg }}</p>

      <template v-else-if="!servicePosts.length">
        <p class="empty">คุณยังไม่มีประกาศบริการ</p>
        <button class="btn-apply create-button" @click="createNewPost">+ สร้างประกาศบริการใหม่</button>
      </template>

      <template v-else>
      <section v-if="!isManagementDetail" class="service-post-list" aria-label="บริการที่โพสต์">
        <nav class="service-post-filters" aria-label="กรองสถานะบริการ">
          <button
            v-for="filter in servicePostFilters"
            :key="filter.value"
            type="button"
            :class="{ active: servicePostFilter === filter.value }"
            :aria-pressed="servicePostFilter === filter.value"
            @click="servicePostFilter = filter.value"
          >{{ filter.label }} ({{ servicePostFilterCount(filter.value) }})</button>
        </nav>
        <article
          v-for="item in visibleServicePosts"
          :key="item._id"
          class="service-post-row"
        >
          <span class="post-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
          </span>
          <span class="service-post-body">
            <strong>{{ item.title }}</strong>
            <small>฿{{ Number(item.fee || 0).toLocaleString("th-TH") }} · {{ servicePostTime(item) }}</small>
          </span>
          <span class="status-tag" :class="servicePostListStatusClass(item)">{{ servicePostListStatus(item) }}</span>
          <RouterLink :to="`/worker/my-services/${item._id}`" class="btn-details">รายละเอียด</RouterLink>
        </article>
        <p v-if="!visibleServicePosts.length" class="empty service-empty">ยังไม่มีบริการในสถานะนี้</p>
      </section>
      <template v-if="isManagementDetail && post">
      <!-- สรุปบริการ -->
      <div class="card post-card service-summary-card">
        <div class="post-head">
          <span class="post-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
          </span>
          <div class="post-head-body">
            <div class="post-title-line"><p class="post-title">{{ post.title }}</p><span class="post-created">{{ servicePostAge(post.createdAt) }}</span></div>
            <p class="post-desc">{{ post.description }}</p>
          </div>
          <div class="post-status">
            <span :class="post.status === 'pending_review' ? 'status-review' : post.isOpen ? 'status-open' : 'status-closed'">{{ post.status === 'pending_review' ? "Pending" : post.status === 'rejected' ? "ไม่อนุมัติ" : post.status === 'closed' && post.closeReason === 'refund' ? "ปิดบริการหลังคืนเงิน" : post.status === 'closed' && post.closeReason === 'manual' ? "ยกเลิก" : post.isOpen ? "เปิดรับบริการ" : "ปิดรับบริการ" }}</span>
            <span v-if="post.status === 'rejected' && post.rejectionReason" class="status-sub">{{ post.rejectionReason }}</span>
          </div>
        </div>
        <div class="service-chips"><span>฿{{ Number(post.serviceFee).toLocaleString("th-TH") }} {{ post.feeUnit }}</span><span>{{ post.time }}</span></div>
      </div>

      <section class="card service-details-card">
        <h2>ข้อมูลบริการ</h2>
        <dl class="service-detail-list">
          <div class="service-detail-row"><dt>ค่าบริการ</dt><dd>฿{{ Number(post.serviceFee).toLocaleString("th-TH") }} <small>{{ post.feeUnit }}</small></dd></div>
          <div class="service-detail-row"><dt>งานที่รับพร้อมกัน</dt><dd>{{ post.currentOrderCount }} / {{ post.maxOrders }} งาน</dd></div>
          <div class="service-detail-row"><dt>สถานที่ให้บริการ</dt><dd>{{ post.location }}</dd></div>
          <div class="service-detail-row"><dt>ช่วงเวลา</dt><dd>{{ post.time }}</dd></div>
          <div v-if="post.status === 'closed' && post.closeReason === 'manual' && post.closeNote" class="service-detail-row"><dt>เหตุผลที่ยกเลิก</dt><dd>{{ post.closeNote }}</dd></div>
        </dl>
      </section>

      <div v-if="post.status === 'rejected' && post.rejectionReason" class="card rejection-reason"><strong>เหตุผลที่ไม่อนุมัติ</strong><p>{{ post.rejectionReason }}</p></div>

      <section v-if="canRequestCancel" class="cancel-service card">
        <button v-if="!showCancelForm" type="button" class="cancel-open" @click="showCancelForm = true">ขอยกเลิกบริการ</button>
        <form v-else class="cancel-form" @submit.prevent="requestCancelService">
          <label for="service-cancel-reason">เหตุผลที่ขอยกเลิก</label>
          <textarea id="service-cancel-reason" v-model="cancelReason" minlength="5" maxlength="500" rows="3" required placeholder="ระบุเหตุผลอย่างน้อย 5 ตัวอักษร"></textarea>
          <div class="cancel-actions">
            <button type="button" class="btn-details" @click="showCancelForm = false; cancelReason = ''">กลับ</button>
            <button type="submit" class="cancel-submit" :disabled="cancelling || cancelReason.trim().length < 5">{{ cancelling ? "กำลังส่งคำขอ…" : "ยืนยันยกเลิก" }}</button>
          </div>
        </form>
      </section>

      <!-- คำขอที่เข้ามา -->
      <div class="requests-head">
        <h2>คำขอเข้ามา ({{ pendingCount }})</h2>
        <select v-model="sortOrder" class="sort-select">
          <option value="latest">ใหม่สุด</option>
          <option value="oldest">เก่าสุด</option>
        </select>
      </div>

      <section class="request-list">
        <article v-for="req in visibleRequests" :key="req.id" class="card request-card">
          <div class="request-head">
            <span class="post-avatar small" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
            </span>
            <div class="request-head-body">
              <p class="requester">{{ req.requester }}</p>
              <p class="requester-loc">{{ req.location }}</p>
            </div>
            <span class="request-workflow-status">{{ requestWorkflowLabel(req) }}</span>
          </div>

          <div class="request-items">
            <div>
              <p class="items-label">รายละเอียดคำขอ</p>
              <p class="items-value">{{ req.items }}</p>
            </div>
            <div class="items-total">
              <p class="items-label">ประมาณการ</p>
              <p class="items-value">฿{{ Number(req.total).toLocaleString("th-TH") }}</p>
            </div>
          </div>

          <div class="request-actions" :class="{ single: req.status === 'accepted' }">
            <button class="btn-details" @click="viewDetails(req)">รายละเอียด</button>
            <button v-if="req.status === 'pending' && post.isOpen" class="btn-apply" :disabled="!!accepting" @click="acceptRequest(req)">
              {{ accepting === req.id ? "กำลังบันทึก…" : "ยอมรับคำขอ" }}
            </button>
          </div>
        </article>

        <p v-if="!visibleRequests.length" class="empty">ยังไม่มีคำขอเข้ามา</p>
      </section>
      </template>
      </template>
    </main>

    <!-- โมดัลสำเร็จหลังยอมรับคำขอ -->
    <Transition name="fade">
      <div v-if="showSuccess" class="modal-backdrop" @click.self="showSuccess = false">
        <div class="modal success-modal">
          <div class="check-circle">
            <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 class="success-title">รับคำขอเรียบร้อยแล้ว</h3>
          <p class="success-sub">รับคำขอจาก {{ acceptedRequester }} แล้ว</p>
          <button class="btn-view-order" @click="viewMyOrder">ดูงานของฉัน</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; background: #f0f0f0; }
.page.embedded { min-height: 0; background: transparent; }
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

.content { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.card { background: #fff; border-radius: 12px; padding: 14px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }

/* ---------- การ์ด Service Post ---------- */
.post-head { display: flex; gap: 10px; align-items: flex-start; }
.post-avatar {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; border: 1px solid #ddd;
  display: flex; align-items: center; justify-content: center; color: #555;
}
.post-avatar.small { width: 30px; height: 30px; }
.post-head-body { flex: 1; min-width: 0; }
.post-title { margin: 0; font-size: 13.5px; font-weight: 700; color: #111; }
.post-title-line { display:flex; align-items:baseline; flex-wrap:wrap; gap:9px; }
.post-created { color:#999; font-size:10.5px; }
.post-desc { margin: 2px 0 0; font-size: 11px; color: #999; }
.post-status { flex-shrink: 0; text-align: right; }
.status-open, .status-closed, .status-review { display:inline-flex; align-items:center; padding:5px 10px; border-radius:999px; font-size:12px; font-weight:700; }
.status-open { background:#dcfce7; color:#166534; }
.status-closed { background:#fee2e2; color:#b91c1c; }
.status-review { background:#fff1c2; color:#8a5a00; }
.status-sub { font-size: 10px; color: #999; }

.post-info-row { display: flex; margin-top: 14px; padding-top: 12px; border-top: 1px solid #f2f2f2; }
.service-summary-card { min-height:126px; }
.service-chips { display:flex; flex-wrap:wrap; gap:8px; margin-left:44px; }
.service-chips span { padding:5px 10px; border-radius:999px; background:#f0f0f0; color:#444; font-size:11px; }
.service-details-card h2 { margin:0 0 10px; font-size:15px; }
.service-detail-list { margin:0; display:flex; flex-direction:column; }
.service-detail-row { display:flex; justify-content:space-between; gap:16px; padding:11px 0; border-bottom:1px solid #f2f2f2; }
.service-detail-row dt { color:#999; font-size:12px; }
.service-detail-row dd { margin:0; color:#111; font-size:13px; font-weight:600; text-align:right; }
.service-detail-row dd small { color:#999; font-size:10px; font-weight:400; }
.rejection-reason { color:#7c2d12; background:#fff7ed; font-size:12px; }
.rejection-reason p { margin:5px 0 0; }
.info-col { flex: 1; min-width: 0; padding: 0 4px; }
.info-label { display: flex; align-items: center; gap: 4px; margin: 0; font-size: 10.5px; color: #999; }
.info-label .mini { width: 12px; height: 12px; flex-shrink: 0; }
.info-value { margin: 3px 0 0; font-size: 12.5px; font-weight: 700; color: #111; }
.info-value small { display: block; font-size: 9px; font-weight: 400; color: #bbb; }
.close-note { margin:12px 0 0; padding:10px 12px; border-radius:8px; background:#fff7ed; color:#7c2d12; font-size:12px; }

/* ---------- หัวข้อคำขอ ---------- */
.requests-head { display: flex; align-items: center; justify-content: space-between; }
.requests-head h2 { margin: 0; font-size: 13px; font-weight: 700; color: #111; }
.sort-select { border: 1px solid #ddd; border-radius: 8px; padding: 4px 8px; font-size: 11.5px; background: #fff; color: #555; }

/* ---------- รายการคำขอ ---------- */
.request-list { display: flex; flex-direction: column; gap: 10px; }
.request-head { display: flex; align-items: center; gap: 8px; }
.request-head-body { flex: 1; min-width: 0; }
.requester { margin: 0; font-size: 13px; font-weight: 700; color: #111; }
.requester-loc { margin: 1px 0 0; font-size: 10.5px; color: #999; }
.posted-ago { font-size: 10.5px; color: #999; flex-shrink: 0; }
.request-workflow-status { max-width:50%; text-align:right; font-size:11px; font-weight:700; }
.status-accepted { font-size: 11px; font-weight: 700; color: #1a9c4a; flex-shrink: 0; }

.request-items { display: flex; justify-content: space-between; gap: 10px; margin: 10px 0; }
.items-total { text-align: right; }
.items-label { margin: 0; font-size: 10.5px; color: #999; }
.items-value { margin: 3px 0 0; font-size: 12.5px; font-weight: 700; color: #111; }

.request-actions { display: flex; gap: 8px; }
.request-actions.single { justify-content: flex-start; }
.request-actions.single .btn-details { flex: none; min-width: 110px; }
.cancel-service { border:1px solid #fecaca; }
.cancel-open { min-height:40px; padding:0 14px; border:1px solid #ef4444; border-radius:8px; background:#fff; color:#b91c1c; font-weight:700; cursor:pointer; }
.cancel-form { display:flex; flex-direction:column; gap:8px; }
.cancel-form label { color:#444; font-size:13px; font-weight:700; }
.cancel-form textarea { width:100%; min-height:82px; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font:inherit; resize:vertical; }
.cancel-actions { display:flex; gap:8px; justify-content:flex-end; }
.cancel-actions .btn-details, .cancel-submit { flex:0 0 auto; min-width:104px; min-height:40px; padding:0 14px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; }
.cancel-actions .btn-details { border:1px solid #d1d5db; background:#fff; color:#333; }
.cancel-submit { border:0; background:#ef4444; color:#fff; }
.cancel-submit:disabled { opacity:.55; cursor:not-allowed; }
.btn-details, .btn-apply {
  flex: 1; min-height: 40px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.btn-details { background: #fff; border: 1px solid #d1d5db; color: #222; }
.btn-apply { background: #ffc93c; border: none; color: #111; }
.create-button { flex:none; margin:0; padding:0 16px; }

.empty { text-align: center; color: #888; margin-top: 20px; font-size: 14px; }
.error-text { color: #e11d48; }
.btn-apply:disabled { opacity: 0.6; cursor: not-allowed; }

/* ---------- โมดัลสำเร็จ ---------- */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 30; padding: 20px;
}
.modal { background: #fff; border-radius: 16px; padding: 24px 20px; width: 100%; max-width: 340px; }
.success-modal { display: flex; flex-direction: column; align-items: center; text-align: center; }
.check-circle {
  width: 60px; height: 60px; border-radius: 50%; background: #22c55e; color: #fff;
  display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
}
.check-circle svg { width: 30px; height: 30px; stroke-width: 3; }
.success-title { margin: 0 0 6px; font-size: 17px; font-weight: 800; color: #111; }
.success-sub { margin: 0 0 20px; font-size: 12.5px; color: #888; }
.btn-view-order {
  width: 100%; min-height: 46px; border: none; border-radius: 10px;
  background: #22c55e; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
<style scoped>
.service-post-list { display:flex; flex-direction:column; gap:10px; margin-bottom:14px; }
.service-post-filters { display:flex; overflow-x:auto; margin-bottom:4px; border:1px solid #e5e7eb; border-radius:10px; background:#fff; }
.service-post-filters button { flex:1; min-width:max-content; min-height:42px; padding:0 12px; border:0; background:transparent; color:#555; font-size:12px; cursor:pointer; white-space:nowrap; }
.service-post-filters button.active { background:#ffc93c; color:#111; font-weight:700; }
.service-post-row { width:100%; min-height:68px; display:flex; align-items:center; gap:10px; padding:12px; border:1px solid #e5e7eb; border-radius:12px; background:#fff; color:#111; text-align:left; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.service-post-row .post-avatar { width:36px; height:36px; }
.service-post-body { display:flex; flex:1; min-width:0; flex-direction:column; gap:4px; }
.service-post-body strong { overflow:hidden; font-size:13px; text-overflow:ellipsis; white-space:nowrap; }
.service-post-body small { color:#888; font-size:11px; }
.service-post-row .status-tag { flex-shrink:0; padding:5px 9px; border-radius:999px; font-size:11px; font-weight:700; white-space:nowrap; }
.service-post-row .status-tag.gold { background:#fff1c2; color:#8a5a00; }
.service-post-row .status-tag.green { background:#dcfce7; color:#166534; }
.service-post-row .status-tag.red { background:#fee2e2; color:#b91c1c; }
.service-post-row .btn-details { flex:0 0 auto; min-width:104px; min-height:40px; display:flex; align-items:center; justify-content:center; padding:0 14px; border:1px solid #d1d5db; border-radius:8px; background:#fff; color:#222; text-decoration:none; font-size:13px; font-weight:700; }
.sort-select { min-height:42px; padding:9px 12px; background:#fff; border:1px solid #d7dbe0; border-radius:9px; color:#222; font:inherit; }
.sort-select:focus { outline:2px solid #ffe08a; border-color:#e9ad10; }
.post-card { border:1px solid #e5e7eb; }
.embedded .content { padding:0; }
.request-card { border:1px solid #e5e7eb; }
.requests-head { margin-top:2px; }
.requests-head h2 { font-size:15px; }
.request-list { gap:12px; }
.btn-details, .btn-apply { padding:0 14px; text-align:center; }
@media (max-width: 640px) {
  .content { padding:12px; gap:12px; }
  .post-head { flex-wrap:wrap; }
  .post-status { margin-left:auto; }
  .post-info-row { display:grid; grid-template-columns:1fr; gap:12px; }
  .service-chips { margin-left:0; }
  .service-detail-row { align-items:flex-start; }
  .service-detail-row dd { max-width:68%; }
  .info-col { padding:0; }
  .request-items { align-items:flex-start; }
  .request-actions { flex-wrap:wrap; }
  .service-post-filters button { min-width:120px; }
}
</style>
