<script setup>
import { computed, onMounted, ref } from "vue";
import api from "../../services/api";

const statusFilter = ref("All Status");
const filters = ["All Status", "Pending", "Resolved", "Dismissed"];

const reports = ref([]);
const loading = ref(true);
const errorMessage = ref("");
const actionLoading = ref(null);
const expandedId = ref(null);

const totalReports = computed(() => reports.value.length);

const pendingReports = computed(
  () =>
    reports.value.filter(
      (r) => r.status === "pending"
    ).length
);

const resolvedReports = computed(
  () =>
    reports.value.filter(
      (r) => r.status === "resolved"
    ).length
);

const filteredReports = computed(() => {
  if (statusFilter.value === "All Status") {
    return reports.value;
  }

  const map = {
    Pending: "pending",
    Resolved: "resolved",
    Dismissed: "dismissed",
  };

  return reports.value.filter(
    (report) =>
      report.status === map[statusFilter.value]
  );
});

function toggleExpand(id) {
  expandedId.value =
    expandedId.value === id ? null : id;
}

function statusLabel(status) {
  if (status === "pending") return "Pending";
  if (status === "resolved") return "Resolved";
  if (status === "dismissed") return "Dismissed";
  if (status === "investigating") return "Investigating";
  return status || "-";
}

function statusClass(status) {
  if (status === "resolved") return "resolved";
  if (status === "dismissed") return "dismissed";
  return "pending";
}

async function loadReports() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get("/admin/reports");

    reports.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(error);

    errorMessage.value =
      error.response?.data?.message ||
      "ไม่สามารถโหลดรายงานได้";
  } finally {
    loading.value = false;
  }
}

async function resolve(report) {
  if (actionLoading.value) return;

  const notes = window.prompt(
    "หมายเหตุการแก้ไขรายงาน",
    ""
  );

  if (notes === null) return;

  actionLoading.value = report._id;

  try {
    const { data } = await api.post(
      `/admin/reports/${report._id}/resolve`,
      {
        status: "resolved",
        resolutionNotes: notes,
      }
    );

    reports.value = reports.value.map((item) =>
      item._id === report._id
        ? data.report
        : item
    );
  } catch (error) {
    alert(
      error.response?.data?.message ||
        "ไม่สามารถปิดรายงานได้"
    );
  } finally {
    actionLoading.value = null;
  }
}

async function dismiss(report) {
  if (actionLoading.value) return;

  const notes = window.prompt(
    "หมายเหตุการ dismiss รายงาน",
    ""
  );

  if (notes === null) return;

  actionLoading.value = report._id;

  try {
    const { data } = await api.post(
      `/admin/reports/${report._id}/resolve`,
      {
        status: "dismissed",
        resolutionNotes: notes,
      }
    );

    reports.value = reports.value.map((item) =>
      item._id === report._id
        ? data.report
        : item
    );
  } catch (error) {
    alert(
      error.response?.data?.message ||
        "ไม่สามารถ dismiss รายงานได้"
    );
  } finally {
    actionLoading.value = null;
  }
}

onMounted(loadReports);
</script>

