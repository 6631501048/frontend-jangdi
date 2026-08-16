<script setup>
// FR-BROWSE-01: ฟีดที่เลื่อนดูได้ของ "ประกาศงาน" (Job, จากผู้ว่าจ้าง) + "Service Post" (จากผู้รับจ้าง)
// FR-BROWSE-02: กรองตามประเภทประกาศ (ทั้งหมด/ผู้ว่าจ้าง/ผู้รับจ้าง) และตามหมวดหมู่
// FR-BROWSE-03/04: ดูรายละเอียดก่อนสมัคร + สมัครงาน (เฉพาะประกาศงานแบบ Job เข้าคิว JOB_WAITING)
// FR-BROWSE-06: ห้ามสมัคร Service Post ของตัวเอง หรืองานที่เลือกผู้รับจ้างแล้ว (เช็คตอนเรียก API จริง)
import { computed, ref } from "vue";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();

/* ---------- ส่วนบน: เมนู/โปรไฟล์ ---------- */
const drawerOpen = ref(false);
const drawerItems = [
  { label: "หน้าแรก", icon: "home", to: "/worker" },
  { label: "งานของฉัน", icon: "briefcase", to: "/worker/jobs" },
  { label: "บริการของฉัน", icon: "sparkle", to: "/worker/service-posts" },
  { label: "การชำระเงิน", icon: "wallet", to: "/worker/payment" },
];

// TODO NFR-USE-04: สลับบทบาทผู้ว่าจ้าง/ผู้รับจ้าง — ต้องเรียก PATCH /api/users/me/role แล้วอัปเดต auth.user.currentRole
function switchRole() {
  drawerOpen.value = false;
  alert("TODO: สลับบทบาทเป็นผู้ว่าจ้าง");
}
function logout() {
  auth.logout();
  drawerOpen.value = false;
}

/* ---------- ค้นหา / กรอง ---------- */
const searchQuery = ref("");
const showCategoryFilter = ref(true);

const tabs = [
  { value: "all", label: "ทั้งหมด" },
  { value: "hirer", label: "ผู้ว่าจ้าง" },
  { value: "worker", label: "ผู้รับจ้าง" },
];
const activeTab = ref("all");

const categories = [
  { id: "all", label: "ทั้งหมด", icon: "🗂️" },
  { id: "cleaning", label: "ทำความสะอาด", icon: "🧹" },
  { id: "delivery", label: "จัดส่ง", icon: "🛵" },
  { id: "tutoring", label: "ติว/การศึกษา", icon: "📘" },
  { id: "writing", label: "เขียน/พิมพ์เอกสาร", icon: "✍️" },
  { id: "errands", label: "งานจิปาถะ", icon: "🏃" },
  { id: "it", label: "IT/โปรแกรมมิ่ง", icon: "💻" },
];
const activeCategory = ref("all");

/* ---------- ข้อมูลฟีด ----------
   TODO: แทนที่ mock นี้ด้วย GET /api/jobs?type={activeTab}&category={activeCategory}&search={searchQuery}
   (รวมทั้งประกาศงานประเภท Job และ Service Post ตาม FR-BROWSE-01) */
function minutesAgo(mins) {
  return new Date(Date.now() - mins * 60 * 1000);
}
const posts = ref([
  {
    id: "j1",
    type: "hirer", // ประกาศงาน (Job) — ผู้รับจ้างสมัครได้
    category: "delivery",
    name: "Pitak",
    postedAt: minutesAgo(60),
    description: "ไปรับพัสดุที่ไปรษณีย์ MFU แล้วนำไปส่งที่ตึก E1 ให้หน่อย",
    price: 50,
    window: "1 ชม.",
    eta: "20 นาที",
    status: "เปิดรับสมัคร",
  },
  {
    id: "j2",
    type: "hirer",
    category: "delivery",
    name: "Thanawit",
    postedAt: minutesAgo(45),
    description: "กำลังหาคนไปรับอาหารที่ร้าน Hachikyu ให้หน่อย",
    price: 50,
    window: "1 ชม.",
    eta: "20 นาที",
    status: "เปิดรับสมัคร",
  },
  {
    id: "j3",
    type: "hirer",
    category: "writing",
    name: "Chanidapa",
    postedAt: minutesAgo(20),
    description: "อยากได้คนช่วยปริ้นเอกสาร 20 หน้า",
    price: 30,
    window: "1 ชม.",
    eta: "15 นาที",
    status: "เปิดรับสมัคร",
  },
  {
    id: "s1",
    type: "worker", // Service Post — ต้องกด Details เพื่อดูรายละเอียด/ขอใช้บริการ
    category: "delivery",
    name: "Somsak",
    postedAt: minutesAgo(5),
    description: "จะไปซื้อข้าวมันไก่ที่หลิงลิน ใครอยากฝากซื้อบ้าง?",
    price: 10,
    window: "30 นาที",
    eta: "5 นาที",
    status: "รับออเดอร์อยู่",
  },
  {
    id: "s2",
    type: "worker",
    category: "cleaning",
    name: "Mo",
    postedAt: minutesAgo(9),
    description: "จะไปซักผ้าที่ร้านสะดวกซัก มีใครอยากฝากซักด้วยไหม?",
    price: 20,
    window: "45 นาที",
    eta: "10 นาที",
    status: "รับออเดอร์อยู่",
  },
  {
    id: "s3",
    type: "worker",
    category: "errands",
    name: "Modeng",
    postedAt: minutesAgo(12),
    description: "จะไปตลาดหน้ามหาลัย มีใครอยากฝากซื้ออะไรไหม?",
    price: 10,
    window: "40 นาที",
    eta: "12 นาที",
    status: "รับออเดอร์อยู่",
  },
]);

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

