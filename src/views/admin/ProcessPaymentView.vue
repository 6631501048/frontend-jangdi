<script setup>
import { onMounted, ref } from "vue";
import {useRoute} from "vue-router";
import RefundEvidence from "../../components/RefundEvidence.vue";
import PaymentSlipImage from "../../components/PaymentSlipImage.vue";
import PaymentSlipForm from "../../components/PaymentSlipForm.vue";
import {paymentStatus} from "../../services/finance";
import api from "../../services/api";
import AdminDecisionDialog from '../../components/AdminDecisionDialog.vue';
import {useAdminDecision} from '../../composables/useAdminDecision';
const {decision,askDecision,confirmDecision,cancelDecision}=useAdminDecision();

const route = useRoute();
const activeTab = ref(({disputed:'RefundReview',refund_pending:'Refunds',refunded:'Refunds',pending:'Payments',awaiting_verification:'Payments',slip_rejected:'Payments',payout_pending:'Payout'})[route.query.status] || 'Payments');

const tabs = [
  { label: "Payments", status: "payment_queue" },
  { label: "Held", status: "held" },
  { label: "Payout", status: "payout_pending" },
  { label: "Released", status: "released" },
  { label: "RefundReview", status: "refund_review" },
  { label: "Refunds", status: "refund_workflow" },
];

const payments = ref([]);
const loading = ref(true);
const errorMessage = ref("");
const actionLoading = ref(null);
const expandedPaymentId = ref(null);
const reviewReady = ref({});
const successMessage = ref('');
const refundDialogPayment = ref(null);
const refundDialogAction = ref('');
const refundDecisionNotes = ref('');
const refundEvidenceFile = ref(null);
const refundTransferReference = ref('');
const refundDecisionError = ref('');
const refundDecisionBusy = ref(false);
async function reviewSlip(payment, decision) {
  if (actionLoading.value) return;
  if (decision==='approved' && !reviewReady.value[payment._id + payment.inboundSlipVersion]) {
    errorMessage.value='ยังเปิดรูปสลิปไม่สำเร็จ กรุณาลองโหลดรูปอีกครั้งก่อนอนุมัติ หรือเลือกปฏิเสธพร้อมเหตุผลหากรูปใช้งานไม่ได้';return;
  }
  const notes = await askDecision({title:decision==='approved'?'อนุมัติรับเงินจำลอง':'ปฏิเสธสลิป',message:decision==='approved'?'ตรวจสอบรูปและยอดชำระแล้ว ผู้รับจ้างจะเริ่มงานได้หลังยืนยัน':'ผู้ว่าจ้างจะสามารถส่งสลิปใหม่ได้',requireReason:true,minLength:10});
  if (notes === null) return;
  actionLoading.value=payment._id;errorMessage.value='';
  try { const {data}=await api.post(`/admin/payments/${payment._id}/slip-review`,{decision,notes:notes.trim(),version:payment.inboundSlipVersion});successMessage.value=data.message;await loadPayments(); }
  catch(err){errorMessage.value=err.response?.data?.message || 'บันทึกผลตรวจสลิปไม่สำเร็จ';}
  finally{actionLoading.value=null;}
}
async function savedSlip(message){successMessage.value=message;await loadPayments();}

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
    if (["refund_workflow", "refund_review", "payment_queue"].includes(currentTab.status)) {
      const statuses = currentTab.status === "refund_workflow"
        ? ["disputed", "refund_pending", "refunded", "held"]
        : currentTab.status === "refund_review" ? ["disputed"] : ["pending", "awaiting_verification"];
      const results = await Promise.all(statuses.map((status) =>
        api.get("/admin/payments/escrow", { params: { status } })
      ));
      const unique = new Map();
      for (const { data } of results) {
        for (const payment of Array.isArray(data) ? data : []) {
          if (currentTab.status === "refund_review" && payment.refundDecision === "approved") continue;
          if (currentTab.status === "refund_workflow" && !(
            ["refund_pending", "refunded"].includes(payment.status) ||
            (payment.status === "disputed" && payment.refundDecision === "approved") ||
            (payment.status === "held" && payment.refundDecision === "rejected")
          )) continue;
          unique.set(String(payment._id), payment);
        }
      }
      if (currentRequest === requestId) payments.value = [...unique.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      const { data } = await api.get("/admin/payments/escrow", { params: { status: currentTab.status } });
      if (currentRequest === requestId) payments.value = Array.isArray(data) ? data : [];
    }
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
  refundDialogPayment.value = payment;
  refundDialogAction.value = decision;
  refundDecisionNotes.value = '';
  refundEvidenceFile.value = null;
  refundTransferReference.value = '';
  refundDecisionError.value = '';
}

