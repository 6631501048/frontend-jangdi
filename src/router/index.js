import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", name: "login", component: () => import("../views/auth/LoginView.vue") },
  { path: "/register", name: "register", component: () => import("../views/auth/RegisterView.vue") },
  { path: "/verify-email", name: "verify-email", component: () => import("../views/auth/VerifyEmailView.vue") },

  // Hirer (FR-JOB-*)
  {
    path: "/hirer",
    name: "hirer-dashboard",
    component: () => import("../views/hirer/HirerDashboard.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    path: "/hirer/post-job",
    name: "post-job",
    component: () => import("../views/hirer/HirerPostJobView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    // FR-JOB-08: งานที่ประกาศ จัดกลุ่มตามสถานะ (Waiting / In Progress / Completed / Cancelled)
    path: "/hirer/my-jobs",
    name: "hirer-my-jobs",
    component: () => import("../views/hirer/HirerMyJobsView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    // ดูรายละเอียด "งานของตัวเอง" ก่อนไปเลือกผู้สมัคร (คนละหน้ากับ hirer-browse-job-detail ด้านล่าง)
    path: "/hirer/my-jobs/:id",
    name: "hirer-job-detail",
    component: () => import("../views/hirer/HirerMyJobDetailView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    path: "/hirer/my-jobs/:id/applicants",
    name: "hirer-applicants",
    component: () => import("../views/hirer/HirerApplicantsView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    path: "/hirer/my-jobs/:id/applicants/:workerId/confirm",
    name: "hirer-confirm-selection",
    component: () => import("../views/hirer/HirerConfirmSelectionView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    path: "/hirer/my-jobs/:id/confirmed",
    name: "hirer-job-confirmed",
    component: () => import("../views/hirer/HirerJobConfirmedView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    path: "/hirer/my-jobs/:id/review",
    name: "hirer-review",
    component: () => import("../views/hirer/HirerReviewWorkerView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    path: "/hirer/my-jobs/:id/refund",
    name: "hirer-refund",
    component: () => import("../views/hirer/HirerRefundRequestView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    // ดูรายละเอียดงาน "ของผู้ว่าจ้างรายอื่น" ในฟีด (อ่านอย่างเดียว) — คนละหน้ากับ hirer-job-detail (งานของตัวเอง)
    path: "/hirer/jobs/:id",
    name: "hirer-browse-job-detail",
    component: () => import("../views/hirer/HirerBrowseJobDetailView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    path: "/hirer/hire/:id",
    name: "hirer-hire-service",
    component: () => import("../views/hirer/HirerHireServiceView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    path: "/hirer/payment",
    name: "hirer-payment",
    component: () => import("../views/hirer/HirerPaymentView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },

  // Worker (FR-BROWSE-*, FR-TRACK-*)
  {
    path: "/worker",
    name: "worker-dashboard",
    component: () => import("../views/worker/WorkerDashboard.vue"),
    meta: { requiresAuth: true, role: "worker" },
  },
  {
    path: "/worker/feed",
    name: "job-feed",
    component: () => import("../views/worker/WorkerJobFeedView.vue"),
    meta: { requiresAuth: true, role: "worker" },
  },
  {
    path: "/worker/jobs",
    name: "worker-my-jobs",
    component: () => import("../views/worker/WorkerMyJobsView.vue"),
    meta: { requiresAuth: true, role: "worker" },
  },
  {
    path: "/worker/jobs/:id",
    name: "worker-job-detail",
    component: () => import("../views/worker/WorkerJobDetailView.vue"),
    meta: { requiresAuth: true, role: "worker" },
  },
  {
    path: "/worker/jobs/:id/tracking",
    name: "worker-job-tracking",
    component: () => import("../views/worker/WorkerJobTrackingView.vue"),
    meta: { requiresAuth: true, role: "worker" },
  },
  {
    path: "/worker/jobs/:id/review",
    name: "worker-review-hirer",
    component: () => import("../views/worker/WorkerReviewHirerView.vue"),
    meta: { requiresAuth: true, role: "worker" },
  },
  {
    path: "/worker/service-posts",
    name: "worker-my-service-posts",
    component: () => import("../views/worker/WorkerMyServicePostView.vue"),
    meta: { requiresAuth: true, role: "worker" },
  },
  {
    path: "/worker/service-posts/new",
    name: "worker-post-service",
    component: () => import("../views/worker/WorkerCreateServicePostView.vue"),
    meta: { requiresAuth: true, role: "worker" },
  },
  {
    path: "/worker/service-requests/:id",
    name: "worker-service-request-detail",
    component: () => import("../views/worker/WorkerServiceRequestDetailView.vue"),
    meta: { requiresAuth: true, role: "worker" },
  },
  {
    path: "/worker/payment",
    name: "worker-payment",
    component: () => import("../views/worker/WorkerPaymentView.vue"),
    meta: { requiresAuth: true, role: "worker" },
  },

  // Profile — ใช้ร่วมกันระหว่าง Hirer และ Worker (บัญชีเดียวสลับ role ได้ตาม FR-AUTH-06)
  // ไม่ผูก meta.role เพราะเนื้อหาในหน้าไม่มีอะไรเฉพาะ role ใดเลย (FR-PROF-01/02/03, FR-REV-04)
  {
    path: "/profile",
    name: "profile",
    component: () => import("../views/ProfileView.vue"),
    meta: { requiresAuth: true },
  },

  // Admin (FR-ADMIN-*) — shared AdminLayout (topbar + drawer) wraps every admin screen
  {
    path: "/admin",
    component: () => import("../views/admin/AdminLayout.vue"),
    meta: { requiresAuth: true, adminOnly: true },
    children: [
      { path: "", redirect: { name: "admin-dashboard" } },
      {
        path: "dashboard",
        name: "admin-dashboard",
        component: () => import("../views/admin/DashboardView.vue"), // FR-ADMIN-01
      },
      {
        path: "jobs",
        name: "admin-jobs",
        component: () => import("../views/admin/BrowseJobsView.vue"), // "Home" — browse all posts
      },
      {
        path: "users",
        name: "admin-users",
        component: () => import("../views/admin/ManageUsersView.vue"), // FR-ADMIN-03
      },
      {
        path: "posts",
        name: "admin-posts",
        component: () => import("../views/admin/ManagePostsView.vue"), // FR-ADMIN-02
      },
      {
        path: "payments",
        name: "admin-payments",
        component: () => import("../views/admin/ProcessPaymentView.vue"), // FR-ADMIN-04, FR-ADMIN-05
      },
      {
        path: "reports",
        name: "admin-reports",
        component: () => import("../views/admin/HandleReportsView.vue"), // FR-ADMIN-06
      },
      {
        path: "sos",
        name: "admin-sos",
        component: () => import("../views/admin/ReceiveSosView.vue"), // FR-ADMIN-07, FR-SOS-04
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Route guard:
// 1) ต้อง login ก่อนถึงจะเข้าหน้าที่ requiresAuth ได้
// 2) ถ้า login แล้วแต่ยังกรอกโปรไฟล์ไม่ครบ (FR-AUTH-05) บังคับไปหน้า register (กรอกโปรไฟล์) ก่อนเสมอ
// 3) หน้าที่ผูกกับ role เฉพาะ (meta.role) ถ้า currentRole ไม่ตรง ให้เด้งไป dashboard ของ role ปัจจุบันแทน
// 4) หน้า Admin ต้องเป็น isAdmin เท่านั้น (คง logic เดิม ครอบคลุม nested route ทุกอันใต้ /admin ด้วย)
router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: "login" };
  }

  if (
    auth.isLoggedIn &&
    !auth.isProfileComplete &&
    to.name !== "register" &&
    to.name !== "login"
  ) {
    return { name: "register" };
  }

  if (to.meta.adminOnly && !auth.user?.isAdmin) {
    return { name: "login" };
  }

  if (to.meta.role && auth.currentRole !== to.meta.role) {
    return { name: auth.currentRole === "worker" ? "worker-dashboard" : "hirer-dashboard" };
  }
});

export default router;