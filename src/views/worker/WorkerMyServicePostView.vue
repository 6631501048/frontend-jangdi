<script setup>
// FR-SERV-03: ผู้รับจ้างปิด Service Post ด้วยตนเองได้ทุกเมื่อ ก่อนหมดเวลา
// FR-SERV-05: เจ้าของประกาศดู ยอมรับ หรือปฏิเสธ Service Request แต่ละรายการ
// FR-SERV-06: ปิดกั้น Service Request เพิ่มเติมเมื่อถึงจำนวนออร์เดอร์สูงสุด หรือถูกปิดไปแล้ว
// FR-SERV-07: Service Request ที่ยอมรับแล้วจะถูกแปลงเป็นบันทึกงาน (Job) เชื่อมโยงกับ Service Post ต้นทาง
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../services/api";

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

/* ---------- ข้อมูล Service Post ของตนเอง ----------
   หมายเหตุ: หน้านี้ออกแบบไว้สำหรับ 1 โพสต์ต่อครั้ง — ถ้ามีหลายโพสต์ จะเลือกโพสต์ที่ active ล่าสุด
   (หรือโพสต์ล่าสุดถ้าไม่มี active เลย) มาแสดง */
const post = ref(null);
const allRequests = ref([]);

async function load() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const { data: posts } = await api.get("/service-posts/my");
    if (!posts.length) {
      post.value = null;
      return;
    }
    const chosen = posts.find((p) => p.status === "active") || posts[0];
    post.value = {
      id: chosen._id,
      title: chosen.title,
      description: chosen.description,
      isOpen: chosen.status === "active",
      maxOrders: chosen.maxSimultaneousOrders,
      location: chosen.category,
      time: new Date(chosen.availabilityEnd).toLocaleString("th-TH"),
      serviceFee: chosen.fee,
    };

    const { data: requests } = await api.get("/service-posts/requests/my-as-worker");
    allRequests.value = requests
      .filter((r) => r.servicePost?._id === chosen._id)
      .map((r) => ({
        id: r._id,
        requester: r.hirer?.fullName || "ผู้ว่าจ้าง",
        location: "-",
        postedAgo: timeAgo(r.createdAt),
        items: r.orderDetails,
        total: r.servicePost?.fee || 0,
        status: r.status === "accepted" ? "accepted" : "pending", // declined ไม่แสดงในลิสต์นี้
      }))
      .filter((r) => r.status !== "declined");
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "โหลดข้อมูลประกาศบริการไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const pendingCount = computed(() => allRequests.value.filter((r) => r.status === "pending").length);
const visibleRequests = computed(() => {
  // เมื่อโพสต์เต็ม/ปิดแล้ว คำขอที่ยังไม่ตอบรับจะถูกปิดกั้นออกจากลิสต์ (FR-SERV-06)
  if (!post.value?.isOpen) return allRequests.value.filter((r) => r.status === "accepted");
  return allRequests.value;
});

/* ---------- ยอมรับคำขอ ---------- */
const showSuccess = ref(false);
const acceptedRequester = ref("");
const accepting = ref(null);

