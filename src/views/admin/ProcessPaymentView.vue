<script setup>
import { onMounted, ref } from "vue";
import {useRoute} from "vue-router";
import RefundEvidence from "../../components/RefundEvidence.vue";
import {paymentStatus} from "../../services/finance";
import api from "../../services/api";

const route = useRoute();
const activeTab = ref(route.query.status === "disputed" ? "Disputed" : "Pending");

const tabs = [
  { label: "Pending", status: "pending" },
  { label: "Held", status: "held" },
  { label: "Released", status: "released" },
  { label: "Disputed", status: "disputed" },
  { label: "Refunded", status: "refunded" },
];

const payments = ref([]);
const loading = ref(true);
const errorMessage = ref("");
const actionLoading = ref(null);
const expandedPaymentId = ref(null);

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

let requestId = 0;
async function loadPayments() {
  const currentRequest = ++requestId;
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

    if (currentRequest === requestId) payments.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(error);

    if (currentRequest === requestId) errorMessage.value =
      error.response?.data?.message ||
      "ไม่สามารถโหลดรายการชำระเงินได้";
  } finally {
    if (currentRequest === requestId) loading.value = false;
  }
}

async function decideRefund(payment, decision) {
  if (actionLoading.value) return;

  const text =
    decision === "approved"
      ? "ยืนยันอนุมัติการคืนเงินหรือไม่?"
      : "ยืนยันปฏิเสธการคืนเงินหรือไม่?";

  const notes = window.prompt('ระบุเหตุผลการพิจารณา (10–1,000 ตัวอักษร):');
  if (notes === null) return;
  if (notes.trim().length < 10 || notes.trim().length > 1000) { alert('กรุณาระบุเหตุผล 10–1,000 ตัวอักษร'); return; }
  if (!window.confirm(text + (decision === 'approved' ? ' คืนเต็มยอดรวมค่าบริการในโหมดทดสอบ' : ' งานจะกลับสู่ขั้นตอนก่อนยื่นคำขอ'))) return;

  actionLoading.value = payment._id;

  try {
    await api.post(
      `/admin/payments/${payment._id}/refund-decision`,
      { decision, notes: notes.trim() }
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
  expandedPaymentId.value = null;
  loadPayments();
}

function toggleDetails(paymentId) {
  expandedPaymentId.value = expandedPaymentId.value === paymentId ? null : paymentId;
}

onMounted(loadPayments);
</script>

<template>
  <section class="payment">
    <div class="header-row">
      <div>
        <p class="section-title">การเงินและคำขอคืนเงิน (ทดสอบ)</p>
        <p class="subtitle">
          ดูสถานะเงินจำลองเท่านั้น (ยังไม่มีการรับหรือโอนเงินจริง)
        </p>
      </div>

      <button
        class="refresh-btn"
        :disabled="loading"
        @click="loadPayments"
      >
        {{ loading ? "กำลังโหลด…" : "รีเฟรช" }}
      </button>
    </div>

    <nav class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.label"
        :class="{ active: activeTab === tab.label }"
        @click="changeTab(tab.label)"
      >
        {{ paymentStatus(tab.status) }}
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
        <button
          type="button"
          class="card-top card-toggle"
          :aria-expanded="expandedPaymentId === payment._id"
          :aria-controls="`payment-details-${payment._id}`"
          @click="toggleDetails(payment._id)"
        >
          <div>
            <p class="name">
              {{ payment.job?.title || "ไม่พบชื่องาน" }}
            </p>

          </div>

          <span class="toggle-label">{{ expandedPaymentId === payment._id ? "ซ่อนรายละเอียด" : "ดูรายละเอียด" }}</span>
        </button>

        <div v-show="expandedPaymentId === payment._id" :id="`payment-details-${payment._id}`" class="payment-details">
        <div class="detail-row">
          <span>ผู้ว่าจ้าง</span>
          <strong>
            {{ payment.hirer?.fullName || "-" }}
          </strong>
        </div>

        <div class="detail-row">
          <span>ผู้รับจ้าง</span>
          <strong>
            {{ payment.worker?.fullName || "-" }}
          </strong>
        </div>

        <div class="detail-row">
          <span>ค่าจ้าง</span>
          <strong>
            {{ money(payment.amount) }}
          </strong>
        </div>

        <div class="detail-row">
          <span>ค่าบริการแพลตฟอร์ม</span>
          <strong>
            {{ money(payment.platformFeeAmount) }}
          </strong>
        </div>

        <div class="detail-row">
          <span>ค่าจ้างผู้รับจ้าง</span>
          <strong>
            {{ money(payment.netAmountToWorker) }}
          </strong>
        </div>

        <div class="detail-row">
          <span>สร้างรายการเมื่อ</span>
          <strong>
            {{ formatDate(payment.createdAt) }}
          </strong>
        </div>

        <div v-if="payment.disputeReason" class="refund-status"><strong>เหตุผลที่ขอคืนเงิน</strong><p>{{payment.disputeReason}}</p></div>
        <RefundEvidence v-if="expandedPaymentId === payment._id && payment.refundEvidenceCount" :payment-id="payment._id" :count="payment.refundEvidenceCount" />
        <p v-if="payment.refundNotes" class="refund-status">เหตุผลผู้ดูแล: {{payment.refundNotes}}</p>
        <p v-if="payment.refundStatus" class="refund-status">สถานะคืนเงิน: {{({succeeded:'สำเร็จ',pending:'กำลังดำเนินการ',failed:'ไม่สำเร็จ',canceled:'ยกเลิก'})[payment.refundStatus] || 'รอตรวจสอบ'}}</p>
        <div
          v-if="payment.refundDecision"
          class="refund-status"
        >
          ผลการพิจารณา:
          <strong>
            {{payment.refundDecision === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}}
          </strong>
        </div>

        <div
          v-if="activeTab === 'Disputed'"
          class="action-row"
        >
          <button
            class="action-btn primary"
            :disabled="!!actionLoading"
            @click="decideRefund(payment, 'approved')"
          >
            อนุมัติคืนเงินเต็มจำนวน
          </button>

          <button
            class="action-btn danger"
            :disabled="!!actionLoading"
            v-if="!payment.refundDecision" @click="decideRefund(payment, 'rejected')"
          >
            ปฏิเสธ
          </button>
        </div>
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

.card-toggle {
  width: 100%;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.card-toggle:focus-visible {
  outline: 2px solid var(--color-primary-dark);
  outline-offset: 3px;
  border-radius: 6px;
}

.toggle-label {
  flex: 0 0 auto;
  color: var(--color-primary-dark);
  font-size: 11px;
  font-weight: 700;
}

.payment-details { padding-top: 4px; }

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
