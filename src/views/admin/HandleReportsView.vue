<script setup>
// FR-ADMIN-06: Allow Admin to view, investigate, and resolve user-submitted misconduct reports.
import { computed, ref } from "vue";

const statusFilter = ref("All Status");
const filters = ["All Status", "Pending", "Resolved"];
const expandedId = ref(null);

// TODO: แทนที่ mock ด้วย GET /api/admin/reports (FR-ADMIN-06)
const reports = ref([
  {
    id: "RPT-901",
    title: "Inappropriate content or behavior",
    jobId: "J-1023-BHO",
    reportedBy: "Worker · Nichakan S.",
    detail: "Reporter says the Hirer used abusive language in chat during job negotiation.",
    status: "Pending",
  },
  {
    id: "RPT-898",
    title: "No-show at scheduled job",
    jobId: "J-1010-KLM",
    reportedBy: "Hirer · Peerapat W.",
    detail: "Worker did not show up and did not respond to messages for over an hour.",
    status: "Pending",
  },
  {
    id: "RPT-880",
    title: "Payment dispute after completion",
    jobId: "J-0994-QRS",
    reportedBy: "Worker · Sirinya T.",
    detail: "Resolved after Admin reviewed the escrow log and released payment in full.",
    status: "Resolved",
  },
]);

const totalReports = computed(() => reports.value.length);
const pendingReports = computed(() => reports.value.filter((r) => r.status === "Pending").length);
const resolvedReports = computed(() => reports.value.filter((r) => r.status === "Resolved").length);

const filteredReports = computed(() =>
  statusFilter.value === "All Status" ? reports.value : reports.value.filter((r) => r.status === statusFilter.value)
);

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

function resolve(report) {
  // TODO: PATCH /api/admin/reports/:id/resolve (FR-ADMIN-06)
  report.status = "Resolved";
}

function dismiss(report) {
  // TODO: PATCH /api/admin/reports/:id/dismiss (FR-ADMIN-06)
  reports.value = reports.value.filter((r) => r.id !== report.id);
}
</script>

<template>
  <section class="reports">
    <p class="section-title">Handle Report</p>

    <div class="stat-row">
      <div class="stat-pill">
        <span class="icon blue">📁</span>
        <div>
          <p class="stat-label">Total Reports</p>
          <p class="stat-value">{{ totalReports }}</p>
        </div>
      </div>
      <div class="stat-pill">
        <span class="icon yellow">⏳</span>
        <div>
          <p class="stat-label">Pending Reports</p>
          <p class="stat-value">{{ pendingReports }}</p>
        </div>
      </div>
      <div class="stat-pill">
        <span class="icon green">✅</span>
        <div>
          <p class="stat-label">Resolved</p>
          <p class="stat-value">{{ resolvedReports }}</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <p class="card-title">All Reports</p>
        <select v-model="statusFilter" class="range-select">
          <option v-for="f in filters" :key="f">{{ f }}</option>
        </select>
      </div>

      <ul class="report-list">
        <li v-for="r in filteredReports" :key="r.id" class="report-item">
          <button class="report-row" @click="toggleExpand(r.id)">
            <span class="report-icon">⚠️</span>
            <span class="report-body">
              <span class="report-title">{{ r.title }}</span>
              <span class="report-meta">Job #{{ r.jobId }} · Reported by {{ r.reportedBy }}</span>
            </span>
            <span class="status-text" :class="r.status === 'Pending' ? 'pending' : 'resolved'">{{ r.status }}</span>
            <span class="chevron" :class="{ open: expandedId === r.id }">⌄</span>
          </button>
          <div v-if="expandedId === r.id" class="report-detail">
            <p>{{ r.detail }}</p>
            <div v-if="r.status === 'Pending'" class="action-row">
              <button class="action-btn primary" @click="resolve(r)">Mark Resolved</button>
              <button class="action-btn ghost" @click="dismiss(r)">Dismiss</button>
            </div>
          </div>
        </li>
        <li v-if="!filteredReports.length" class="empty">No reports match this filter.</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.reports { padding: 16px; }
.section-title { margin: 0 0 12px; font-weight: 700; }

.stat-row { display: flex; gap: 10px; margin-bottom: 14px; }
.stat-pill {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 12px 8px;
  text-align: center;
}
.icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.icon.blue { background: #dbeafe; }
.icon.yellow { background: var(--color-primary-light); }
.icon.green { background: var(--color-green-bg); }
.stat-label { margin: 0; font-size: 11px; color: var(--color-text-muted); }
.stat-value { margin: 2px 0 0; font-size: 20px; font-weight: 800; }

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
}
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.card-title { font-weight: 700; margin: 0; font-size: 14px; }
.range-select {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 12px;
  background: var(--color-surface);
}

.report-list { list-style: none; margin: 0; padding: 0; }
.report-item { border-bottom: 1px solid var(--color-border); }
.report-item:last-child { border-bottom: none; }

.report-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
}
.report-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--color-red-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.report-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.report-title { font-size: 13px; font-weight: 600; }
.report-meta { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }
.status-text { font-size: 12px; font-weight: 700; flex-shrink: 0; }
.status-text.pending { color: var(--color-primary-dark); }
.status-text.resolved { color: var(--color-green); }
.chevron { transition: transform 0.2s ease; color: var(--color-text-muted); }
.chevron.open { transform: rotate(180deg); }

.report-detail { padding: 0 0 14px 40px; font-size: 13px; color: var(--color-text); }
.report-detail p { margin: 0 0 10px; opacity: 0.85; }
.action-row { display: flex; gap: 8px; }
.action-btn {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.action-btn.primary { background: var(--color-primary); color: #3a2a05; }
.action-btn.ghost { background: var(--color-bg); color: var(--color-text); }

.empty { text-align: center; color: var(--color-text-muted); padding: 20px 0; }
</style>