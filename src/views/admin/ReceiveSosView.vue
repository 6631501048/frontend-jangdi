<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import api from "../../services/api";

const route = useRoute();
const activeFilter = ref(route.query.status === "active" ? "Pending" : "All");
const filters = ["All", "Pending", "Complete"];

const alerts = ref([]);
const loading = ref(true);
const errorMessage = ref("");
const actionLoading = ref(null);
const expandedId = ref(null);
const resolutionNotes = ref({});

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

function contactWorker(item) {
  const phone = String(item.worker?.phone || "").trim();
  if (!phone) {
    window.alert("ผู้ใช้รายนี้ไม่มีหมายเลขโทรศัพท์");
    return;
  }
  // A phone link is initiated only on explicit Admin action.
  window.location.href = `tel:${encodeURIComponent(phone)}`;
}

async function markResolved(item) {
  if (actionLoading.value || item.status !== "active") return;
  const notes = String(resolutionNotes.value[item._id] || "").trim();
  if (notes.length < 5 || notes.length > 1000) {
    window.alert("กรุณาระบุหมายเหตุการปิดเคส 5-1000 ตัวอักษร");
    return;
  }
  if (!window.confirm("ยืนยันว่าตรวจสอบเหตุและพร้อมปิดเคส SOS นี้แล้ว?")) return;
  actionLoading.value = item._id;
  try {
    await api.post(`/admin/sos/${item._id}/resolve`, { adminNotes: notes });
    delete resolutionNotes.value[item._id];
    await loadAlerts(); // Preserve populated worker and job data from the list API.
  } catch (error) {
    window.alert(error.response?.data?.message || "ไม่สามารถปิดเคส SOS ได้");
    if (error.response?.status === 409) await loadAlerts();
  } finally {
    actionLoading.value = null;
  }
}
function mapsLink(item) {
  const point = item.location?.coordinates;
  if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(`${point[1]},${point[0]}`)}`;
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

          <p v-if="mapsLink(alert)" class="detail-row">
            <span>Map</span>
            <a :href="mapsLink(alert)" target="_blank" rel="noopener noreferrer">เปิดตำแหน่งบนแผนที่</a>
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

          <p v-if="alert.resolvedAt" class="detail-row">
            <span>Resolved</span><strong>{{ formatDate(alert.resolvedAt) }}</strong>
          </p>
          <label v-if="alert.status === 'active'" class="resolution-input">
            หมายเหตุการดำเนินการ (5–1000 ตัวอักษร)
            <textarea v-model="resolutionNotes[alert._id]" maxlength="1000" rows="3" placeholder="ระบุการช่วยเหลือ/การติดต่อก่อนปิดเคส" />
          </label>
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
              :disabled="!!actionLoading || String(resolutionNotes[alert._id] || '').trim().length < 5"
              @click.stop="markResolved(alert)"
            >
              {{ actionLoading === alert._id ? "กำลังบันทึก..." : "Mark Resolved" }}
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
.resolution-input { display: grid; gap: 6px; margin: 12px 0; font-size: 12px; font-weight: 600; }
.resolution-input textarea { width: 100%; resize: vertical; padding: 10px; border-radius: 8px; border: 1px solid var(--color-border); font: inherit; }
</style>
