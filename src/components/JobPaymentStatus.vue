<script setup>
import { computed } from 'vue';
import PaymentSlipImage from './PaymentSlipImage.vue';
import { money, dateTime, paymentStatus } from '../services/finance';
const props = defineProps({ payment: Object, role: { type: String, required: true } });
const paid = computed(() => props.payment?.status === 'released' && props.payment.hasPayoutSlip && props.payment.paidAt);
</script>

<template>
  <section class="job-payment" aria-label="สถานะค่าจ้าง" aria-live="polite">
    <h2>สถานะค่าจ้าง</h2>
    <p v-if="!payment">ยังโหลดสถานะค่าจ้างไม่ได้ กรุณารีเฟรชเพื่อตรวจสอบ</p>
    <template v-else>
      <strong>{{ paymentStatus(payment.status, payment.paymentMode, !!payment.hasPayoutSlip) }}</strong>
      <p v-if="payment.status === 'pending'">รอผู้ว่าจ้างชำระเงิน ระบบจะยืนยันก่อนผู้รับจ้างเริ่มงาน</p>
      <p v-else-if="payment.status === 'held'">รับชำระแล้ว เงินพักรองานเสร็จ ยังไม่ได้บันทึกจ่ายให้ผู้รับจ้าง</p>
      <p v-else-if="payment.status === 'payout_pending'">ผู้ว่าจ้างตรวจรับงานแล้ว รอ admin จ่ายค่าจ้าง ฿ {{ money(payment.netAmountToWorker) }} และแนบสลิป ยังไม่ถือว่า worker ได้รับค่าจ้าง</p>
      <p v-else-if="paid">admin บันทึกจ่ายค่าจ้าง ฿ {{ money(payment.payoutAmount ?? payment.netAmountToWorker) }} แล้ว เมื่อ {{ dateTime(payment.paidAt) }} · เลขอ้างอิง {{ payment.payoutReference || '—' }}</p>
      <p v-else-if="payment.status === 'released'">รายการเดิมยังไม่มีหลักฐานจ่ายค่าจ้าง กรุณาให้ผู้ดูแลตรวจสอบ</p>
      <p v-else-if="payment.status === 'disputed'">งานและค่าจ้างพักไว้ระหว่างพิจารณาคืนเงิน</p>
      <p v-else-if="payment.status === 'refund_pending'">อนุมัติคืนเงินแล้ว รอ admin บันทึกคืนเงินพร้อมสลิป</p>
      <p v-else-if="payment.status === 'refunded'">{{ payment.paymentMode === 'stripe_test' ? 'Stripe ยืนยันคืนเงินให้ผู้ว่าจ้างแล้ว' : 'บันทึกคืนเงินให้ผู้ว่าจ้างแล้ว' }}{{ payment.hasRefundSlip ? ' มีหลักฐานคืนเงินแล้ว' : ' รอ admin แนบหลักฐานคืนเงิน' }}</p>
      <template v-if="paid"><h3>หลักฐานจ่ายค่าจ้าง</h3><PaymentSlipImage :payment-id="payment.id" direction="payout" /></template>
      <template v-if="role === 'hirer' && payment.hasRefundSlip"><h3>หลักฐานคืนเงิน</h3><PaymentSlipImage :payment-id="payment.id" direction="refund" /></template>
      <p class="hint">ระบบทดสอบ การบันทึกสลิปเป็นข้อมูลที่ admin ยืนยัน ไม่ได้ตรวจยอดเข้าบัญชีธนาคารอัตโนมัติ</p>
    </template>
  </section>
</template>

<style scoped>
.job-payment{background:#fffaf0;border:1px solid #f3d995;border-radius:12px;padding:16px;margin:14px 0;font-size:13px;line-height:1.7}.job-payment h2{font-size:16px;margin:0 0 8px}.job-payment h3{font-size:14px}.job-payment p{margin:8px 0}.hint{font-size:12px;color:#667085}
</style>