function timeAgo(date) {
  const diffMin = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMin < 1) return "เมื่อสักครู่";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชม.ที่แล้ว`;
  return `${Math.floor(diffHr / 24)} วันที่แล้ว`;
}

/* ---------- การกระทำ ---------- */
function applyToJob(post) {
  // TODO FR-BROWSE-04: POST /api/jobs/{post.id}/apply → เพิ่มเข้าคิว JOB_WAITING
  // FR-BROWSE-05 อนุญาตให้สมัครได้หลายงานพร้อมกัน จึงไม่ต้อง disable ปุ่มของงานอื่น
  alert(`TODO: สมัครงาน "${post.description}"`);
}

const unreadCount = ref(4); // TODO FR-NOTIF-03: ดึงจาก GET /api/notifications/unread-count
</script>

<template>
  <div class="page">
    <!-- แถบด้านบน -->
    <header class="topbar">
      <button class="icon-btn" aria-label="เปิดเมนู" @click="drawerOpen = true">
        <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </button>
      <div class="brand">
        <span class="brand-icon">👥</span>
        <span class="brand-name">JangDi</span>
      </div>
      <RouterLink to="/worker/profile" class="avatar-btn" aria-label="โปรไฟล์ของฉัน">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
      </RouterLink>
    </header>

    <!-- Drawer เมนู (ตาม Frame 889) -->
    <Transition name="fade">
      <div v-if="drawerOpen" class="backdrop" @click="drawerOpen = false"></div>
    </Transition>
    <Transition name="slide">
      <nav v-if="drawerOpen" class="drawer">
        <div class="drawer-brand">
          <span class="brand-icon">👥</span>
          <span class="brand-name">JangDi</span>
        </div>
        <RouterLink
          v-for="item in drawerItems"
          :key="item.label"
          :to="item.to"
          class="drawer-link"
          @click="drawerOpen = false"
        >{{ item.label }}</RouterLink>
        <button class="drawer-link" @click="switchRole">สลับบทบาท</button>
        <button class="drawer-link logout" @click="logout">ออกจากระบบ</button>
      </nav>
    </Transition>

    <!-- ทักทาย + ค้นหา -->
    <div class="search-row">
      <p class="greeting">Hello! {{ auth.user?.fullName || "Thanawit" }}</p>
      <div class="search-bar">
        <svg class="search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input v-model="searchQuery" type="search" placeholder="ค้นหา" />
        <button
          class="filter-btn"
          :class="{ active: showCategoryFilter }"
          aria-label="ตัวกรองหมวดหมู่"
          @click="showCategoryFilter = !showCategoryFilter"
        >
          <svg viewBox="0 0 24 24"><path d="M4 5h16M7 12h10M10 19h4" /></svg>
        </button>
      </div>
    </div>

    <!-- แท็บ: ทั้งหมด / ผู้ว่าจ้าง / ผู้รับจ้าง (FR-BROWSE-02) -->
    <nav class="tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        :class="{ active: activeTab === t.value }"
        @click="activeTab = t.value"
      >{{ t.label }}</button>
    </nav>

    <!-- หมวดหมู่ (FR-BROWSE-02) -->
    <div v-if="showCategoryFilter" class="categories">
      <button
        v-for="c in categories"
        :key="c.id"
        :class="{ active: activeCategory === c.id }"
        @click="activeCategory = c.id"
      >
        <span class="cat-icon">{{ c.icon }}</span>{{ c.label }}
      </button>
    </div>

    <!-- ฟีดประกาศ -->
    <section class="feed-list">
      <article v-for="post in filteredPosts" :key="post.id" class="card">
        <div class="card-avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
        </div>
        <div class="card-body">
          <div class="card-head">
            <span class="name">{{ post.name }}</span>
            <span class="time">{{ timeAgo(post.postedAt) }}</span>
          </div>
          <p class="desc">{{ post.description }}</p>
          <div class="tags">
            <span class="tag">฿{{ post.price }}</span>
            <span class="tag">ภายใน {{ post.window }}</span>
            <span class="tag">{{ post.eta }}</span>
          </div>
        </div>
        <div class="card-actions">
          <button v-if="post.type === 'hirer'" class="btn-apply" @click="applyToJob(post)">สมัคร</button>
          <RouterLink :to="`/worker/jobs/${post.id}`" class="btn-details">รายละเอียด</RouterLink>
        </div>
      </article>

      <p v-if="!filteredPosts.length" class="empty">ไม่พบประกาศที่ตรงกับตัวกรองของคุณ</p>
    </section>

    <!-- ปุ่มสร้างประกาศใหม่ -->
    <RouterLink to="/worker/service-posts/new" class="fab" aria-label="สร้างประกาศใหม่">
      <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
    </RouterLink>

    <!-- แถบล่าง -->
    <footer class="bottom-nav">
      <button class="nav-item">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span>ถาม</span>
      </button>
      <RouterLink to="/worker" class="nav-item">
        <svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>
        <span>หน้าแรก</span>
      </RouterLink>
      <button class="nav-item">
        <svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 21a2 2 0 004 0" /></svg>
        <span v-if="unreadCount" class="badge">{{ unreadCount }}</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
:root { --gold: #ffc93c; }

.page {
  position: relative;
  min-height: 100vh;
  padding-bottom: 76px;
  background: #f0f0f0;
  font-family: inherit;
}

svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ---------- Top bar ---------- */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid #eee;
}
.icon-btn, .avatar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 50%;
  color: #111;
  cursor: pointer;
}
.avatar-btn { border: 1px solid #111; }
.brand { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 18px; }
.brand-icon { font-size: 18px; }
.brand-name { color: #111; }

/* ---------- Drawer ---------- */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 20;
}
.drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 78%;
  max-width: 300px;
  background: #fff;
  z-index: 21;
  padding: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
}
.drawer-brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 18px; margin-bottom: 16px; }
.drawer-link {
  display: block;
  text-align: left;
  padding: 12px 8px;
  min-height: 44px;
  border: none;
  background: transparent;
  border-bottom: 1px solid #f2f2f2;
  color: #111;
  text-decoration: none;
  font-size: 15px;
  cursor: pointer;
}
.drawer-link.logout { color: #d33; margin-top: auto; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform 0.2s; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }

/* ---------- Search row ---------- */
.search-row { padding: 12px 16px 0; }
.greeting { margin: 0 0 8px; font-weight: 700; font-size: 15px; color: #111; }
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 0 10px;
  min-height: 44px;
}
.search-icon { color: #999; flex-shrink: 0; }
.search-bar input {
  flex: 1;
  border: none;
  outline: none;
  min-height: 44px;
  font-size: 14px;
  background: transparent;
}
.filter-btn {
  border: none;
  background: transparent;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;
}
.filter-btn.active { color: #111; background: #ffe9a8; }

/* ---------- Tabs ---------- */
.tabs {
  display: flex;
  margin: 12px 16px 0;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #eee;
}
.tabs button {
  flex: 1;
  min-height: 44px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #555;
  cursor: pointer;
  border-bottom: 3px solid transparent;
}
.tabs button.active {
  color: #111;
  font-weight: 700;
  border-bottom-color: #ffc93c;
}

/* ---------- Categories ---------- */
.categories {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 10px 16px;
  scrollbar-width: none;
}
.categories::-webkit-scrollbar { display: none; }
.categories button {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid #e0d3a3;
  background: #fff8e6;
  color: #7a5c00;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
}
.categories button.active { background: #ffc93c; border-color: #ffc93c; color: #111; font-weight: 700; }
.cat-icon { font-size: 14px; }

/* ---------- Feed list ---------- */
.feed-list { padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 10px; }
.card {
  display: flex;
  gap: 10px;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.card-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
}
.card-body { flex: 1; min-width: 0; }
.card-head { display: flex; align-items: baseline; gap: 6px; }
.name { font-weight: 700; font-size: 14px; color: #111; }
.time { font-size: 11px; color: #999; }
.desc {
  margin: 4px 0 8px;
  font-size: 13px;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag {
  background: #eee;
  color: #444;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 10px;
}
.card-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
}
.btn-apply, .btn-details {
  min-height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-apply { background: #ffc93c; border: none; color: #111; }
.btn-details { background: #fff; border: 1px solid #ccc; color: #111; }

.empty { text-align: center; color: #888; margin-top: 40px; font-size: 14px; }

/* ---------- FAB ---------- */
.fab {
  position: fixed;
  right: 20px;
  bottom: 84px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #ffc93c;
  border: 2px solid #111;
  color: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
  z-index: 5;
}

/* ---------- Bottom nav ---------- */
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: #fff;
  border-top: 1px solid #eee;
  padding: 6px 0;
  z-index: 6;
}
.nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 44px;
  min-width: 44px;
  border: none;
  background: transparent;
  color: #333;
  font-size: 11px;
  text-decoration: none;
  cursor: pointer;
}
.badge {
  position: absolute;
  top: -2px;
  right: 8px;
  background: #e11d48;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}
</style>