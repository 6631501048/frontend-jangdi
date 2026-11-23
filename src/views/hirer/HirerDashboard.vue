<script setup>
// FR-BROWSE-01: ฟีดที่เลื่อนดูได้ของ "ประกาศงาน" (Job, จากผู้ว่าจ้างรายอื่น) + "Service Post" (จากผู้รับจ้าง)
// FR-BROWSE-02: กรองตามประเภทประกาศ (ทั้งหมด/ผู้ว่าจ้าง/ผู้รับจ้าง) และตามหมวดหมู่
// FR-SERV-04: ผู้ว่าจ้างเรียกดู Service Post ที่ใช้งานอยู่ และกด "Hiring" เพื่อส่ง Service Request
// หมายเหตุ: ประกาศประเภท "ผู้ว่าจ้าง" (Job ของผู้ว่าจ้างรายอื่น) เปิดดูได้เฉพาะ "รายละเอียด" เท่านั้น
//           เพราะการสมัครงาน (FR-BROWSE-04) เป็นสิทธิ์ของผู้รับจ้าง ไม่ใช่ผู้ว่าจ้าง
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useAuthStore } from "../../stores/auth";
import api from "../../services/api";
import { belongsToAccount } from "../../services/feedVisibility";
import UserAvatar from "../../components/UserAvatar.vue";
import AppTopBar from "../../components/AppTopBar.vue";
import AppRoleDrawer from "../../components/AppRoleDrawer.vue";

const auth = useAuthStore();

const drawerOpen = ref(false);

/* ---------- ค้นหา / กรอง ---------- */
const searchQuery = ref("");
const showCategoryFilter = ref(true);

const tabs = [
  { value: "all", label: "ทั้งหมด" },
  { value: "hirer", label: "ประกาศงาน" },
  { value: "worker", label: "บริการจากผู้รับจ้าง" },
];
const activeTab = ref("all");

const categories = [
  { id: "all", label: "ทั้งหมด", icon: "🗂️" },
  { id: "cleaning", label: "ทำความสะอาด", icon: "🧹" },
  { id: "delivery", label: "จัดส่ง", icon: "🛵" },
  { id: "tutoring", label: "ติว/การศึกษา", icon: "📘" },
  { id: "writing", label: "เขียน/พิมพ์เอกสาร", icon: "✍️" },
  { id: "it", label: "IT/โปรแกรมมิ่ง", icon: "💻" },
];
const activeCategory = ref("all");

/* ---------- ข้อมูลฟีด ----------
   FR-BROWSE-01/02: ดึง Job (จาก hirer รายอื่น) + Service Post (จาก worker) จาก backend จริง */
function formatWindow(start, end) {
  if (!start && !end) return "";
  const format = (value) => new Date(value).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
  return [start && format(start), end && format(end)].filter(Boolean).join(" - ");
}

function mapJob(job) {
  return {
    id: job._id,
    type: "hirer", // ประกาศงาน (Job) ของผู้ว่าจ้างรายอื่น — ดูได้แค่รายละเอียด
    category: job.category,
    name: job.hirer?.fullName || "ผู้ว่าจ้าง",
    avatarUrl: job.hirer?.avatarUrl,
    postedAt: new Date(job.createdAt),
    description: job.description || job.title || "-",
    price: Number(job.price || 0) + Number(job.deliveryFee || 0),
    priceLabel: "ค่าจ้าง",
    window: formatWindow(job.durationStart, job.durationEnd) || (job.scheduledAt ? new Date(job.scheduledAt).toLocaleString("th-TH") : "-"),
    eta: job.locationText || job.toText || "-",
  };
}

function mapServicePost(post, requests = []) {
  const deliveryModeLabels = { shopping: "รับหิ้ว", pickup_delivery: "รับของไปส่ง", passenger: "รับส่งผู้โดยสาร" };
  const existingRequest = requests
    .filter((request) => String(request.servicePost?._id || request.servicePost) === String(post._id) && ["pending", "accepted"].includes(request.status))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  return {
    id: post._id,
    type: "worker", // Service Post ของผู้รับจ้าง — กด "Hiring" เพื่อส่ง Service Request ได้
    isMine: String(post.worker?._id || post.worker?.id || post.worker || "") === String(auth.user?._id || auth.user?.id || ""),
    category: post.category,
    name: post.worker?.fullName || "ผู้รับจ้าง",
    avatarUrl: post.worker?.avatarUrl,
    postedAt: new Date(post.createdAt),
    description: [post.description || post.title || "-", post.category === "delivery" ? deliveryModeLabels[post.serviceType] || deliveryModeLabels.shopping : null].filter(Boolean).join(" · "),
    price: Number(post.fee || 0),
    priceLabel: post.category !== "delivery" ? "ค่าบริการ" : post.serviceType === "shopping" || !post.serviceType ? "ค่าจ้าง/ออร์เดอร์" : "ค่าจ้าง/เที่ยว",
    window: formatWindow(post.availabilityStart, post.availabilityEnd) || "-",
    eta: post.category === "delivery"
      ? (post.serviceRadiusMeters ? `รัศมี ${(post.serviceRadiusMeters / 1000).toFixed(1)} กม.` : "-")
      : post.locationLabel || "-",
    hiring: true,
    requestStatus: existingRequest?.status || "",
    requestJobId: existingRequest?.resultingJob?._id || existingRequest?.resultingJob || null,
  };
}

