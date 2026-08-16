<script setup>
// FR-ADMIN-04: Allow Admin to review, transfer, and audit escrow payments awaiting release.
// FR-ADMIN-05: Allow Admin to review and adjudicate refund requests submitted by Hirers.
// NFR-SEC-03: Escrowed funds shall not be released to a Worker until both Hirer confirmation
// and Admin verification are recorded.
import { computed, ref } from "vue";

const activeTab = ref("Pending"); // Pending | Paid | Refund
const tabs = ["Pending", "Paid", "Refund"];

// TODO: แทนที่ mock ด้วย GET /api/admin/payments?status=pending (FR-ADMIN-04)
const pendingPayments = ref([
  {
    id: "PAY-8891",
    name: "Korawan Kongkerd",
    subtitle: "Bought lunch at canteen",
    note: "Worker requested payment · Hirer confirmed completion",
    amount: 75,
    slip: "payment_slip_04.jpg",
  },
  {
    id: "PAY-8887",
    name: "Wanlapa Mongkol",
    subtitle: "Dorm room cleaning",
    note: "Worker requested payment · awaiting Admin verification",
    amount: 220,
    slip: "payment_slip_02.jpg",
  },
]);

// TODO: แทนที่ mock ด้วย GET /api/admin/payments?status=paid (FR-ADMIN-04 — audit trail)
const paidPayments = ref([
  {
    id: "PAY-8870",
    name: "Korawan Kongkerd",
    subtitle: "Bought lunch at canteen",
    amount: 75,
    transferDate: "14 Aug 2026, 09:40",
    slip: "payment_slip_01.jpg",
  },
]);

// TODO: แทนที่ mock ด้วย GET /api/admin/refunds?status=pending (FR-ADMIN-05)
const refundRequests = ref([
  {
    id: "REF-231",
    userRefund: "Chomdaeng M.",
    amount: 76,
    reason: "Misdirected the job",
    job: "Bought hardware at the hardware store",
  },
]);

function transfer(payment) {
  // TODO: POST /api/admin/payments/:id/transfer — release escrow to Worker (NFR-SEC-03)
  pendingPayments.value = pendingPayments.value.filter((p) => p.id !== payment.id);
  paidPayments.value.unshift({
    id: payment.id,
    name: payment.name,
    subtitle: payment.subtitle,
    amount: payment.amount,
    transferDate: new Date().toLocaleString("en-GB", { hour12: false }),
    slip: payment.slip,
  });
}

function approveRefund(req) {
  // TODO: PATCH /api/admin/refunds/:id/approve (FR-ADMIN-05, FR-PAY-07)
  refundRequests.value = refundRequests.value.filter((r) => r.id !== req.id);
}

function rejectRefund(req) {
  // TODO: PATCH /api/admin/refunds/:id/reject (FR-ADMIN-05, FR-PAY-07)
  refundRequests.value = refundRequests.value.filter((r) => r.id !== req.id);
}

function money(n) {
  return `฿${n.toLocaleString("en-US")}`;
}
</script>

