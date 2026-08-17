import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", name: "login", component: () => import("../views/auth/LoginView.vue") },
  { path: "/register", name: "register", component: () => import("../views/auth/RegisterView.vue") },

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
    component: () => import("../views/hirer/PostJobView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    path: "/hirer/jobs/:id",
    name: "hirer-job-detail",
    component: () => import("../views/hirer/JobDetailView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    // FR-MATCH-03
    path: "/hirer/jobs/:id/applicants",
    name: "hirer-applicants",
    component: () => import("../views/hirer/ApplicantsView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    // FR-MATCH-04, FR-PAY-01
    path: "/hirer/jobs/:id/applicants/:workerId/confirm",
    name: "hirer-confirm-selection",
    component: () => import("../views/hirer/ConfirmSelectionView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    // FR-MATCH-06
    path: "/hirer/jobs/:id/confirmed",
    name: "hirer-job-confirmed",
    component: () => import("../views/hirer/JobConfirmedView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    // FR-REV-01
    path: "/hirer/jobs/:id/review",
    name: "hirer-review",
    component: () => import("../views/hirer/ReviewView.vue"),
    meta: { requiresAuth: true, role: "hirer" },
  },
  {
    // FR-JOB-07, FR-PAY-06
    path: "/hirer/jobs/:id/refund",
    name: "hirer-refund",
    component: () => import("../views/hirer/RefundRequestView.vue"),
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
    component: () => import("../views/worker/JobFeedView.vue"),
    meta: { requiresAuth: true, role: "worker" },
  },

  // Admin (FR-ADMIN-*)
  {
    path: "/admin",
    name: "admin-dashboard",
    component: () => import("../views/admin/AdminDashboard.vue"),
    meta: { requiresAuth: true, adminOnly: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Route guard พื้นฐาน — ต่อยอด logic จริงตอน implement auth ให้ครบ
router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: "login" };
  }
  if (to.meta.adminOnly && !auth.user?.isAdmin) {
    return { name: "login" };
  }
});

export default router;