const posts = ref([]);
const myServiceRequests = ref([]);
const loading = ref(true);
const errorMsg = ref("");
let feedRefreshTimer;
let feedRequestId = 0;

async function loadFeed({ background = false } = {}) {
  if (background && loading.value) return;
  const requestId = ++feedRequestId;
  if (!background) {
    loading.value = true;
    errorMsg.value = "";
  }
  try {
    const [jobsResponse, servicePostsResponse, requestsResponse] = await Promise.all([
      api.get("/jobs", { params: { category: activeCategory.value === "all" ? undefined : activeCategory.value, search: searchQuery.value.trim() || undefined } }),
      api.get("/service-posts", { params: { category: activeCategory.value === "all" ? undefined : activeCategory.value } }),
      api.get("/service-posts/requests/my-as-hirer").catch(() => ({ data: [] })),
    ]);
    if (requestId !== feedRequestId) return;
    const jobs = Array.isArray(jobsResponse.data) ? jobsResponse.data : jobsResponse.data.jobs || [];
    const servicePosts = Array.isArray(servicePostsResponse.data) ? servicePostsResponse.data : servicePostsResponse.data.servicePosts || [];
    const requests = Array.isArray(requestsResponse.data) ? requestsResponse.data : [];
    myServiceRequests.value = requests;
    const alreadyAcceptedServicePostIds = new Set(requests
      .filter((request) => request.status === "accepted" || ["assigned", "in_progress", "awaiting_confirmation", "completed"].includes(request.resultingJob?.status))
      .map((request) => String(request.servicePost?._id || request.servicePost || "")));
    const availableServicePosts = servicePosts.filter((post) =>
      !belongsToAccount(post.worker, auth.user) &&
      !alreadyAcceptedServicePostIds.has(String(post._id)) &&
      post.status === "active" &&
      new Date(post.availabilityEnd).getTime() >= Date.now() &&
      Number(post.currentOrderCount || 0) < Number(post.maxSimultaneousOrders ?? Infinity),
    );
    // The public feed should only contain Hirer jobs that are still accepting
    // applications. Keep this guard in the UI as well as the API query so a
    // stale or broader API response cannot show completed jobs here.
    const openJobs = jobs.filter((job) => job.status === "waiting" && !belongsToAccount(job.hirer, auth.user));
    posts.value = [...openJobs.map(mapJob), ...availableServicePosts.map((post) => mapServicePost(post, requests))].sort((a, b) => b.postedAt - a.postedAt);
  } catch (err) {
    if (requestId === feedRequestId && !background) errorMsg.value = err.response?.data?.message || "โหลดฟีดประกาศไม่สำเร็จ";
  } finally {
    if (requestId === feedRequestId && !background) loading.value = false;
  }
}
onMounted(() => {
  loadFeed();
  feedRefreshTimer = window.setInterval(() => loadFeed({ background: true }), 10000);
});
onUnmounted(() => { feedRequestId += 1; window.clearInterval(feedRefreshTimer); });
watch([activeCategory, searchQuery], loadFeed);
watch([activeCategory, activeTab, searchQuery], () => { visiblePostCount.value = 10; });

const filteredPosts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return posts.value.filter((p) => {
    const matchesTab = activeTab.value === "all" || p.type === activeTab.value;
    const matchesCategory = activeCategory.value === "all" || p.category === activeCategory.value;
    const matchesSearch =
      !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    return matchesTab && matchesCategory && matchesSearch;
  });
});

const visiblePostCount = ref(10);
const visiblePosts = computed(() => filteredPosts.value.slice(0, visiblePostCount.value));
function showMorePosts() { visiblePostCount.value += 10; }
function resetFilters() {
  searchQuery.value = "";
  activeCategory.value = "all";
  activeTab.value = "all";
}
function categoryLabel(id) {
  return categories.find((category) => category.id === id)?.label || "อื่น ๆ";
}
const hasFilters = computed(() => !!searchQuery.value || activeCategory.value !== "all" || activeTab.value !== "all");
const priceFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

