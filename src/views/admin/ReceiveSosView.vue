<script setup>
import { computed, onMounted, ref } from "vue";
import api from "../../services/api";

const activeFilter = ref("All");
const filters = ["All", "Pending", "Complete"];

const alerts = ref([]);
const loading = ref(true);
const errorMessage = ref("");
const actionLoading = ref(null);
const expandedId = ref(null);

const counts = computed(() => ({
  all: alerts.value.length,

  complete: alerts.value.filter(
    (alert) => alert.status === "resolved"
  ).length,

  pending: alerts.value.filter(
    (alert) => alert.status === "active"
  ).length,
}));

const filteredAlerts = computed(() => {
  if (activeFilter.value === "All") {
    return alerts.value;
  }

  if (activeFilter.value === "Pending") {
    return alerts.value.filter(
      (alert) => alert.status === "active"
    );
  }

  return alerts.value.filter(
    (alert) => alert.status === "resolved"
  );
});

function toggleExpand(id) {
  expandedId.value =
    expandedId.value === id ? null : id;
}

function statusLabel(status) {
  return status === "active" ? "Pending" : "Complete";
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function locationText(alert) {
  const coordinates =
    alert.location?.coordinates;

  if (
    Array.isArray(coordinates) &&
    coordinates.length >= 2
  ) {
    return `${coordinates[1]}, ${coordinates[0]}`;
  }

  return "ไม่พบตำแหน่ง";
}

async function loadAlerts() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get("/admin/sos");

    alerts.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(error);

    errorMessage.value =
      error.response?.data?.message ||
      "ไม่สามารถโหลดข้อมูล SOS ได้";
  } finally {
    loading.value = false;
  }
}

function contactWorker(alert) {
  const phone = alert.worker?.phone;

  if (!phone) {
    alert("ผู้ใช้รายนี้ไม่มีหมายเลขโทรศัพท์");
    return;
  }

  window.location.href = `tel:${phone}`;
}

async function markResolved(alert) {
  if (actionLoading.value) return;

  const notes = window.prompt(
    "หมายเหตุสำหรับการปิดเคส SOS",
    ""
  );

  if (notes === null) return;

  actionLoading.value = alert._id;

  try {
    const { data } = await api.post(
      `/admin/sos/${alert._id}/resolve`,
      {
        adminNotes: notes,
      }
    );

    alerts.value = alerts.value.map((item) =>
      item._id === alert._id
        ? data.sos
        : item
    );
  } catch (error) {
    alert(
      error.response?.data?.message ||
        "ไม่สามารถปิดเคส SOS ได้"
    );
  } finally {
    actionLoading.value = null;
  }
}

onMounted(loadAlerts);
</script>

