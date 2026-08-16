<script setup>
// FR-ADMIN-01: Admin dashboard summarising total users, total posts, pending posts,
// active SOS alerts, posting-activity trends, and a monthly finance summary.
import { computed, ref } from "vue";

// TODO: แทนที่ mock ด้วย GET /api/admin/dashboard (FR-ADMIN-01)
const stats = ref({
  totalUsers: 47,
  newUsersToday: 14,
  totalPosts: 89,
  newPostsToday: 9,
  pendingPosts: 4,
  activeSos: 1,
});

const chartRange = ref("Weekly");
const weeklyActivity = ref([
  { day: "Mon", value: 40 },
  { day: "Tue", value: 65 },
  { day: "Wed", value: 55 },
  { day: "Thu", value: 80 },
  { day: "Fri", value: 22 },
  { day: "Sat", value: 18 },
  { day: "Sun", value: 20 },
]);
const maxActivity = computed(() => Math.max(...weeklyActivity.value.map((d) => d.value)));

const finance = ref({
  totalJobValue: 48350,
  platformFeeEarned: 3680,
  heldInEscrow: 6540,
  refundsDisbursed: 420,
});

function money(n) {
  return `฿${n.toLocaleString("en-US")}`;
}
</script>

<template>
  <section class="dashboard">
    <h1>Dashboard</h1>

    <!-- Stat cards: All Users / All Posts / Pending / SOS Active -->
    <div class="stat-grid">
      <div class="stat-card fill-primary">
        <p class="stat-label">All Users</p>
        <p class="stat-value">{{ stats.totalUsers }}</p>
        <p class="stat-sub">+{{ stats.newUsersToday }} today</p>
      </div>
      <div class="stat-card fill-muted">
        <p class="stat-label">All Posts</p>
        <p class="stat-value">{{ stats.totalPosts }}</p>
        <p class="stat-sub">+{{ stats.newPostsToday }} posts</p>
      </div>
      <RouterLink to="/admin/posts" class="stat-card outline">
        <p class="stat-label">Pending</p>
        <p class="stat-value">{{ stats.pendingPosts }}</p>
        <p class="stat-sub">Posts</p>
      </RouterLink>
      <RouterLink to="/admin/sos" class="stat-card outline">
        <p class="stat-label">SOS Active</p>
        <p class="stat-value">{{ stats.activeSos }}</p>
        <p class="stat-sub">Alert</p>
      </RouterLink>
    </div>

    <!-- Posting-activity trend chart -->
    <div class="card">
      <div class="card-header">
        <p class="card-title">Work Chart</p>
        <select v-model="chartRange" class="range-select">
          <option>Weekly</option>
          <option>Monthly</option>
        </select>
      </div>
      <div class="bars">
        <div v-for="d in weeklyActivity" :key="d.day" class="bar-col">
          <div class="bar" :style="{ height: (d.value / maxActivity) * 100 + '%' }"></div>
          <span class="bar-label">{{ d.day }}</span>
        </div>
      </div>
    </div>

    <!-- Monthly finance summary -->
    <div class="card">
      <p class="card-title">Monthly Finance Summary</p>
      <dl class="finance-list">
        <div class="finance-row">
          <dt>Total job value</dt>
          <dd>{{ money(finance.totalJobValue) }}</dd>
        </div>
        <div class="finance-row">
          <dt>Platform fee earned</dt>
          <dd class="positive">+{{ money(finance.platformFeeEarned) }}</dd>
        </div>
        <div class="finance-row">
          <dt>Held in escrow</dt>
          <dd class="neutral">{{ money(finance.heldInEscrow) }}</dd>
        </div>
        <div class="finance-row">
          <dt>Refunds disbursed</dt>
          <dd class="negative">-{{ money(finance.refundsDisbursed) }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.dashboard { padding: 16px; }
h1 { font-size: 20px; margin: 4px 0 16px; }

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.stat-card {
  border-radius: var(--radius-lg);
  padding: 14px;
  text-decoration: none;
  color: inherit;
  display: block;
}
.stat-label { margin: 0; font-size: 13px; opacity: 0.85; }
.stat-value { margin: 6px 0 2px; font-size: 26px; font-weight: 800; }
.stat-sub { margin: 0; font-size: 12px; opacity: 0.75; }

.fill-primary { background: var(--color-primary); color: #3a2a05; }
.fill-muted { background: #8b8f98; color: white; }
.outline {
  background: var(--color-surface);
  border: 1.5px solid var(--color-primary);
  color: var(--color-text);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
  margin-bottom: 14px;
}
.card-header { display: flex; align-items: center; justify-content: space-between; }
.card-title { font-weight: 700; margin: 0 0 10px; font-size: 14px; }
.range-select {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 12px;
  background: var(--color-surface);
}

.bars {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 110px;
  padding-top: 8px;
}
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.bar {
  width: 100%;
  max-width: 26px;
  background: var(--color-primary);
  border-radius: 6px 6px 2px 2px;
  min-height: 4px;
  transition: height 0.3s ease;
}
.bar-label { margin-top: 6px; font-size: 11px; color: var(--color-text-muted); }

.finance-list { margin: 0; }
.finance-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 14px;
}
.finance-row:last-child { border-bottom: none; }
.finance-row dt { color: var(--color-text-muted); font-weight: 400; }
.finance-row dd { margin: 0; font-weight: 700; }
.positive { color: var(--color-green); }
.negative { color: var(--color-red); }
.neutral { color: var(--color-primary-dark); }
</style>