<script setup>
import { ref } from "vue";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();

/* =========================
   NAVBAR / DRAWER
========================= */

const drawerOpen = ref(false);

const drawerItems = [
  {
    label: "Home",
    to: "/hirer",
  },
  {
    label: "My Job",
    to: "/hirer/my-jobs",
  },
  {
    label: "Payment",
    to: "/hirer/payment",
  },
];

function switchRole() {
  drawerOpen.value = false;
  alert("TODO: สลับบทบาทเป็นผู้รับจ้าง");
}

function logout() {
  auth.logout();
  drawerOpen.value = false;
}


/* =========================
   PAYMENT DATA
========================= */

const availableBalance = ref(999);

const escrowBalance = ref(79);

const showTransferModal = ref(false);

const transferAmount = ref("");

const transactions = ref([
  {
    id: 1,
    type: "deposit",
    title: "Transfer",
    detail: "From bank account",
    amount: 9999,
    date: "26 May 2026, 10:15",
  },
  {
    id: 2,
    type: "payment",
    title: "Paid",
    detail: "To Somyong",
    amount: -8120,
    date: "23 May 2026, 11:15",
  },
  {
    id: 3,
    type: "payment",
    title: "Paid",
    detail: "To Somyong",
    amount: -890,
    date: "20 May 2026, 09:12",
  },
]);


/* =========================
   TRANSFER MONEY
========================= */

function transferMoney() {
  if (!transferAmount.value || transferAmount.value <= 0) {
    alert("กรุณาระบุจำนวนเงิน");
    return;
  }

  const amount = Number(transferAmount.value);

  availableBalance.value += amount;

  transactions.value.unshift({
    id: Date.now(),
    type: "deposit",
    title: "Transfer",
    detail: "From bank account",
    amount: amount,
    date: new Date().toLocaleString("en-GB"),
  });

  transferAmount.value = "";

  showTransferModal.value = false;
}
</script>


<template>

  <div class="page">

    <!-- =========================
         TOP NAVBAR
    ========================= -->

    <header class="topbar">

      <!-- Menu Button -->

      <button
        class="icon-btn"
        aria-label="เปิดเมนู"
        @click="drawerOpen = true"
      >

        <svg viewBox="0 0 24 24">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>

      </button>


      <!-- JangDi Logo -->

      <div class="brand">

        <span class="brand-icon">
          👥
        </span>

        <span class="brand-name">
          JangDi
        </span>

      </div>


      <!-- Profile -->

      <RouterLink
        to="/hirer/profile"
        class="avatar-btn"
        aria-label="โปรไฟล์ของฉัน"
      >

        <svg viewBox="0 0 24 24">

          <circle
            cx="12"
            cy="8"
            r="4"
          />

          <path
            d="M4 20c0-4 4-6 8-6s8 2 8 6"
          />

        </svg>

      </RouterLink>

    </header>


    <!-- =========================
         DRAWER BACKDROP
    ========================= -->

    <div
      v-if="drawerOpen"
      class="backdrop"
      @click="drawerOpen = false"
    ></div>


    <!-- =========================
         DRAWER
    ========================= -->

    <nav
      v-if="drawerOpen"
      class="drawer"
    >

      <!-- Drawer Brand -->

      <div class="drawer-brand">

        <span class="brand-icon">
          👥
        </span>

        <span class="brand-name">
          JangDi
        </span>

      </div>


      <!-- Home -->

      <RouterLink
        v-for="item in drawerItems"
        :key="item.label"
        :to="item.to"
        class="drawer-link"
        @click="drawerOpen = false"
      >

        {{ item.label }}

      </RouterLink>


      <!-- Switch Role -->

      <button
        class="drawer-link"
        @click="switchRole"
      >

        Switch role

      </button>


      <!-- Logout -->

      <button
        class="drawer-link logout"
        @click="logout"
      >

        Log out

      </button>

    </nav>


    <!-- =========================
         MAIN CONTENT
    ========================= -->

    <main class="content">

      <h1>
        Payment
      </h1>


      <!-- =========================
           AVAILABLE BALANCE
      ========================= -->

      <section class="balance-card">

        <div>

          <p class="label">
            Available Balance
          </p>

          <h2>
            ฿{{ availableBalance.toLocaleString() }}
          </h2>

        </div>


        <button
          class="transfer-btn"
          @click="showTransferModal = true"
        >

          Transfer

        </button>

      </section>


      <!-- =========================
           ESCROW
      ========================= -->

      <section class="escrow-card">

        <div class="section-title">

          <h2>
            Escrow
          </h2>

          <span class="escrow-status">
            Held
          </span>

        </div>


        <div class="escrow-amount">

          ฿{{ escrowBalance.toLocaleString() }}

        </div>


        <p>
          เงินสำหรับงานที่กำลังดำเนินการ
          จะถูกพักไว้ในระบบก่อน
          และจะถูกปล่อยให้ผู้รับจ้าง
          หลังจากงานเสร็จและผู้ว่าจ้างยืนยันงาน
        </p>

      </section>


      <!-- =========================
           TRANSACTIONS
      ========================= -->

      <section class="transaction-section">

        <div class="section-title">

          <h2>
            Transactions
          </h2>

        </div>


        <!-- ไม่มีรายการ -->

        <div
          v-if="transactions.length === 0"
          class="empty"
        >

          ไม่มีรายการธุรกรรม

        </div>


        <!-- รายการธุรกรรม -->

        <div
          v-for="transaction in transactions"
          :key="transaction.id"
          class="transaction"
        >

          <!-- Icon -->

          <div class="transaction-icon">

            {{
              transaction.type === "deposit"
                ? "↓"
                : "↑"
            }}

          </div>


          <!-- Information -->

          <div class="transaction-info">

            <strong>
              {{ transaction.title }}
            </strong>

            <span>
              {{ transaction.detail }}
            </span>

            <small>
              {{ transaction.date }}
            </small>

          </div>


          <!-- Amount -->

          <div
            class="transaction-amount"
            :class="{
              positive: transaction.amount > 0,
              negative: transaction.amount < 0
            }"
          >

            {{ transaction.amount > 0 ? "+" : "" }}

            ฿{{ Math.abs(transaction.amount).toLocaleString() }}

          </div>

        </div>

      </section>

    </main>


    <!-- =========================
         TRANSFER MODAL
    ========================= -->

    <div
      v-if="showTransferModal"
      class="modal-overlay"
      @click.self="showTransferModal = false"
    >

      <div class="modal">

        <h2>
          Transfer Money
        </h2>


        <p>
          เติมเงินเข้าสู่ Available Balance
        </p>


        <input
          v-model.number="transferAmount"
          type="number"
          min="1"
          placeholder="จำนวนเงิน"
        />


        <div class="modal-actions">

          <button
            class="cancel-btn"
            @click="showTransferModal = false"
          >

            Cancel

          </button>


          <button
            class="confirm-btn"
            @click="transferMoney"
          >

            Confirm

          </button>

        </div>

      </div>

    </div>

  </div>