<template>
  <section class="sos">
    <div class="header-row">
      <div>
        <p class="section-title">SOS Alert</p>
        <p class="subtitle">
          รับและจัดการสัญญาณ SOS จาก Worker
        </p>
      </div>

      <button
        class="refresh-btn"
        :disabled="loading"
        @click="loadAlerts"
      >
        {{ loading ? "Loading..." : "Refresh" }}
      </button>
    </div>

    <div class="card overview-card">
      <div class="overview-header">
        <span class="overview-title">
          SOS Alert overview
        </span>
      </div>

      <div class="overview-stats">
        <div class="overview-stat">
          <p class="overview-value">
            {{ counts.all }}
          </p>
          <p class="overview-label">All</p>
        </div>

        <div class="overview-stat">
          <p class="overview-value">
            {{ counts.complete }}
          </p>
          <p class="overview-label">Complete</p>
        </div>

        <div class="overview-stat">
          <p class="overview-value danger">
            {{ counts.pending }}
          </p>
          <p class="overview-label">Pending</p>
        </div>
      </div>
    </div>

    <nav class="tabs">
      <button
        v-for="filter in filters"
        :key="filter"
        :class="{ active: activeFilter === filter }"
        @click="activeFilter = filter"
      >
        {{ filter }}
      </button>
    </nav>

    <div v-if="errorMessage" class="error-box">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="empty">
      กำลังโหลด SOS...
    </div>

    <ul v-else class="alert-list">
      <li
        v-for="alert in filteredAlerts"
        :key="alert._id"
        class="alert-item"
        :class="{
          pending: alert.status === 'active',
        }"
      >
        <button
          class="alert-row"
          @click="toggleExpand(alert._id)"
        >
          <span class="alert-text">
            {{ alert.worker?.fullName || "Unknown Worker" }}
            <span class="dash">—</span>
            {{ alert.job?.title || "Unknown Job" }}
          </span>

          <span
            class="status-badge"
            :class="
              alert.status === 'active'
                ? 'red'
                : 'green'
            "
          >
            {{ statusLabel(alert.status) }}
          </span>

          <span
            class="chevron"
            :class="{
              open: expandedId === alert._id,
            }"
          >
            ⌄
          </span>
        </button>

        <div
          v-if="expandedId === alert._id"
          class="alert-detail"
        >
          <p class="detail-row">
            <span>Worker</span>
            <strong>
              {{ alert.worker?.fullName || "-" }}
            </strong>
          </p>

          <p class="detail-row">
            <span>Phone</span>
            <strong>
              {{ alert.worker?.phone || "-" }}
            </strong>
          </p>

          <p class="detail-row">
            <span>Job</span>
            <strong>
              {{ alert.job?.title || "-" }}
            </strong>
          </p>

          <p class="detail-row">
            <span>Location</span>
            <strong>
              {{ locationText(alert) }}
            </strong>
          </p>

          <p class="detail-row">
            <span>Triggered</span>
            <strong>
              {{ formatDate(alert.triggeredAt) }}
            </strong>
          </p>

          <p
            v-if="alert.adminNotes"
            class="notes"
          >
            Admin notes:
            {{ alert.adminNotes }}
          </p>

          <div class="action-row">
            <button
              class="action-btn ghost"
              @click.stop="contactWorker(alert)"
            >
              Contact Worker
            </button>

            <button
              v-if="alert.status === 'active'"
              class="action-btn primary"
              :disabled="actionLoading === alert._id"
              @click.stop="markResolved(alert)"
            >
              Mark Resolved
            </button>
          </div>
        </div>
      </li>

      <li
        v-if="!filteredAlerts.length"
        class="empty"
      >
        No SOS alerts in this view.
      </li>
    </ul>
  </section>
</template>

<style scoped>
.sos {
  padding: 16px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.section-title {
  margin: 0;
  font-weight: 700;
}

.subtitle {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.refresh-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 8px;
  padding: 8px 12px;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
}

.overview-card {
  margin-bottom: 12px;
}

.overview-header {
  margin-bottom: 10px;
}

.overview-title {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 600;
}

.overview-stats {
  display: flex;
}

.overview-stat {
  flex: 1;
  text-align: center;
  border-left: 1px solid var(--color-border);
}

.overview-stat:first-child {
  border-left: none;
}

.overview-value {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}

.overview-value.danger {
  color: var(--color-red);
}

.overview-label {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tabs button {
  flex: 1;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-weight: 600;
}

.tabs button.active {
  background: var(--color-primary);
  color: #3a2a05;
  border-color: var(--color-primary);
}

.alert-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.alert-item.pending {
  border-color: var(--color-primary);
}

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

.alert-text {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
}

.dash {
  color: var(--color-text-muted);
}

.status-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 999px;
  color: white;
}

.status-badge.red {
  background: var(--color-red);
}

.status-badge.green {
  background: var(--color-green);
}

.chevron {
  color: var(--color-text-muted);
}

.chevron.open {
  transform: rotate(180deg);
}

.alert-detail {
  padding: 0 14px 14px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  margin: 0 0 7px;
}

.detail-row span {
  color: var(--color-text-muted);
}

.notes {
  padding: 8px;
  border-radius: 8px;
  background: var(--color-bg);
  font-size: 12px;
}

.action-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.action-btn {
  flex: 1;
  min-height: 40px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
}

.ghost {
  background: var(--color-bg);
}

.primary {
  background: var(--color-primary);
  color: #3a2a05;
}

.error-box {
  padding: 12px;
  background: var(--color-red-bg);
  color: var(--color-red);
  border-radius: 8px;
  margin-bottom: 10px;
}

.empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 24px;
}

@media (max-width: 600px) {
  .header-row {
    flex-direction: column;
  }

  .refresh-btn {
    width: 100%;
  }
}
</style>