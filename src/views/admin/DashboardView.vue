<script setup>
import { computed, onMounted, ref } from "vue";
import api from "../../services/api";

const loading = ref(true);
const errorMessage = ref("");

const stats = ref({
  totalUsers: 0,
  totalJobs: 0,
  pendingJobs: 0,
  openSos: 0,
});

const finance = ref({
  totalVolume: 0,
  totalFees: 0,
  count: 0,
});

const hasFinanceData = computed(() => {
  return (
    finance.value.totalVolume > 0 ||
    finance.value.totalFees > 0 ||
    finance.value.count > 0
  );
});

function money(value) {
  return `฿${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

async function loadDashboard() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get("/admin/dashboard");

    stats.value = {
      totalUsers: Number(data.totalUsers) || 0,
      totalJobs: Number(data.totalJobs) || 0,
      pendingJobs: Number(data.pendingJobs) || 0,
      openSos: Number(data.openSos) || 0,
    };

    finance.value = {
      totalVolume: Number(data.monthlyFinancials?.totalVolume) || 0,
      totalFees: Number(data.monthlyFinancials?.totalFees) || 0,
      count: Number(data.monthlyFinancials?.count) || 0,
    };
  } catch (error) {
    console.error(error);

    if (error.response?.status === 403) {
      errorMessage.value = "คุณไม่มีสิทธิ์เข้าถึงหน้า Admin";
    } else {
      errorMessage.value =
        error.response?.data?.message ||
        "ไม่สามารถโหลดข้อมูล Dashboard ได้";
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>

<template>
  <section class="dashboard">
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p class="page-description">
          ภาพรวมการทำงานของระบบ JangDi
        </p>
      </div>

      <button
        class="refresh-button"
        :disabled="loading"
        @click="loadDashboard"
      >
        {{ loading ? "Loading..." : "Refresh" }}
      </button>
    </div>

    <div v-if="loading" class="state-card">
      กำลังโหลดข้อมูล Dashboard...
    </div>

    <div v-else-if="errorMessage" class="state-card error-card">
      <p>{{ errorMessage }}</p>

      <button class="retry-button" @click="loadDashboard">
        ลองใหม่
      </button>
    </div>

    <template v-else>
      <div class="stat-grid">
        <div class="stat-card fill-primary">
          <p class="stat-label">All Users</p>
          <p class="stat-value">{{ stats.totalUsers }}</p>
          <p class="stat-sub">Users</p>
        </div>

        <div class="stat-card fill-muted">
          <p class="stat-label">All Jobs</p>
          <p class="stat-value">{{ stats.totalJobs }}</p>
          <p class="stat-sub">Jobs</p>
        </div>

        <RouterLink
          to="/admin/posts"
          class="stat-card outline"
        >
          <p class="stat-label">Pending</p>
          <p class="stat-value">{{ stats.pendingJobs }}</p>
          <p class="stat-sub">Jobs waiting for review</p>
        </RouterLink>

        <RouterLink
          to="/admin/sos"
          class="stat-card outline"
        >
          <p class="stat-label">SOS Active</p>
          <p class="stat-value">{{ stats.openSos }}</p>
          <p class="stat-sub">Active alerts</p>
        </RouterLink>
      </div>

      <div class="card">
        <p class="card-title">Work Chart</p>

        <div class="chart-placeholder">
          <p>ยังไม่มีข้อมูลกราฟรายวัน/รายสัปดาห์</p>
          <small>
            Backend Dashboard ปัจจุบันยังไม่ได้ส่งข้อมูลส่วนนี้
          </small>
        </div>
      </div>

      <div class="card">
        <p class="card-title">Monthly Finance Summary</p>

        <dl class="finance-list">
          <div class="finance-row">
            <dt>Total job value</dt>
            <dd>{{ money(finance.totalVolume) }}</dd>
          </div>

          <div class="finance-row">
            <dt>Platform fee earned</dt>
            <dd class="positive">
              +{{ money(finance.totalFees) }}
            </dd>
          </div>

          <div class="finance-row">
            <dt>Released jobs</dt>
            <dd>{{ finance.count }}</dd>
          </div>
        </dl>

        <p v-if="!hasFinanceData" class="empty">
          ยังไม่มีข้อมูลการเงินของเดือนนี้
        </p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.dashboard {
  padding: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

h1 {
  font-size: 20px;
  margin: 4px 0;
}

.page-description {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.refresh-button,
.retry-button {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 12px;
  background: var(--color-surface);
  cursor: pointer;
}

.refresh-button:disabled {
  opacity: 0.6;
}

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
}

.stat-label {
  margin: 0;
  font-size: 13px;
}

.stat-value {
  margin: 6px 0 2px;
  font-size: 26px;
  font-weight: 800;
}

.stat-sub {
  margin: 0;
  font-size: 12px;
  opacity: 0.75;
}

.fill-primary {
  background: var(--color-primary);
  color: #3a2a05;
}

.fill-muted {
  background: #8b8f98;
  color: white;
}

.outline {
  background: var(--color-surface);
  border: 1.5px solid var(--color-primary);
}

.card,
.state-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
  margin-bottom: 14px;
}

.card-title {
  font-weight: 700;
  margin: 0 0 10px;
  font-size: 14px;
}

.chart-placeholder {
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  padding: 24px 12px;
  text-align: center;
  color: var(--color-text-muted);
}

.chart-placeholder p {
  margin: 0 0 5px;
}

.chart-placeholder small {
  font-size: 11px;
}

.finance-list {
  margin: 0;
}

.finance-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 14px;
}

.finance-row:last-child {
  border-bottom: none;
}

.finance-row dt {
  color: var(--color-text-muted);
}

.finance-row dd {
  margin: 0;
  font-weight: 700;
}

.positive {
  color: var(--color-green);
}

.error-card {
  text-align: center;
}

.error-card p {
  margin: 0 0 12px;
}

.empty {
  color: var(--color-text-muted);
  font-size: 13px;
}

@media (max-width: 600px) {
  .page-header {
    flex-direction: column;
  }

  .refresh-button {
    width: 100%;
  }

  .stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>