</template>


<style scoped>

/* =========================
   GENERAL
========================= */

* {
  box-sizing: border-box;
}

.page {
  min-height: 100vh;

  background: #f6f7fb;

  color: #222;
}


/* =========================
   TOP NAVBAR
========================= */

.topbar {
  display: flex;

  align-items: center;

  justify-content: space-between;

  padding: 10px 16px;

  background: #fff;

  position: sticky;

  top: 0;

  z-index: 10;

  border-bottom: 1px solid #eee;
}


/* =========================
   MENU / PROFILE BUTTON
========================= */

.icon-btn,
.avatar-btn {
  display: flex;

  align-items: center;

  justify-content: center;

  width: 40px;

  height: 40px;

  border: none;

  background: transparent;

  border-radius: 50%;

  color: #111;

  cursor: pointer;
}


.avatar-btn {
  border: 1px solid #111;

  text-decoration: none;
}


.topbar svg {
  width: 20px;

  height: 20px;

  fill: none;

  stroke: currentColor;

  stroke-width: 2;

  stroke-linecap: round;

  stroke-linejoin: round;
}


/* =========================
   BRAND
========================= */

.brand {
  display: flex;

  align-items: center;

  gap: 6px;

  font-weight: 700;

  font-size: 18px;
}


.brand-icon {
  font-size: 18px;
}


.brand-name {
  color: #111;
}


/* =========================
   BACKDROP
========================= */

.backdrop {
  position: fixed;

  inset: 0;

  background: rgba(0, 0, 0, 0.4);

  z-index: 20;
}


/* =========================
   DRAWER
========================= */

.drawer {
  position: fixed;

  top: 0;

  left: 0;

  bottom: 0;

  width: 78%;

  max-width: 300px;

  background: #fff;

  z-index: 21;

  padding: 16px;

  display: flex;

  flex-direction: column;

  box-shadow:
    2px 0 12px rgba(0, 0, 0, 0.15);
}


/* =========================
   DRAWER BRAND
========================= */

.drawer-brand {
  display: flex;

  align-items: center;

  gap: 8px;

  font-weight: 700;

  font-size: 18px;

  margin-bottom: 16px;
}


/* =========================
   DRAWER LINKS
========================= */

.drawer-link {
  display: block;

  text-align: left;

  padding: 12px 8px;

  min-height: 44px;

  border: none;

  background: transparent;

  border-bottom: 1px solid #f2f2f2;

  color: #111;

  text-decoration: none;

  font-size: 15px;

  cursor: pointer;
}