async function acceptRequest(req) {
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
  <div class="page">
    <!-- แถบด้านบนแบบ sub-page -->
    <header class="topbar">
      <button class="icon-btn" aria-label="ย้อนกลับ" @click="router.back()">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="title">My Service Post</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>

    <main class="content">
      <p v-if="loading" class="empty">กำลังโหลด...</p>
      <p v-else-if="errorMsg" class="empty error-text">{{ errorMsg }}</p>

      <template v-else-if="!post">
        <p class="empty">คุณยังไม่มีประกาศบริการ</p>
        <button class="btn-apply" style="margin: 0 16px;" @click="createNewPost">+ สร้างประกาศบริการใหม่</button>
      </template>

      <template v-else>
      <!-- การ์ดสรุป Service Post -->
      <div class="card post-card">
        <div class="post-head">
          <span class="post-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
          </span>
          <div class="post-head-body">
            <p class="post-title">{{ post.title }}</p>
            <p class="post-desc">{{ post.description }}</p>
          </div>
          <div class="post-status">
            <span :class="post.isOpen ? 'status-open' : 'status-closed'">{{ post.isOpen ? "open" : "Close" }}</span>
            <span class="status-sub">{{ post.isOpen ? "Accepting Orders" : "Full" }}</span>
          </div>
        </div>

        <div class="post-info-row">
          <div class="info-col">
            <p class="info-label"><svg class="mini" viewBox="0 0 24 24"><path d="M12 21s-7-6.5-7-11a7 7 0 0114 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>Location</p>
            <p class="info-value">{{ post.location }}</p>
          </div>
          <div class="info-col">
            <p class="info-label"><svg class="mini" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>Time</p>
            <p class="info-value">{{ post.time }}</p>
          </div>
          <div class="info-col">
            <p class="info-label"><svg class="mini" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M3 10h18M8 7V5h8v2" /></svg>Service Fee</p>
            <p class="info-value">{{ post.serviceFee }} Baht<small>per order</small></p>
          </div>
        </div>
      </div>

      <!-- คำขอที่เข้ามา -->
      <div class="requests-head">
        <h2>Incoming Requests ({{ pendingCount }})</h2>
        <select class="sort-select">
          <option>Latest</option>
          <option>Oldest</option>
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
            <span v-if="req.status === 'accepted'" class="status-accepted">Applied</span>
            <span v-else class="posted-ago">{{ req.postedAgo }}</span>
          </div>

          <div class="request-items">
            <div>
              <p class="items-label">Items Requested</p>
              <p class="items-value">{{ req.items }}</p>
            </div>
            <div class="items-total">
              <p class="items-label">Total</p>
              <p class="items-value">{{ req.total }} Baht</p>
            </div>
          </div>

          <div class="request-actions" :class="{ single: req.status === 'accepted' }">
            <button class="btn-details" @click="viewDetails(req)">Details</button>
            <button v-if="req.status === 'pending'" class="btn-apply" :disabled="accepting === req.id" @click="acceptRequest(req)">
              {{ accepting === req.id ? "..." : "Apply" }}
            </button>
          </div>
        </article>

        <p v-if="!visibleRequests.length" class="empty">ยังไม่มีคำขอเข้ามา</p>
      </section>
      </template>
    </main>

    <!-- โมดัลสำเร็จหลังยอมรับคำขอ -->
    <Transition name="fade">
      <div v-if="showSuccess" class="modal-backdrop" @click.self="showSuccess = false">
        <div class="modal success-modal">
          <div class="check-circle">
            <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 class="success-title">Apply Successful!</h3>
          <p class="success-sub">You have accepted {{ acceptedRequester }}'s order.</p>
          <button class="btn-view-order" @click="viewMyOrder">View My Order</button>
        </div>
      </div>
    </Transition>
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
.post-desc { margin: 2px 0 0; font-size: 11px; color: #999; }
.post-status { flex-shrink: 0; text-align: right; }
.status-open { display: block; font-size: 13px; font-weight: 700; color: #1a9c4a; }
.status-closed { display: block; font-size: 13px; font-weight: 700; color: #e11d48; }
.status-sub { font-size: 10px; color: #999; }

.post-info-row { display: flex; margin-top: 14px; padding-top: 12px; border-top: 1px solid #f2f2f2; }
.info-col { flex: 1; min-width: 0; padding: 0 4px; }
.info-label { display: flex; align-items: center; gap: 4px; margin: 0; font-size: 10.5px; color: #999; }
.info-label .mini { width: 12px; height: 12px; flex-shrink: 0; }
.info-value { margin: 3px 0 0; font-size: 12.5px; font-weight: 700; color: #111; }
.info-value small { display: block; font-size: 9px; font-weight: 400; color: #bbb; }

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
.status-accepted { font-size: 11px; font-weight: 700; color: #1a9c4a; flex-shrink: 0; }

.request-items { display: flex; justify-content: space-between; gap: 10px; margin: 10px 0; }
.items-total { text-align: right; }
.items-label { margin: 0; font-size: 10.5px; color: #999; }
.items-value { margin: 3px 0 0; font-size: 12.5px; font-weight: 700; color: #111; }

.request-actions { display: flex; gap: 8px; }
.request-actions.single { justify-content: flex-start; }
.request-actions.single .btn-details { flex: none; min-width: 110px; }
.btn-details, .btn-apply {
  flex: 1; min-height: 40px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.btn-details { background: #e5e5e5; border: none; color: #333; }
.btn-apply { background: #ffc93c; border: none; color: #111; }

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