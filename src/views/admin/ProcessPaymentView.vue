<script setup>
import { onMounted, ref } from "vue";
import api from "../../services/api";

const activeTab = ref("Held");

const tabs = [
  { label: "Held", status: "held" },
  { label: "Released", status: "released" },
  { label: "Disputed", status: "disputed" },
];

const payments = ref([]);
const loading = ref(true);
const errorMessage = ref("");
const actionLoading = ref(null);

function money(value) {
  return `฿${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function loadPayments() {
  loading.value = true;
  errorMessage.value = "";

  const currentTab = tabs.find(
    (tab) => tab.label === activeTab.value
  );

  try {
    const { data } = await api.get(
      "/admin/payments/escrow",
      {
        params: {
          status: currentTab.status,
        },
      }
    );

    payments.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(error);

    errorMessage.value =
      error.response?.data?.message ||
      "ไม่สามารถโหลดรายการชำระเงินได้";
  } finally {
    loading.value = false;
  }
}

async function decideRefund(payment, decision) {
  if (actionLoading.value) return;

  const text =
    decision === "approved"
      ? "ยืนยันอนุมัติการคืนเงินหรือไม่?"
      : "ยืนยันปฏิเสธการคืนเงินหรือไม่?";

  if (!window.confirm(text)) return;

  actionLoading.value = payment._id;

  try {
    await api.post(
      `/admin/payments/${payment._id}/refund-decision`,
      { decision }
    );

    await loadPayments();
  } catch (error) {
    alert(
      error.response?.data?.message ||
        "ไม่สามารถบันทึกผลการคืนเงินได้"
    );
  } finally {
    actionLoading.value = null;
  }
}

function changeTab(tab) {
  activeTab.value = tab;
  loadPayments();
}

onMounted(loadPayments);
</script>

<template>
  <section class="payment">
    <div class="header-row">
      <div>
        <p class="section-title">Payment</p>
        <p class="subtitle">
          ตรวจสอบสถานะ Escrow และรายการชำระเงิน
        </p>
      </div>

      <button
        class="refresh-btn"
        :disabled="loading"
        @click="loadPayments"
      >
        {{ loading ? "Loading..." : "Refresh" }}
      </button>
    </div>

    <nav class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.label"
        :class="{ active: activeTab === tab.label }"
        @click="changeTab(tab.label)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div v-if="errorMessage" class="error-box">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="empty">
      กำลังโหลดรายการชำระเงิน...
    </div>

    <ul v-else class="list">
      <li
        v-for="payment in payments"
        :key="payment._id"
        class="card"
      >
        <div class="card-top">
          <div>
            <p class="name">
              {{ payment.job?.title || "Unknown Job" }}
            </p>

            <p class="subtitle">
              Payment ID: {{ payment._id }}
            </p>
          </div>

          <span
            class="status-badge"
            :class="activeTab.toLowerCase()"
          >
            {{ activeTab }}
          </span>
        </div>

        <div class="detail-row">
          <span>Hirer</span>
          <strong>
            {{ payment.hirer?.fullName || "-" }}
          </strong>
        </div>

        <div class="detail-row">
          <span>Worker</span>
          <strong>
            {{ payment.worker?.fullName || "-" }}
          </strong>
        </div>

        <div class="detail-row">
          <span>Amount</span>
          <strong>
            {{ money(payment.amount) }}
          </strong>
        </div>

        <div class="detail-row">
          <span>Platform fee</span>
          <strong>
            {{ money(payment.platformFeeAmount) }}
          </strong>
        </div>

        <div class="detail-row">
          <span>Worker receives</span>
          <strong>
            {{ money(payment.netAmountToWorker) }}
          </strong>
        </div>

        <div class="detail-row">
          <span>Created</span>
          <strong>
            {{ formatDate(payment.createdAt) }}
          </strong>
        </div>

        <div
          v-if="payment.refundDecision"
          class="refund-status"
        >
          Refund decision:
          <strong>
            {{ payment.refundDecision }}
          </strong>
        </div>

        <div
          v-if="activeTab === 'Disputed'"
          class="action-row"
        >
          <button
            class="action-btn primary"
            :disabled="actionLoading === payment._id"
            @click="decideRefund(payment, 'approved')"
          >
            Approve Refund
          </button>

          <button
            class="action-btn danger"
            :disabled="actionLoading === payment._id"
            @click="decideRefund(payment, 'rejected')"
          >
            Reject
          </button>
        </div>
      </li>

      <li v-if="!payments.length" class="empty">
        ไม่มีรายการในสถานะนี้
      </li>
    </ul>
  </section>
</template>

<style scoped>
.payment {
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

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.tabs button {
  flex: 1;
  min-height: 44px;
  border-radius: 10px;
  border: none;
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  font-weight: 600;
}

.tabs button.active {
  background: var(--color-primary);
  color: #3a2a05;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.name {
  margin: 0;
  font-weight: 700;
  font-size: 14px;
}

.subtitle {
  margin: 3px 0 0;
  font-size: 11px;
  color: var(--color-text-muted);
}

.status-badge {
  height: fit-content;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 999px;
}

.status-badge.held {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
}

.status-badge.released {
  background: var(--color-green-bg);
  color: var(--color-green);
}

.status-badge.disputed {
  background: var(--color-red-bg);
  color: var(--color-red);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 13px;
}

.detail-row span {
  color: var(--color-text-muted);
}

.refund-status {
  margin-top: 10px;
  padding: 8px;
  background: var(--color-bg);
  border-radius: 8px;
  font-size: 12px;
}

.action-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.action-btn {
  flex: 1;
  min-height: 40px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
}

.primary {
  background: var(--color-primary);
  color: #3a2a05;
}

.danger {
  background: var(--color-red-bg);
  color: var(--color-red);
}

.error-box {
  padding: 12px;
  background: var(--color-red-bg);
  color: var(--color-red);
  border-radius: 8px;
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