.drawer-link:hover {
  background: #f7f7f7;
}


.drawer-link.logout {
  color: #d33;

  margin-top: auto;
}


/* =========================
   MAIN CONTENT
========================= */

.content {
  max-width: 900px;

  margin: auto;

  padding: 40px 24px;
}


.content h1 {
  margin-top: 0;

  margin-bottom: 25px;

  font-size: 32px;
}


/* =========================
   BALANCE CARD
========================= */

.balance-card {
  background: white;

  border-radius: 18px;

  padding: 28px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  box-shadow:
    0 5px 20px rgba(0, 0, 0, 0.06);

  margin-bottom: 20px;
}


.label {
  color: #777;

  margin: 0 0 8px;
}


.balance-card h2 {
  margin: 0;

  font-size: 34px;
}


.transfer-btn {
  border: none;

  background: #222;

  color: white;

  padding: 12px 22px;

  border-radius: 10px;

  cursor: pointer;
}


.transfer-btn:hover {
  opacity: 0.9;
}


/* =========================
   ESCROW
========================= */

.escrow-card {
  background: white;

  border-radius: 18px;

  padding: 25px;

  margin-bottom: 25px;

  box-shadow:
    0 5px 20px rgba(0, 0, 0, 0.06);
}


.section-title {
  display: flex;

  align-items: center;

  justify-content: space-between;
}


.section-title h2 {
  margin: 0;
}


.escrow-status {
  background: #fff3cd;

  color: #856404;

  padding: 6px 12px;

  border-radius: 20px;

  font-size: 13px;
}


.escrow-amount {
  font-size: 30px;

  font-weight: 700;

  margin: 20px 0 10px;
}


.escrow-card p {
  color: #777;

  line-height: 1.6;

  margin: 0;
}


/* =========================
   TRANSACTIONS
========================= */

.transaction-section {
  background: white;

  border-radius: 18px;

  padding: 25px;

  box-shadow:
    0 5px 20px rgba(0, 0, 0, 0.06);
}


.transaction {
  display: flex;

  align-items: center;

  gap: 15px;

  padding: 18px 0;

  border-bottom: 1px solid #eee;
}


.transaction:last-child {
  border-bottom: none;
}


.transaction-icon {
  width: 42px;

  height: 42px;

  border-radius: 50%;

  background: #f1f1f1;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 20px;

  flex-shrink: 0;
}


.transaction-info {
  display: flex;

  flex-direction: column;

  gap: 3px;

  flex: 1;

  min-width: 0;
}


.transaction-info strong {
  font-size: 16px;
}


.transaction-info span {
  color: #777;

  font-size: 14px;
}


.transaction-info small {
  color: #999;

  font-size: 12px;
}


.transaction-amount {
  font-weight: 700;

  white-space: nowrap;
}


.transaction-amount.positive {
  color: #18864b;
}


.transaction-amount.negative {
  color: #d64545;
}


.empty {
  padding: 30px;

  text-align: center;

  color: #999;
}


/* =========================
   TRANSFER MODAL
========================= */

.modal-overlay {
  position: fixed;

  inset: 0;

  background: rgba(0, 0, 0, 0.45);

  display: flex;

  align-items: center;

  justify-content: center;

  z-index: 100;
}


.modal {
  width: 90%;

  max-width: 420px;

  background: white;

  border-radius: 18px;

  padding: 30px;
}


.modal h2 {
  margin-top: 0;

  margin-bottom: 10px;
}


.modal p {
  color: #777;
}


.modal input {
  width: 100%;

  padding: 13px;

  border: 1px solid #ddd;

  border-radius: 10px;

  font-size: 16px;

  margin: 15px 0;

  outline: none;
}


.modal input:focus {
  border-color: #999;
}


.modal-actions {
  display: flex;

  justify-content: flex-end;

  gap: 10px;
}


.cancel-btn,
.confirm-btn {
  border: none;

  padding: 11px 18px;

  border-radius: 9px;

  cursor: pointer;
}


.cancel-btn {
  background: #eee;
}


.confirm-btn {
  background: #222;

  color: white;
}


.confirm-btn:hover {
  opacity: 0.9;
}


/* =========================
   MOBILE
========================= */

@media (max-width: 600px) {

  .content {
    padding: 25px 16px;
  }


  .content h1 {
    font-size: 28px;
  }


  .balance-card {
    padding: 20px;
  }


  .balance-card h2 {
    font-size: 28px;
  }


  .transfer-btn {
    padding: 10px 16px;
  }


  .transaction {
    gap: 10px;
  }


  .transaction-amount {
    font-size: 14px;
  }

}

</style>