function closeRefundDecision() {
  if (refundDecisionBusy.value) return;
  refundDialogPayment.value = null;
  refundEvidenceFile.value = null;
  refundDecisionNotes.value = '';
  refundTransferReference.value = '';
  refundDecisionError.value = '';
}

function chooseRefundEvidence(event) {
  refundDecisionError.value = '';
  const file = event.target.files?.[0] || null;
  if (!file) { refundEvidenceFile.value = null; return; }
  if (file.size > 2 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    refundEvidenceFile.value = null;
    event.target.value = '';
    refundDecisionError.value = 'เลือกรูป JPEG, PNG หรือ WebP ขนาดไม่เกิน 2 MB';
    return;
  }
  refundEvidenceFile.value = file;
}

async function submitRefundDecision() {
  const payment = refundDialogPayment.value;
  const decision = refundDialogAction.value;
  const notes = refundDecisionNotes.value.trim();
  const needsTransferSlip = decision === 'approved';
  if (!payment || refundDecisionBusy.value || notes.length < 10 || notes.length > 1000) return;
  if (needsTransferSlip && (!refundEvidenceFile.value || refundTransferReference.value.trim().length < 6)) return;

  refundDecisionBusy.value = true;
  actionLoading.value = payment._id;
  refundDecisionError.value = '';
  errorMessage.value = '';
  let decisionSaved = false;
  try {
    const { data } = await api.post(`/admin/payments/${payment._id}/refund-decision`, { decision, notes });
    decisionSaved = true;

    if (needsTransferSlip) {
      const body = new FormData();
      body.append('slip', refundEvidenceFile.value);
      body.append('notes', notes);
      body.append('amount', String(Number(payment.refundAmount ?? (Number(payment.amount) + Number(payment.platformFeeAmount)))));
      body.append('reference', refundTransferReference.value.trim());
      await api.post(`/admin/payments/${payment._id}/slips/refund`, body);
    }

    successMessage.value = needsTransferSlip ? 'อนุมัติคืนเงินและบันทึกหลักฐานการโอนแล้ว' : data.message;
    refundDialogPayment.value = null;
    activeTab.value = 'Refunds';
    expandedPaymentId.value = payment._id;
    await loadPayments();
  } catch (error) {
    if (decisionSaved) {
      refundDialogPayment.value = null;
      activeTab.value = 'Refunds';
      expandedPaymentId.value = payment._id;
      await loadPayments();
      errorMessage.value = `บันทึกผลอนุมัติแล้ว แต่แนบหลักฐานไม่สำเร็จ: ${error.response?.data?.message || 'กรุณาลองแนบหลักฐานอีกครั้งจากรายการคืนเงิน'}`;
    } else {
      refundDecisionError.value = error.response?.data?.message || 'ไม่สามารถบันทึกผลการคืนเงินได้';
    }
  } finally {
    refundDecisionBusy.value = false;
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
  <AdminDecisionDialog v-if="decision" v-bind="decision" @confirm="confirmDecision" @cancel="cancelDecision" />
  <div v-if="refundDialogPayment" class="refund-decision-backdrop" @click.self="closeRefundDecision">
    <section class="refund-decision-dialog" role="dialog" aria-modal="true" aria-labelledby="refund-decision-title">
      <h2 id="refund-decision-title">{{refundDialogAction === 'approved' ? 'อนุมัติคืนเงิน' : 'ปฏิเสธคำขอคืนเงิน'}}</h2>
      <p>{{refundDialogAction === 'approved' ? 'ระบุเหตุผลและแนบหลักฐานการโอนคืนเงินในขั้นตอนเดียวกัน' : 'ระบุเหตุผลที่ปฏิเสธคำขอคืนเงิน'}}</p>
      <label class="refund-decision-field">เหตุผล (10–1,000 ตัวอักษร)
        <textarea v-model="refundDecisionNotes" rows="4" minlength="10" maxlength="1000" :disabled="refundDecisionBusy" />
      </label>
      <template v-if="refundDialogAction === 'approved'">
        <label class="refund-decision-field">รูปหลักฐานการโอน (JPEG, PNG หรือ WebP ไม่เกิน 2 MB)
          <input type="file" accept="image/jpeg,image/png,image/webp" :disabled="refundDecisionBusy" @change="chooseRefundEvidence" />
        </label>
        <p v-if="refundEvidenceFile" class="refund-decision-hint">เลือกไฟล์แล้ว: {{refundEvidenceFile.name}}</p>
        <label class="refund-decision-field">เลขอ้างอิงการโอน (อย่างน้อย 6 ตัวอักษร)
          <input v-model="refundTransferReference" type="text" minlength="6" maxlength="100" :disabled="refundDecisionBusy" />
        </label>
        <p class="refund-decision-hint">ยอดคืนเงิน {{money(refundDialogPayment.refundAmount ?? (Number(refundDialogPayment.amount) + Number(refundDialogPayment.platformFeeAmount)))}}</p>
      </template>
      <p v-if="refundDecisionError" class="error-box" role="alert">{{refundDecisionError}}</p>
      <div class="refund-decision-actions">
        <button type="button" :disabled="refundDecisionBusy" @click="closeRefundDecision">ยกเลิก</button>
        <button type="button" class="confirm" :disabled="refundDecisionBusy || refundDecisionNotes.trim().length < 10 || (refundDialogAction === 'approved' && (!refundEvidenceFile || refundTransferReference.trim().length < 6))" @click="submitRefundDecision">
          {{refundDecisionBusy ? 'กำลังบันทึก…' : refundDialogAction === 'approved' ? 'อนุมัติและบันทึกหลักฐาน' : 'ยืนยันปฏิเสธ'}}
        </button>
      </div>
    </section>
  </div>
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
        {{ tab.status === 'refund_workflow' ? 'รายการคืนเงิน / ผลพิจารณา' : tab.status === 'refund_review' ? 'รอพิจารณาคืนเงิน' : tab.status === 'payment_queue' ? 'ชำระเงิน' : paymentStatus(tab.status) }}
      </button>
    </nav>

    <div v-if="errorMessage" class="error-box">
      {{ errorMessage }}
    </div>
    <p v-if="successMessage" role="status" class="refund-status">{{successMessage}}</p>

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
        <p class="refund-status">{{payment.paymentMode === 'slip_demo' ? 'สลิปจำลอง · ไม่มีการโอนเงินจริง' : payment.paymentMode === 'stripe_test' ? 'Stripe โหมดทดสอบ' : 'รายการเดิมในระบบจำลอง'}} · {{payment.refundDecision === 'rejected' ? 'ปฏิเสธคำขอคืนเงิน' : paymentStatus(payment.status)}}</p>
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
        <div class="detail-row"><span>ยอดรับรวมค่าบริการ</span><strong>{{money(Number(payment.amount)+Number(payment.platformFeeAmount))}}</strong></div>
        <template v-if="payment.paymentMode === 'stripe_test'"><div class="detail-row"><span>ค่าธรรมเนียม Stripe mock {{payment.mockGatewayFeePercent ?? '—'}}% ของค่าจ้าง</span><strong>{{payment.mockGatewayFeeAmount==null?'รายการเดิม ยังไม่มีค่า mock':money(payment.mockGatewayFeeAmount)}}</strong></div><p class="refund-status">ต้นทุนจำลองของแพลตฟอร์ม ไม่ใช่อัตราจริงของ Stripe ไม่บวกยอด hirer และไม่หักค่าจ้าง worker</p></template>

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
        <template v-if="expandedPaymentId === payment._id">
          <p v-if="payment.paymentMode === 'stripe_test' && payment.refundMethod !== 'stripe'" class="refund-status">รายการนี้ชำระผ่าน Stripe แต่การคืนเงินจะโอนโดยแอดมินและแนบหลักฐานการโอนในระบบ ไม่ได้คืนผ่าน Stripe</p>
          <template v-if="payment.hasInboundSlip || payment.status === 'awaiting_verification'"><h3 class="subtitle">สลิปขาเข้า</h3><PaymentSlipImage :payment-id="payment._id" direction="inbound" :version="payment.inboundSlipVersion" @loaded="reviewReady[payment._id + payment.inboundSlipVersion]=$event" /></template>
          <p v-if="payment.slipReviewNotes" class="refund-status">ผลตรวจสลิป: {{payment.slipReviewNotes}}</p>
          <p v-if="payment.status === 'awaiting_verification' && !reviewReady[payment._id + payment.inboundSlipVersion]" class="refund-status" role="status">ต้องเปิดรูปสำเร็จก่อนอนุมัติ หากโหลดรูปไม่ได้ สามารถลองโหลดใหม่หรือปฏิเสธสลิปพร้อมเหตุผลได้</p>
          <div v-if="payment.status === 'awaiting_verification'" class="action-row"><button type="button" class="action-btn primary" :disabled="!!actionLoading" @click="reviewSlip(payment,'approved')">อนุมัติรับเงินจำลอง</button><button type="button" class="action-btn danger" :disabled="!!actionLoading" @click="reviewSlip(payment,'rejected')">ปฏิเสธสลิป</button></div>
          <template v-if="payment.status === 'payout_pending'"><p class="refund-status">ผู้ว่าจ้างตรวจรับงานแล้ว จ่ายค่าจ้างให้ {{payment.worker?.fullName || 'ผู้รับจ้าง'}} จำนวน {{money(payment.netAmountToWorker)}} แล้วแนบหลักฐาน ระบบยังไม่นับเป็นเงินรับของ worker จนกว่าจะบันทึกขั้นตอนนี้</p><p class="refund-status">บัญชีรับเงินของ worker: {{payment.worker?.bankAccount?.bankName || 'ยังไม่ระบุธนาคาร'}} · {{payment.worker?.bankAccount?.accountNumber || 'ยังไม่ระบุเลขบัญชี'}} · {{payment.worker?.bankAccount?.accountHolderName || 'ยังไม่ระบุชื่อบัญชี'}} หากข้อมูลไม่ครบให้ผู้รับจ้างอัปเดตโปรไฟล์ก่อนจ่าย</p><PaymentSlipForm :endpoint="`/admin/payments/${payment._id}/slips/payout`" label="ยืนยันจ่ายค่าจ้างและแนบสลิป" :require-amount="true" :expected-amount="payment.netAmountToWorker" require-notes @saved="savedSlip" /></template>
          <template v-if="payment.hasPayoutSlip"><h3 class="subtitle">สลิปจ่ายค่าจ้างจำลอง</h3><PaymentSlipImage :payment-id="payment._id" direction="payout" /></template>
          <template v-if="payment.hasRefundSlip"><h3 class="subtitle">สลิปคืนเงินจำลอง</h3><PaymentSlipImage :payment-id="payment._id" direction="refund" /></template>
        </template>
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
          v-if="payment.status === 'disputed' && !payment.refundDecision"
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
        <section v-if="payment.status === 'refund_pending' || (payment.status === 'refunded' && payment.refundMethod === 'stripe' && !payment.hasRefundSlip)" class="refund-evidence-section">
          <h3 class="subtitle">{{ payment.status === 'refunded' ? 'แนบหลักฐานคืนเงินรายการเดิม' : 'แอดมินโอนคืนและแนบหลักฐาน' }}</h3>
          <p v-if="payment.status === 'refunded'" class="refund-status">รายการเดิมคืนผ่าน Stripe สำเร็จแล้ว ไม่ต้องโอนคืนผ่านธนาคารซ้ำ แอดมินแนบหลักฐานได้ที่นี่</p>
          <p class="refund-status">อนุมัติคำขอคืนเงินแล้ว · ผู้รับเงิน {{payment.hirer?.fullName || 'ผู้ว่าจ้าง'}} · {{money(payment.refundAmount)}}</p>
          <PaymentSlipForm :endpoint="`/admin/payments/${payment._id}/slips/refund`" label="แนบหลักฐานการคืนเงิน" :manual-transfer="payment.refundMethod !== 'stripe'" :require-amount="true" :expected-amount="payment.refundAmount" require-notes @saved="savedSlip" />
        </section>
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  padding: 8px;
  cursor: pointer;
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
.refund-evidence-section { margin-top:12px; padding:14px; border:1px solid var(--color-border); border-radius:var(--radius-md); background:#fafbfc; }
.refund-evidence-section .subtitle { margin:0 0 8px; font-size:14px; }
.refund-decision-backdrop { position:fixed; inset:0; z-index:1000; display:flex; align-items:center; justify-content:center; overflow:auto; padding:18px; background:#10182880; }
.refund-decision-dialog { display:grid; gap:12px; width:min(100%,520px); max-height:90dvh; overflow:auto; padding:20px; border-radius:14px; background:#fff; color:#17212f; box-shadow:0 16px 48px #0003; }
.refund-decision-dialog h2 { margin:0; font-size:18px; }
.refund-decision-dialog p { margin:0; font-size:13px; line-height:1.6; }
.refund-decision-field { display:grid; gap:7px; font-size:13px; font-weight:600; }
.refund-decision-field textarea, .refund-decision-field input { width:100%; padding:10px; border:1px solid #98a2b3; border-radius:8px; font:inherit; }
.refund-decision-field textarea { resize:vertical; }
.refund-decision-hint { color:#667085; }
.refund-decision-actions { display:flex; justify-content:flex-end; gap:10px; }
.refund-decision-actions button { min-height:42px; padding:8px 14px; border:1px solid #d0d5dd; border-radius:8px; background:#fff; font:inherit; cursor:pointer; }
.refund-decision-actions .confirm { border-color:#ffc629; background:#ffc629; color:#342600; font-weight:700; }
.refund-decision-actions button:disabled { opacity:.55; cursor:not-allowed; }

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
