<script setup>
// FR-PAY-08: แสดงยอดเงินที่จ่ายออกไป + ประวัติธุรกรรมตามลำดับเวลา (มุมมองผู้ว่าจ้าง)
// FR-PAY-02: Escrow state machine (Pending -> Held -> Released)
// ยึดตาม proposal: ไม่มี wallet กลางในแอปที่ต้อง "เติมเงิน" ก่อนใช้งาน — เงินไหลผ่าน
// Escrow ทีละงานด้วยสลิปโอนแบบ manual (FR-PAY-01–05) เท่านั้น
import { onMounted, ref, watch } from "vue";
import api from "../../services/api";

const loading = ref(true);
const errorMsg = ref("");

/* ---------- ยอดเงิน (มุมมอง Hirer: เงินที่จ่ายออกไป ไม่ใช่ wallet ที่เติมได้) ---------- */
const showBalance = ref(true);
const totalPaid = ref(0);
const inEscrow = ref(0);
const pendingPayment = ref(0);

function formatCurrency(n) {
  return (n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---------- ภาพรวมการใช้จ่าย ---------- */
const periods = [
  { value: "month", label: "เดือนนี้" },
  { value: "last-month", label: "เดือนที่แล้ว" },
  { value: "all", label: "ทั้งหมด" },
];
const selectedPeriod = ref("month");
const totalSpent = ref(0);
const completeJobs = ref(0);

async function loadSummary() {
  const { data } = await api.get("/payments/summary", { params: { period: selectedPeriod.value } });
  totalSpent.value = data.totalSpent;
  completeJobs.value = data.completeJobs;
}

/* ---------- ประวัติธุรกรรม ---------- */
const transactions = ref([]);

async function loadTransactions() {
  const { data } = await api.get("/payments/transactions", { params: { limit: 3 } });
  transactions.value = data.map((tx) => ({
    id: tx.id,
    jobTitle: tx.jobTitle,
    amount: tx.amount,
    date: new Date(tx.date),
  }));
}

function formatDate(d) {
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " + d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

/* ---------- โหลดข้อมูลตอนเปิดหน้า ---------- */
async function loadWallet() {
  const { data } = await api.get("/payments/wallet");
  totalPaid.value = data.totalPaid;
  inEscrow.value = data.inEscrow;
  pendingPayment.value = data.pendingPayment;
}

async function loadAll() {
  loading.value = true;
  try {
    await Promise.all([loadWallet(), loadSummary(), loadTransactions()]);
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "โหลดข้อมูลการเงินไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

onMounted(loadAll);
watch(selectedPeriod, loadSummary);
</script>

<template>
  <div class="page">
    <header class="topbar">
      <button class="icon-btn" aria-label="เปิดเมนู">
        <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </button>
      <div class="brand">
        <span class="brand-icon">👥</span>
        <span class="brand-name">JangDi</span>
      </div>
      <RouterLink to="/profile" class="avatar-btn" aria-label="โปรไฟล์ของฉัน">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
      </RouterLink>
    </header>

    <main class="content">
      <h1 class="page-title">Payment</h1>
      <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>

      <!-- ยอดที่จ่ายออกไปแล้ว -->
      <section class="card balance-card">
        <div class="balance-top">
          <div>
            <p class="label">
              Total Paid
              <button class="eye-btn" :aria-label="showBalance ? 'ซ่อนยอดเงิน' : 'แสดงยอดเงิน'" @click="showBalance = !showBalance">
                <svg v-if="showBalance" viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                <svg v-else viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6a3 3 0 004.24 4.24M9.9 5.1A10.6 10.6 0 0112 5c6 0 10 7 10 7a15.8 15.8 0 01-3.2 3.9M6.3 6.3A15.7 15.7 0 002 12s4 7 10 7c1.3 0 2.5-.2 3.6-.6" /></svg>
              </button>
            </p>
            <p class="amount">฿ {{ showBalance ? formatCurrency(totalPaid) : "•••••" }}</p>
            <p class="hint">เงินที่โอนเข้าบัญชีผู้รับจ้างแล้วจริง ผ่านการยืนยันงานเสร็จ</p>
          </div>
        </div>
        <div class="balance-split">
          <div class="split-item">
            <span>Pending Payment</span>
            <span class="info-icon" title="เลือกผู้รับจ้างแล้ว แต่ยังไม่มีสลิปโอนเงินเข้า Escrow">ⓘ</span>
            <strong>฿ {{ formatCurrency(pendingPayment) }}</strong>
          </div>
          <div class="split-item">
            <span>In Escrow</span>
            <span class="info-icon" title="เงินอยู่ใน Escrow รองานเสร็จและคุณยืนยัน">ⓘ</span>
            <strong>฿ {{ formatCurrency(inEscrow) }}</strong>
          </div>
        </div>
      </section>

      <!-- ภาพรวมการใช้จ่าย -->
      <section class="card">
        <div class="card-head">
          <h2>Spending Overview</h2>
          <select v-model="selectedPeriod" class="period-select">
            <option v-for="p in periods" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>
        <div class="stats">
          <div class="stat">
            <span class="stat-icon blue">💸</span>
            <p class="stat-label">Total Spent</p>
            <p class="stat-value">฿ {{ formatCurrency(totalSpent) }}</p>
          </div>
          <div class="stat">
            <span class="stat-icon gold">📋</span>
            <p class="stat-label">Complete Jobs</p>
            <p class="stat-value">{{ completeJobs }}</p>
          </div>
        </div>
      </section>

      <!-- ประวัติธุรกรรม -->
      <section class="card">
        <div class="card-head">
          <h2>Transaction History</h2>
          <RouterLink to="/hirer/payment/transactions" class="view-all">View All ›</RouterLink>
        </div>
        <ul class="tx-list">
          <li v-for="tx in transactions" :key="tx.id" class="tx-item">
            <span class="tx-icon">↑</span>
            <div class="tx-body">
              <p class="tx-title">จ่ายเงินสำหรับงาน</p>
              <p class="tx-sub">{{ tx.jobTitle }}</p>
            </div>
            <div class="tx-right">
              <p class="tx-amount">-฿{{ formatCurrency(tx.amount) }}</p>
              <p class="tx-date">{{ formatDate(tx.date) }}</p>
            </div>
            <span class="tx-chevron">›</span>
          </li>
          <p v-if="!transactions.length" class="empty-tx">ยังไม่มีประวัติการจ่ายเงิน</p>
        </ul>
      </section>
    </main>

    <footer class="bottom-nav">
      <button class="nav-item">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span>ถาม</span>
      </button>
      <RouterLink to="/hirer" class="nav-item">
        <svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>
        <span>หน้าแรก</span>
      </RouterLink>
      <button class="nav-item">
        <svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 21a2 2 0 004 0" /></svg>
      </button>
    </footer>
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; padding-bottom: 76px; background: #f0f0f0; }
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; background: #fff; position: sticky; top: 0; z-index: 10;
  border-bottom: 1px solid #eee;
}
.icon-btn, .avatar-btn {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border: none; background: transparent;
  border-radius: 50%; color: #111; cursor: pointer;
}
.avatar-btn { border: 1px solid #111; }
.brand { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 18px; }
.brand-icon { font-size: 18px; }

.content { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.page-title { margin: 0; font-size: 17px; font-weight: 700; color: #111; }
.error-text { color: #e11d48; font-size: 13px; text-align: center; }

.card { background: #fff; border-radius: 12px; padding: 14px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }

.balance-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.label { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 12px; color: #777; }
.eye-btn { border: none; background: transparent; color: #999; padding: 0; display: flex; cursor: pointer; }
.eye-btn svg { width: 15px; height: 15px; }
.amount { margin: 4px 0 2px; font-size: 26px; font-weight: 800; color: #111; }
.hint { margin: 0; font-size: 11px; color: #999; }
.balance-split { display: flex; margin-top: 14px; padding-top: 10px; border-top: 1px solid #eee; }
.split-item {
  flex: 1; display: flex; flex-direction: column; gap: 2px;
  font-size: 11px; color: #777; padding: 0 8px;
}
.split-item:first-child { border-right: 1px solid #eee; }
.split-item strong { font-size: 13px; color: #111; }
.info-icon { font-size: 10px; color: #aaa; cursor: help; }

.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.card-head h2 { margin: 0; font-size: 14px; font-weight: 700; color: #111; }
.period-select {
  border: 1px solid #ddd; border-radius: 8px; padding: 4px 8px;
  font-size: 12px; background: #fff; color: #333;
}
.view-all { font-size: 12px; color: #7a5c00; text-decoration: none; font-weight: 600; }

.stats { display: flex; justify-content: space-around; text-align: center; }
.stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.stat-icon {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 14px;
}
.stat-icon.blue { background: #dce7ff; }
.stat-icon.gold { background: #fff1cc; }
.stat-label { margin: 0; font-size: 11px; color: #888; }
.stat-value { margin: 0; font-size: 13px; font-weight: 700; color: #111; }

.tx-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.tx-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 0;
  border-bottom: 1px solid #f2f2f2;
}
.tx-item:last-child { border-bottom: none; }
.tx-icon {
  width: 32px; height: 32px; border-radius: 50%; background: #dce7ff; color: #2563eb;
  display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;
}
.tx-body { flex: 1; min-width: 0; }
.tx-title { margin: 0; font-size: 13px; font-weight: 600; color: #111; }
.tx-sub { margin: 2px 0 0; font-size: 11px; color: #999; }
.tx-right { text-align: right; }
.tx-amount { margin: 0; font-size: 13px; font-weight: 700; color: #111; }
.tx-date { margin: 2px 0 0; font-size: 10px; color: #999; }
.tx-chevron { color: #ccc; font-size: 18px; }
.empty-tx { text-align: center; color: #999; font-size: 12px; padding: 12px 0; margin: 0; }

.bottom-nav {
  position: fixed; left: 0; right: 0; bottom: 0; max-width: 480px; margin: 0 auto;
  display: flex; justify-content: space-around; align-items: center;
  background: #fff; border-top: 1px solid #eee; padding: 6px 0; z-index: 6;
}
.nav-item {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px;
  min-height: 44px; min-width: 44px; border: none; background: transparent;
  color: #333; font-size: 11px; text-decoration: none; cursor: pointer;
}
</style>