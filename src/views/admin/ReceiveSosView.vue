<script setup>
// FR-ADMIN-07: Allow Admin to receive, monitor, and respond to SOS alerts platform-wide.
// FR-SOS-04: Allow Admin to view SOS details, contact the Worker, and mark the alert resolved.
// NFR-PERF-02: SOS alerts shall reach Admin within 1 minute of activation
// (this view would subscribe to a socket.io channel in the real implementation —
// see src/services/api.js / socket.io-client dependency already in package.json).
import { computed, ref } from "vue";

const period = ref("This Month");
const periods = ["Today", "This Week", "This Month"];

const activeFilter = ref("All"); // All | Pending | Complete
const filters = ["All", "Pending", "Complete"];
const expandedId = ref(null);

// TODO: แทนที่ mock ด้วย GET /api/admin/sos?period= และ subscribe socket "sos:new" (FR-ADMIN-07, NFR-PERF-02)
const alerts = ref([
  {
    id: "SOS-77",
    worker: "Korawan K.",
    message: "Reporting an incident",
    location: "Soi 4, near the campus dorm",
    time: "12 Aug 2026, 21:14",
    status: "Pending",
  },
  {
    id: "SOS-76",
    worker: "Ponlawat C.",
    message: "Vehicle broke down mid-delivery",
    location: "Highway 118, km 12",
    time: "10 Aug 2026, 18:02",
    status: "Complete",
  },
  {
    id: "SOS-74",
    worker: "Areeya S.",
    message: "Felt unsafe at job location",
    location: "Building C, 3rd floor",
    time: "4 Aug 2026, 20:47",
    status: "Complete",
  },
]);

const counts = computed(() => ({
  all: alerts.value.length,
  complete: alerts.value.filter((a) => a.status === "Complete").length,
  pending: alerts.value.filter((a) => a.status === "Pending").length,
}));

const filteredAlerts = computed(() =>
  activeFilter.value === "All" ? alerts.value : alerts.value.filter((a) => a.status === activeFilter.value)
);

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

function contactWorker(alert) {
  // TODO: เปิดช่องทางติดต่อ Worker โดยตรง (โทร/แชท) ตาม FR-SOS-04
  console.log("Contact worker", alert.worker);
}

function markResolved(alert) {
  // TODO: PATCH /api/admin/sos/:id/resolve (FR-SOS-04)
  alert.status = "Complete";
}
</script>

<template>
  <section class="sos">
    <p class="section-title">SOS Alert</p>

    <div class="card overview-card">
      <div class="overview-header">
        <span class="overview-title">SOS Alert overview</span>
        <select v-model="period" class="range-select">
          <option v-for="p in periods" :key="p">{{ p }}</option>
        </select>
      </div>
      <div class="overview-stats">
        <div class="overview-stat">
          <p class="overview-value">{{ counts.all }}</p>
          <p class="overview-label">All</p>
        </div>
        <div class="overview-stat">
          <p class="overview-value">{{ counts.complete }}</p>
          <p class="overview-label">Complete</p>
        </div>
        <div class="overview-stat">
          <p class="overview-value danger">{{ counts.pending }}</p>
          <p class="overview-label">Pending</p>
        </div>
      </div>
    </div>

    <nav class="tabs">
      <button v-for="f in filters" :key="f" :class="{ active: activeFilter === f }" @click="activeFilter = f">
        {{ f }}
      </button>
    </nav>

    <ul class="alert-list">
      <li v-for="a in filteredAlerts" :key="a.id" class="alert-item" :class="{ pending: a.status === 'Pending' }">
        <button class="alert-row" @click="toggleExpand(a.id)">
          <span class="alert-text">{{ a.worker }} <span class="dash">—</span> {{ a.message }}</span>
          <span class="status-badge" :class="a.status === 'Pending' ? 'red' : 'green'">{{ a.status }}</span>
          <span class="chevron" :class="{ open: expandedId === a.id }">⌄</span>
        </button>
        <div v-if="expandedId === a.id" class="alert-detail">
          <p class="detail-row"><span>Location</span><strong>{{ a.location }}</strong></p>
          <p class="detail-row"><span>Time</span><strong>{{ a.time }}</strong></p>
          <div class="action-row">
            <button class="action-btn ghost" @click="contactWorker(a)">Contact Worker</button>
            <button v-if="a.status === 'Pending'" class="action-btn primary" @click="markResolved(a)">
              Mark Resolved
            </button>
          </div>
        </div>
      </li>
      <li v-if="!filteredAlerts.length" class="empty">No SOS alerts in this view.</li>
    </ul>
  </section>
</template>

<style scoped>
.sos { padding: 16px; }
.section-title { margin: 0 0 12px; font-weight: 700; }

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
}
.overview-card { margin-bottom: 12px; }
.overview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.overview-title { font-size: 12px; color: var(--color-text-muted); font-weight: 600; }
.range-select {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 12px;
  background: var(--color-surface);
}
.overview-stats { display: flex; }
.overview-stat { flex: 1; text-align: center; border-left: 1px solid var(--color-border); }
.overview-stat:first-child { border-left: none; }
.overview-value { margin: 0; font-size: 22px; font-weight: 800; }
.overview-value.danger { color: var(--color-red); }
.overview-label { margin: 2px 0 0; font-size: 12px; color: var(--color-text-muted); }

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
.tabs button.active { background: var(--color-primary); color: #3a2a05; border-color: var(--color-primary); }

.alert-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.alert-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.alert-item.pending { border-color: var(--color-primary); }

.alert-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
}
.alert-text { flex: 1; font-size: 13px; font-weight: 600; }
.dash { color: var(--color-text-muted); font-weight: 400; }
.status-badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; color: white; flex-shrink: 0; }
.status-badge.red { background: var(--color-red); }
.status-badge.green { background: var(--color-green); }
.chevron { color: var(--color-text-muted); transition: transform 0.2s ease; }
.chevron.open { transform: rotate(180deg); }

.alert-detail { padding: 0 14px 14px; }
.detail-row { display: flex; justify-content: space-between; font-size: 13px; margin: 0 0 6px; }
.detail-row span { color: var(--color-text-muted); }
.action-row { display: flex; gap: 8px; margin-top: 10px; }
.action-btn {
  flex: 1;
  min-height: 40px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.action-btn.ghost { background: var(--color-bg); color: var(--color-text); }
.action-btn.primary { background: var(--color-primary); color: #3a2a05; }

.empty { text-align: center; color: var(--color-text-muted); padding: 20px 0; }
</style>