function timeAgo(date) {
  const diffMin = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMin < 1) return "เมื่อสักครู่";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชม.ที่แล้ว`;
  return `${Math.floor(diffHr / 24)} วันที่แล้ว`;
}

</script>

<template>
  <div class="page">
    <a class="skip-link" href="#hirer-content">ข้ามไปเนื้อหาหลัก</a>
    <AppTopBar role-label="ผู้ว่าจ้าง" @menu="drawerOpen = true" />
    <AppRoleDrawer v-model="drawerOpen" />

    <main id="hirer-content" class="main-content" tabindex="-1">
      <section class="welcome" aria-labelledby="welcome-title">
        <div class="welcome-copy">
          <p class="eyebrow">JANGDI · ให้ทุกวันง่ายขึ้น</p>
          <p class="greeting">สวัสดี {{ auth.user?.fullName || "ผู้ว่าจ้าง" }}</p>
          <h1 id="welcome-title">งานของคุณ<br />มีคนพร้อมช่วย</h1>
          <p class="intro">ค้นหาบริการที่ต้องการ หรือประกาศงาน<br class="desktop-break" />เพื่อให้ผู้รับจ้างเข้ามาสมัคร</p>
        </div>
        <aside class="start-card" aria-label="จัดการงานของคุณ">
          <span class="start-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="14" rx="3" /><path d="M9 7V5a3 3 0 0 1 6 0v2M4 13h16M10 13v3h4v-3" /></svg></span>
          <h2>อยากให้ช่วยเรื่องอะไร?</h2>
          <p>บอกสิ่งที่ต้องการ แล้วเริ่มหาคนช่วยได้เลย</p>
          <RouterLink to="/hirer/post-job" class="btn-primary post-job"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>ประกาศงานใหม่</RouterLink>
          <RouterLink to="/hirer/my-jobs" class="manage-link">ดูงานที่ฉันประกาศ</RouterLink>
        </aside>
      </section>

      <RouterLink class="request-history-link" :to="{ path: '/hirer/my-jobs', query: { view: 'services' } }">
        <span class="history-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2h6v2M9 10h6M9 15h4" /></svg></span>
        <span class="history-copy"><strong>คำขอใช้บริการของฉัน</strong><span>ดูคำขอและติดตามการตอบรับ</span></span>
        <span class="request-count">{{ loading ? '…' : myServiceRequests.length }}<span class="sr-only"> คำขอ</span></span>
      </RouterLink>

      <section class="browse" aria-labelledby="browse-title">
        <div class="section-heading"><div><p class="eyebrow">ค้นหาสิ่งที่ใช่</p><h2 id="browse-title">บริการและประกาศงาน</h2></div></div>
        <div class="search-controls">
          <div class="search-bar">
            <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <label for="hirer-search" class="sr-only">ค้นหาจากชื่อผู้ประกาศหรือรายละเอียด</label>
            <input aria-label="ค้นหาจากชื่อผู้ประกาศหรือรายละเอียด" id="hirer-search" v-model="searchQuery" type="search" placeholder="ค้นหาบริการ งาน หรือชื่อผู้ประกาศ" aria-describedby="search-help" />
          </div>
          <button :aria-pressed="showCategoryFilter" type="button" class="filter-btn" :class="{ active: showCategoryFilter }" :aria-expanded="showCategoryFilter" aria-controls="category-filters" @click="showCategoryFilter = !showCategoryFilter">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M7 12h10M10 19h4" /></svg>หมวดหมู่
          </button>
        </div>
        <p id="search-help" class="search-help">ค้นหาจากชื่อผู้ประกาศหรือคำในรายละเอียด แล้วเลือกหมวดหมู่เพื่อจำกัดผลลัพธ์</p>

        <div class="tabs" role="group" aria-label="ประเภทประกาศ">
          <button v-for="t in tabs" :key="t.value" type="button" :class="{ active: activeTab === t.value }" :aria-pressed="activeTab === t.value" @click="activeTab = t.value">{{ t.label }}</button>
        </div>
        <div v-show="showCategoryFilter" id="category-filters" class="categories" role="group" aria-label="หมวดหมู่งาน">
          <button v-for="c in categories" :key="c.id" type="button" :class="{ active: activeCategory === c.id }" :aria-pressed="activeCategory === c.id" @click="activeCategory = c.id"><span aria-hidden="true">{{ c.icon }}</span>{{ c.label }}</button>
        </div>

        <div class="feed-heading">
          <p role="status" aria-live="polite">{{ loading ? 'กำลังค้นหาประกาศ…' : errorMsg ? 'ยังแสดงประกาศไม่ได้' : `พบ ${filteredPosts.length} ประกาศ` }}</p>
          <button v-if="hasFilters" type="button" class="reset-btn" @click="resetFilters">ล้างตัวกรอง</button>
          <span v-else class="sort-label">ประกาศล่าสุดก่อน</span>
        </div>
        <section class="feed-list" aria-label="ผลการค้นหาประกาศ" :aria-busy="loading">
          <div v-if="loading" class="empty-state loading-state" role="status"><span class="loading-mark" aria-hidden="true"></span><h3>กำลังโหลดประกาศ</h3><p>รอสักครู่ เรากำลังค้นหางานและบริการให้คุณ</p></div>
          <div v-else-if="errorMsg" class="empty-state error-state" role="alert"><h3>โหลดประกาศไม่สำเร็จ</h3><p>{{ errorMsg }}</p><button type="button" class="btn-primary" @click="loadFeed()">ลองอีกครั้ง</button></div>
          <template v-else>
            <article v-for="post in visiblePosts" :key="`${post.type}-${post.id}`" class="card">
              <div class="card-top"><span class="type-badge" :class="{ service: post.type === 'worker' }">{{ post.type === 'worker' ? 'บริการจากผู้รับจ้าง' : 'ประกาศงาน' }}</span><span class="category-label">{{ categoryLabel(post.category) }}</span></div>
              <div class="person"><div class="card-avatar"><UserAvatar :src="post.avatarUrl" :name="post.name" :label="`รูปโปรไฟล์ ${post.name}`" /></div><div class="person-copy"><h3>{{ post.name }}</h3><span class="time">{{ timeAgo(post.postedAt) }}</span></div></div>
              <p class="desc">{{ post.description }}</p>
              <dl class="post-meta"><div><dt>ช่วงเวลา</dt><dd>{{ post.window === '-' ? 'ไม่ระบุเวลา' : post.window }}</dd></div><div><dt>พื้นที่บริการ / สถานที่</dt><dd>{{ post.eta === '-' ? 'ไม่ระบุพื้นที่' : post.eta }}</dd></div></dl>
              <div class="card-bottom"><div class="price"><span>{{ post.priceLabel }}</span><strong>฿{{ priceFormatter.format(post.price) }}</strong></div><div class="card-actions">
                <template v-if="post.type === 'worker'">
                  <RouterLink v-if="post.isMine" :to="`/hirer/service-posts/${post.id}`" class="btn-details">รายละเอียด</RouterLink>
                  <button v-else-if="post.requestStatus === 'pending'" type="button" class="btn-apply" disabled>รอผู้รับจ้างตอบรับ</button>
                  <RouterLink v-else-if="post.requestStatus === 'accepted' && post.requestJobId" :to="{ name: 'hirer-mock-payment', params: { id: post.requestJobId } }" class="btn-apply">ไปหน้าชำระเงิน</RouterLink>
                  <RouterLink v-else :to="`/hirer/hire/${post.id}`" class="btn-apply">รับบริการ</RouterLink>
                  <RouterLink v-if="!post.isMine" :to="`/hirer/service-posts/${post.id}`" class="btn-details">รายละเอียด</RouterLink>
                </template>
                <RouterLink v-else :to="post.isMine ? `/hirer/my-jobs/${post.id}` : `/hirer/jobs/${post.id}`" class="btn-details">รายละเอียด</RouterLink>
              </div></div>
            </article>
            <div v-if="!filteredPosts.length" class="empty-state"><span class="empty-icon" aria-hidden="true">⌕</span><h3>{{ hasFilters ? 'ยังไม่พบประกาศที่ตรงกัน' : 'ยังไม่มีประกาศในตอนนี้' }}</h3><p>{{ hasFilters ? 'ลองเปลี่ยนคำค้น หรือเลือกหมวดหมู่อื่นดูนะ' : 'กลับมาดูใหม่ได้ หรือประกาศงานเพื่อหาคนช่วยคุณ' }}</p><button v-if="hasFilters" type="button" class="btn-primary" @click="resetFilters">ดูประกาศทั้งหมด</button><RouterLink v-else to="/hirer/post-job" class="btn-primary">ประกาศงานใหม่</RouterLink></div>
          </template>
        </section>
        <div v-if="!loading && !errorMsg && filteredPosts.length" class="feed-footer"><p>แสดง {{ visiblePosts.length }} จาก {{ filteredPosts.length }} ประกาศ</p><button v-if="visiblePosts.length < filteredPosts.length" type="button" class="btn-details show-more" @click="showMorePosts">ดูประกาศเพิ่มเติม</button></div>
      </section>
      <p class="page-note">เจอบริการที่สนใจ? อ่านรายละเอียดก่อนส่งคำขอใช้บริการได้เลย</p>
    </main>
  </div>
</template>

<style scoped src="../../styles/marketplace.css"></style>
