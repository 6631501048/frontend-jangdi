<script setup>
import { onMounted, ref } from "vue";
import api from "../../services/api";
import AdminFinancialSummary from "../../components/AdminFinancialSummary.vue";

const loading = ref(true);
const errorMessage = ref("");

const stats = ref({
  totalUsers: 0,
  totalJobs: 0,
  pendingJobs: 0,
  openSos: 0,
});

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
        <h1>ภาพรวมระบบ</h1>
        <p class="page-description">
          ภาพรวมการทำงานของระบบ JangDi
        </p>
      </div>

      <button
        class="refresh-button"
        :disabled="loading"
        @click="loadDashboard"
      >
        {{ loading ? "กำลังโหลด…" : "รีเฟรช" }}
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
          <p class="stat-label">ผู้ใช้ทั้งหมด</p>
          <p class="stat-value">{{ stats.totalUsers }}</p>
          <p class="stat-sub">คน</p>
        </div>

        <div class="stat-card fill-muted">
          <p class="stat-label">งานทั้งหมด</p>
          <p class="stat-value">{{ stats.totalJobs }}</p>
          <p class="stat-sub">งาน</p>
        </div>

        <RouterLink
          :to="{ path: '/admin/posts', query: { status: 'pending_review' } }"
          class="stat-card outline"
        >
          <p class="stat-label">งานรออนุมัติ</p>
          <p class="stat-value">{{ stats.pendingJobs }}</p>
          <p class="stat-sub">รอผู้ดูแลตรวจสอบ</p>
        </RouterLink>

        <RouterLink
          :to="{ path: '/admin/sos', query: { status: 'active' } }"
          class="stat-card outline"
        >
          <p class="stat-label">แจ้งเหตุฉุกเฉิน</p>
          <p class="stat-value">{{ stats.openSos }}</p>
          <p class="stat-sub">เหตุที่ยังดำเนินการอยู่</p>
        </RouterLink>
      </div>

      <AdminFinancialSummary />
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

.finance-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.finance-heading .card-title { margin-bottom: 0; }
.demo-label {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 8px;
  background: #fff4cf;
  color: #805d00;
  font-size: 10px;
  font-weight: 700;
}
.finance-disclaimer {
  margin: 6px 0 8px;
  color: var(--color-text-muted);
  font-size: 11px;
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
