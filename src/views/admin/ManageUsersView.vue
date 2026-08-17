<script setup>
// FR-ADMIN-03: Allow Admin to view all users, filter by role, and suspend, warn,
// or clear a reported account.
import { computed, ref } from "vue";

const search = ref("");
const activeRole = ref("All"); // All | Hirer | Worker
const roles = ["All", "Hirer", "Worker"];

// TODO: แทนที่ mock ด้วย GET /api/admin/users?role=&q= (FR-ADMIN-03)
const users = ref([
  { id: "U-2031", name: "Korawan Kongkerd", role: "Hirer", status: "Active" },
  { id: "U-2028", name: "Wanlapa Mongkol", role: "Worker", status: "Active" },
  { id: "U-2019", name: "Thanawat Suriphan", role: "Worker", status: "Suspended" },
  { id: "U-2011", name: "Areeya Sirisak", role: "Hirer", status: "Active" },
  { id: "U-2004", name: "Ponlawat Chai", role: "Worker", status: "Active" },
]);

const filteredUsers = computed(() =>
  users.value.filter((u) => {
    const matchesRole = activeRole.value === "All" || u.role === activeRole.value;
    const matchesSearch = !search.value.trim() || u.name.toLowerCase().includes(search.value.toLowerCase());
    return matchesRole && matchesSearch;
  })
);

// TODO: แทนที่ mock ด้วย GET /api/admin/users/reported (บัญชีที่ถูกรายงาน)
const reportedAccount = ref({
  name: "Thanawat Suriphan",
  id: "U-2019",
  reportCount: 3,
  reason: "Repeated no-shows and job cancellation",
});

function statusAction(action) {
  // TODO: PATCH /api/admin/users/:id/status  { action: "suspend" | "warn" | "clear" } (FR-ADMIN-03)
  console.log(`${action} account`, reportedAccount.value.id);
}
</script>

<template>
  <section class="users">
    <div class="header-row">
      <p class="section-title">User Management</p>
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input v-model="search" type="text" placeholder="Search users" />
      </div>
    </div>

    <nav class="tabs">
      <button v-for="r in roles" :key="r" :class="{ active: activeRole === r }" @click="activeRole = r">
        {{ r }}
      </button>
    </nav>

    <ul class="user-list">
      <li v-for="u in filteredUsers" :key="u.id" class="user-row">
        <div class="avatar-circle">👤</div>
        <div class="user-body">
          <p class="user-name">{{ u.name }}</p>
          <p class="user-meta">{{ u.id }} · {{ u.role }}</p>
        </div>
        <span class="status-badge" :class="u.status === 'Active' ? 'green' : 'red'">{{ u.status }}</span>
      </li>
      <li v-if="!filteredUsers.length" class="empty">No users match this filter.</li>
    </ul>

    <div class="card reported-card">
      <p class="card-title">Reported <span class="dash">—</span> {{ reportedAccount.name }}</p>
      <p class="report-count">Reported {{ reportedAccount.reportCount }} times</p>
      <p class="report-reason">{{ reportedAccount.reason }}</p>
      <div class="action-row">
        <button class="action-btn suspend" @click="statusAction('suspend')">Suspend</button>
        <button class="action-btn warn" @click="statusAction('warn')">Warning</button>
        <button class="action-btn clear" @click="statusAction('clear')">Clear / Reject</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.users { padding: 16px; }
.header-row { margin-bottom: 12px; }
.section-title { margin: 0 0 8px; font-weight: 700; }
.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 8px 14px;
}
.search-box input { border: none; outline: none; flex: 1; font-size: 14px; background: transparent; }
.search-icon { opacity: 0.6; }

.tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.tabs button {
  flex: 1;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-weight: 600;
  color: var(--color-text-muted);
}
.tabs button.active {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  border-color: var(--color-primary);
}

.user-list { list-style: none; margin: 0 0 16px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.user-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
}
.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.user-body { flex: 1; min-width: 0; }
.user-name { margin: 0; font-weight: 600; font-size: 14px; }
.user-meta { margin: 2px 0 0; font-size: 12px; color: var(--color-text-muted); }

.status-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  color: white;
  flex-shrink: 0;
}
.status-badge.green { background: var(--color-green); }
.status-badge.red { background: var(--color-red); }

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
}
.card-title { font-weight: 700; margin: 0 0 6px; font-size: 14px; }
.dash { color: var(--color-text-muted); }
.report-count { margin: 0 0 4px; font-size: 13px; font-weight: 700; color: var(--color-red); }
.report-reason { margin: 0 0 12px; font-size: 13px; color: var(--color-text-muted); }

.action-row { display: flex; gap: 8px; flex-wrap: wrap; }
.action-btn {
  flex: 1;
  min-height: 44px;
  min-width: 90px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.action-btn.suspend { background: var(--color-red-bg); color: var(--color-red); }
.action-btn.warn { background: var(--color-primary-light); color: var(--color-primary-dark); }
.action-btn.clear { background: var(--color-bg); color: var(--color-text); }

.empty { text-align: center; color: var(--color-text-muted); padding: 20px 0; }
</style>