<template>
  <section class="reports">
    <div class="header-row">
      <p class="section-title">Handle Report</p>

      <button
        class="refresh-btn"
        :disabled="loading"
        @click="loadReports"
      >
        {{ loading ? "Loading..." : "Refresh" }}
      </button>
    </div>

    <div class="stat-row">
      <div class="stat-pill">
        <span class="icon blue">📁</span>
        <div>
          <p class="stat-label">Total Reports</p>
          <p class="stat-value">
            {{ totalReports }}
          </p>
        </div>
      </div>

      <div class="stat-pill">
        <span class="icon yellow">⏳</span>
        <div>
          <p class="stat-label">Pending Reports</p>
          <p class="stat-value">
            {{ pendingReports }}
          </p>
        </div>
      </div>

      <div class="stat-pill">
        <span class="icon green">✅</span>
        <div>
          <p class="stat-label">Resolved</p>
          <p class="stat-value">
            {{ resolvedReports }}
          </p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <p class="card-title">All Reports</p>

        <select
          v-model="statusFilter"
          class="range-select"
        >
          <option
            v-for="filter in filters"
            :key="filter"
          >
            {{ filter }}
          </option>
        </select>
      </div>

      <div v-if="errorMessage" class="error-box">
        {{ errorMessage }}
      </div>

      <div v-if="loading" class="empty">
        กำลังโหลดรายงาน...
      </div>

      <ul v-else class="report-list">
        <li
          v-for="report in filteredReports"
          :key="report._id"
          class="report-item"
        >
          <button
            class="report-row"
            @click="toggleExpand(report._id)"
          >
            <span class="report-icon">⚠️</span>

            <span class="report-body">
              <span class="report-title">
                {{ report.reason }}
              </span>

              <span class="report-meta">
                Reported by:
                {{ report.reporter?.fullName || "-" }}
                ·
                Reported user:
                {{ report.reportedUser?.fullName || "-" }}
              </span>
            </span>

            <span
              class="status-text"
              :class="statusClass(report.status)"
            >
              {{ statusLabel(report.status) }}
            </span>

            <span
              class="chevron"
              :class="{
                open: expandedId === report._id,
              }"
            >
              ⌄
            </span>
          </button>

          <div
            v-if="expandedId === report._id"
            class="report-detail"
          >
            <p>
              {{ report.description || "ไม่มีรายละเอียด" }}
            </p>

            <p class="small-detail">
              Job:
              {{ report.job || "-" }}
            </p>

            <p
              v-if="report.resolutionNotes"
              class="small-detail"
            >
              Resolution:
              {{ report.resolutionNotes }}
            </p>

            <div
              v-if="report.status === 'pending'"
              class="action-row"
            >
              <button
                class="action-btn primary"
                :disabled="actionLoading === report._id"
                @click.stop="resolve(report)"
              >
                Mark Resolved
              </button>

              <button
                class="action-btn ghost"
                :disabled="actionLoading === report._id"
                @click.stop="dismiss(report)"
              >
                Dismiss
              </button>
            </div>
          </div>
        </li>

        <li
          v-if="!filteredReports.length"
          class="empty"
        >
          No reports match this filter.
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.reports {
  padding: 16px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  margin: 0 0 12px;
  font-weight: 700;
}

.refresh-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 8px;
  padding: 8px 12px;
}

.stat-row {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

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
}

.icon.blue {
  background: #dbeafe;
}

.icon.yellow {
  background: var(--color-primary-light);
}

.icon.green {
  background: var(--color-green-bg);
}

.stat-label {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-muted);
}

.stat-value {
  margin: 2px 0 0;
  font-size: 20px;
  font-weight: 800;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-title {
  font-weight: 700;
  margin: 0;
  font-size: 14px;
}

.range-select {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 4px 6px;
  background: var(--color-surface);
}

.report-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.report-item {
  border-bottom: 1px solid var(--color-border);
}

.report-item:last-child {
  border-bottom: none;
}

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

.report-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.report-title {
  font-size: 13px;
  font-weight: 600;
}

.report-meta {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.status-text {
  font-size: 11px;
  font-weight: 700;
}

.status-text.pending {
  color: var(--color-primary-dark);
}

.status-text.resolved {
  color: var(--color-green);
}

.status-text.dismissed {
  color: var(--color-red);
}

.chevron {
  color: var(--color-text-muted);
}

.chevron.open {
  transform: rotate(180deg);
}

.report-detail {
  padding: 0 0 14px 40px;
  font-size: 13px;
}

.report-detail p {
  margin: 0 0 8px;
}

.small-detail {
  color: var(--color-text-muted);
  font-size: 11px;
}

.action-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.action-btn {
  flex: 1;
  min-height: 38px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
}

.primary {
  background: var(--color-primary);
  color: #3a2a05;
}

.ghost {
  background: var(--color-bg);
}

.error-box {
  padding: 10px;
  background: var(--color-red-bg);
  color: var(--color-red);
  border-radius: 8px;
  margin-bottom: 10px;
}

.empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 20px;
}

@media (max-width: 600px) {
  .stat-row {
    flex-direction: column;
  }

  .header-row {
    align-items: flex-start;
    gap: 8px;
  }
}
</style>