<template>
  <section class="payment">
    <p class="section-title">Payment</p>

    <nav class="tabs">
      <button v-for="t in tabs" :key="t" :class="{ active: activeTab === t }" @click="activeTab = t">
        {{ t }}
      </button>
    </nav>

    <!-- Pending: awaiting escrow release -->
    <ul v-if="activeTab === 'Pending'" class="list">
      <li v-for="p in pendingPayments" :key="p.id" class="card">
        <div class="card-top">
          <div>
            <p class="name">{{ p.name }}</p>
            <p class="subtitle">{{ p.subtitle }}</p>
          </div>
          <span class="status-badge yellow">Pending</span>
        </div>
        <p class="note">{{ p.note }}</p>
        <div class="slip-row">
          <span class="slip-label">Payment slip</span>
          <span class="slip-chip">📎 {{ p.slip }}</span>
        </div>
        <div class="action-row">
          <button class="action-btn ghost">Details</button>
          <button class="action-btn primary" @click="transfer(p)">Transfer</button>
        </div>
      </li>
      <li v-if="!pendingPayments.length" class="empty">No pending payments.</li>
    </ul>

    <!-- Paid: released, kept for audit -->
    <ul v-else-if="activeTab === 'Paid'" class="list">
      <li v-for="p in paidPayments" :key="p.id" class="card">
        <div class="card-top">
          <div>
            <p class="name">{{ p.name }}</p>
            <p class="subtitle">{{ p.subtitle }}</p>
          </div>
          <span class="status-badge green">Paid</span>
        </div>
        <div class="detail-row">
          <span>Platform fee earned</span>
          <strong>{{ money(Math.round(p.amount * 0.1)) }}</strong>
        </div>
        <div class="detail-row">
          <span>Transfer date</span>
          <strong>{{ p.transferDate }}</strong>
        </div>
        <div class="action-row">
          <button class="action-btn ghost-primary">View Slip</button>
          <button class="action-btn ghost">Details</button>
        </div>
      </li>
      <li v-if="!paidPayments.length" class="empty">No paid transactions yet.</li>
    </ul>

    <!-- Refund adjudication -->
    <ul v-else class="list">
      <li v-for="r in refundRequests" :key="r.id" class="card">
        <p class="card-title">Refund request</p>
        <div class="field-row"><span>User Refund</span><strong>{{ r.userRefund }}</strong></div>
        <div class="field-row"><span>Amount</span><strong>{{ money(r.amount) }}</strong></div>
        <div class="field-row"><span>Reason</span><strong>{{ r.reason }}</strong></div>
        <div class="field-row"><span>Job</span><strong>{{ r.job }}</strong></div>
        <div class="action-row">
          <button class="action-btn primary" @click="approveRefund(r)">Approve Refund</button>
          <button class="action-btn danger" @click="rejectRefund(r)">Reject</button>
        </div>
      </li>
      <li v-if="!refundRequests.length" class="empty">No refund requests.</li>
    </ul>
  </section>
</template>

<style scoped>
.payment { padding: 16px; }
.section-title { margin: 0 0 12px; font-weight: 700; }

.tabs { display: flex; gap: 8px; margin-bottom: 14px; }
.tabs button {
  flex: 1;
  min-height: 44px;
  border-radius: 10px;
  border: none;
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  font-weight: 600;
}
.tabs button.active { background: var(--color-primary); color: #3a2a05; }

.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
}
.card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.name { margin: 0; font-weight: 700; font-size: 14px; }
.subtitle { margin: 2px 0 0; font-size: 12px; color: var(--color-text-muted); }
.card-title { font-weight: 700; margin: 0 0 10px; font-size: 14px; }

.status-badge { font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 999px; color: white; flex-shrink: 0; }
.status-badge.yellow { background: var(--color-primary); color: #3a2a05; }
.status-badge.green { background: var(--color-green); }

.note { font-size: 12px; color: var(--color-text-muted); margin: 10px 0; }

.slip-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.slip-label { font-size: 12px; font-weight: 600; color: var(--color-text-muted); }
.slip-chip {
  font-size: 12px;
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  padding: 6px 10px;
  border-radius: 8px;
}

.detail-row, .field-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border);
}
.detail-row:last-of-type, .field-row:last-of-type { border-bottom: none; }
.field-row span, .detail-row span { color: var(--color-text-muted); }

.action-row { display: flex; gap: 10px; margin-top: 12px; }
.action-btn {
  flex: 1;
  min-height: 40px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.action-btn.ghost { background: var(--color-bg); color: var(--color-text); }
.action-btn.ghost-primary { background: var(--color-primary-light); color: var(--color-primary-dark); }
.action-btn.primary { background: var(--color-primary); color: #3a2a05; }
.action-btn.danger { background: var(--color-red-bg); color: var(--color-red); }

.empty { text-align: center; color: var(--color-text-muted); padding: 20px 0; }
</style>