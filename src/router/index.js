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