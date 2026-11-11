<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '../../services/api';
import AppHeader from '../../components/AppHeader.vue';
import PaymentSlipForm from '../../components/PaymentSlipForm.vue';
import PaymentSlipImage from '../../components/PaymentSlipImage.vue';
import { money,paymentStatus,dateTime } from '../../services/finance';
const route=useRoute();
const job=ref(null),payment=ref(null),config=ref(null),stripeStatus=ref(null),loading=ref(false),busy=ref(false),error=ref(''),success=ref('');
const canSubmit=computed(()=>payment.value && ['pending','slip_rejected'].includes(payment.value.status) && ['demo','slip_demo'].includes(payment.value.paymentMode));
const isStripe=computed(()=>payment.value?.paymentMode==='stripe_test');
const steps=computed(()=>[
  {title:'ชำระเงิน',description:'บัตรหรือ PromptPay ผ่าน Stripe ไม่ต้องแนบสลิป',done:['held','payout_pending','released','disputed','refund_pending','refunded'].includes(payment.value?.status)},
  {title:'เริ่มงานและส่งงาน',description:'ผู้รับจ้างทำงานและส่งหลักฐาน',done:['awaiting_confirmation','completed'].includes(job.value?.status)},
  {title:'ตรวจรับงาน',description:'ตรวจผลงานก่อนยืนยันรับงาน',done:job.value?.status==='completed'},
  {title:'ติดตามการจ่ายค่าจ้าง',description:'admin จ่ายค่าจ้างและแนบสลิปให้ worker',done:!!payment.value?.hasPayoutSlip},
]);
const nextAction=computed(()=>({pending:isStripe.value?'ชำระผ่าน Stripe แล้วระบบจะตรวจสถานะให้อัตโนมัติ':'ชำระผ่าน Stripe ด้านล่างได้โดยไม่ต้องแนบสลิป หรือเลือกทดสอบด้วยสลิปจำลอง',slip_rejected:'ตรวจเหตุผลที่ถูกปฏิเสธ แล้วแนบสลิปใหม่',awaiting_verification:'รอผู้ดูแลตรวจสลิป เมื่ออนุมัติแล้วผู้รับจ้างจะเริ่มงานได้',held:'ชำระแล้ว ผู้รับจ้างเริ่มงานได้ ติดตามงานและตรวจรับที่หน้ารายละเอียดงาน',payout_pending:'ตรวจรับงานแล้ว รอผู้ดูแลบันทึกจ่ายค่าจ้าง',released:'ตรวจรับงานแล้ว ดูรายละเอียดและหลักฐานการจ่ายด้านล่าง',disputed:'รอผลพิจารณาคืนเงิน ติดตามสถานะได้ที่หน้านี้',refund_pending:'รอผู้ดูแลบันทึกคืนเงินพร้อมสลิป',refunded:'คืนเงินแล้ว ตรวจสอบรายละเอียดรายการได้ด้านล่าง'})[payment.value?.status] || 'ตรวจสอบรายละเอียดรายการด้านล่าง');
let refreshTimer,disposed=false,inFlight=false;
const needsSync=()=>isStripe.value && ((payment.value.status==='pending' && payment.value.hasStripeSession) || (payment.value.status==='disputed' && payment.value.refundDecision==='approved' && payment.value.stripeRefundId && !['failed','canceled'].includes(payment.value.refundStatus)));
const shouldRefresh=()=>needsSync() || ['held','payout_pending','refund_pending'].includes(payment.value?.status) || (payment.value?.status==='refunded' && !payment.value.hasRefundSlip);
async function load(quiet=false){
  if(inFlight || disposed)return;
  inFlight=true;clearTimeout(refreshTimer);
  if(!quiet)loading.value=true;error.value='';
  try{
    const [j,p,c,s]=await Promise.all([api.get(`/jobs/${route.params.id}`),api.get(`/payments/${route.params.id}/mock`),api.get('/payments/config'),api.get('/payments/stripe/status').catch(()=>({data:{ready:false}}))]);
    if(disposed)return;
    job.value=j.data;payment.value=p.data;config.value=c.data;stripeStatus.value=s.data;
    if(needsSync()){
      await api.post(`/payments/${route.params.id}/stripe/sync`);
      const updated=await api.get(`/payments/${route.params.id}/mock`);
      if(!disposed)payment.value=updated.data;
    }
  }
  catch(err){error.value=err.response?.data?.message || 'โหลดรายละเอียดการชำระเงินไม่สำเร็จ';}
  finally{loading.value=false;inFlight=false;if(!disposed && shouldRefresh())refreshTimer=setTimeout(()=>load(true),8000);}
}
async function saved(message){success.value=message;await load();}
async function checkout(){
  busy.value=true;error.value='';
  try{const {data}=await api.post(`/payments/${route.params.id}/checkout`);const url=new URL(data.url);if(url.protocol!=='https:' || url.hostname!=='checkout.stripe.com')throw new Error('Invalid URL');window.location.assign(url.href);}
  catch(err){error.value=err.response?.data?.message || 'เปิด Stripe ทดสอบไม่สำเร็จ';}
  finally{busy.value=false;}
}
onMounted(()=>load());
onBeforeUnmount(()=>{disposed=true;clearTimeout(refreshTimer);});
</script>
<template>
  <main class="payment"><AppHeader title="ชำระเงินและติดตามสถานะ" /><div class="content">
    <p class="notice">Stripe โหมดทดสอบ: hirer ชำระผ่านบัตรหรือ QR โดยไม่ต้องแนบสลิป เมื่อจบงาน admin จะบันทึกจ่ายพร้อมหลักฐานให้ worker ไม่มีการโอนเงินจริงในระบบทดสอบ</p>
    <p v-if="error" class="error" role="alert">{{error}}</p><p v-if="success" class="success" role="status">{{success}}</p>
    <p v-if="loading" role="status">กำลังโหลดข้อมูล…</p>
    <template v-else-if="job && payment && config">
      <section class="card"><h2>ขั้นตอนการชำระเงิน</h2><ol class="steps"><li v-for="(step,index) in steps" :key="step.title" :class="{done:step.done}"><span class="step-number">{{step.done?'✓':index+1}}</span><div><strong>{{step.title}}</strong><p class="hint">{{step.description}}</p></div></li></ol><div class="next-action" role="status"><strong>{{paymentStatus(payment.status,payment.paymentMode,!!payment.hasPayoutSlip)}}</strong><p>{{nextAction}}</p></div><p v-if="shouldRefresh()" class="hint">ตรวจสอบสถานะอัตโนมัติทุก 8 วินาทีขณะเปิดหน้านี้</p></section>
      <section class="card"><h2>{{job.title}}</h2><dl><div><dt>ค่าจ้างผู้รับจ้าง</dt><dd>฿ {{money(payment.amount)}}</dd></div><div><dt>ค่าบริการแพลตฟอร์มรวมค่าธรรมเนียมธุรกรรม</dt><dd>฿ {{money(payment.platformFeeAmount)}}</dd></div><div class="total"><dt>{{payment.paymentMode==='stripe_test'?'ยอดชำระผ่าน Stripe ทดสอบ':'ยอดโอนจำลอง'}}</dt><dd>฿ {{money(payment.totalDue)}}</dd></div><div><dt>สถานะ</dt><dd>{{paymentStatus(payment.status, payment.paymentMode, !!payment.hasPayoutSlip)}}</dd></div></dl></section>
      <details v-if="canSubmit" class="card"><summary>ทางเลือก: ทดสอบรับเงินด้วยสลิปจำลอง</summary><h2>1. ตรวจสอบบัญชีทดสอบ</h2><p>{{config.bank.name}}</p><p>เลขบัญชี: <strong>{{config.bank.accountNumber}}</strong></p><p>ชื่อบัญชี: {{config.bank.accountName}}</p><p class="hint">เป็นข้อมูลตัวอย่างสำหรับจำลอง ไม่ใช่บัญชีรับเงินจริง</p><h2>2. แนบสลิปทดสอบ</h2><p class="hint">ตรวจยอด ฿ {{money(payment.totalDue)}} แล้วเลือกภาพสลิปตัวอย่าง ผู้ดูแลจะเป็นผู้ยืนยันรับเงิน</p><PaymentSlipForm :endpoint="`/payments/${route.params.id}/slips/inbound`" label="ยืนยันโอนจำลองและส่งสลิป" @saved="saved" /></details>
      <section v-if="isStripe || payment.status==='pending'" class="card"><h2>ค่าธรรมเนียมธุรกรรมจำลอง (3.65% + ฿10)</h2><p>{{payment.mockGatewayFeePercent ?? config.mockStripeFeePercent ?? 3.65}}% ของยอดชำระรวม + ฿{{money(payment.mockGatewayFeeFixedAmount ?? config.mockStripeFixedFeeAmount ?? 10)}} = ฿ {{money(payment.mockGatewayFeeAmount ?? payment.gatewayFeeAmount ?? (Number(payment.totalDue) * Number(payment.mockGatewayFeePercent ?? config.mockStripeFeePercent ?? 3.65) / 100 + Number(payment.mockGatewayFeeFixedAmount ?? config.mockStripeFixedFeeAmount ?? 10)))}}</p><p class="hint">รวมอยู่ในค่าบริการแพลตฟอร์มแล้ว และหักเป็นต้นทุนจากรายได้แอป ไม่หักจากค่าจ้าง worker</p></section>
      <section v-if="payment.status==='refunded' && !payment.hasRefundSlip" class="card"><h2>คืนเงินแล้ว รอ admin แนบหลักฐาน</h2><p>{{isStripe?'Stripe ยืนยันคืนเงินแล้ว ไม่ต้องโอนคืนซ้ำ':'รายการเดิมบันทึกคืนเงินแล้ว'}} admin จะนำหลักฐานมาแนบในรายการนี้</p></section>
      <section v-if="payment.status==='awaiting_verification'" class="card"><h2>รอผู้ดูแลตรวจรับสลิป</h2><p>ส่งหลักฐานแล้ว ผู้รับจ้างจะเริ่มงานได้หลังผู้ดูแลอนุมัติ กดตรวจสอบสถานะเพื่อดูผลล่าสุด</p></section>
      <p v-if="payment.slipReviewNotes" class="notice">ผลตรวจสลิป: {{payment.slipReviewNotes}}</p>
      <section v-if="payment.hasInboundSlip" class="card"><h2>สลิปที่ส่งให้ผู้ดูแล</h2><PaymentSlipImage :payment-id="payment.id" direction="inbound" :version="payment.inboundSlipVersion" /></section>
      <section v-if="payment.status==='payout_pending'" class="card"><h2>รับงานแล้ว รอผู้ดูแลจ่ายค่าจ้าง</h2><p>ยืนยันงานเสร็จแล้ว แต่ยังไม่มีการบันทึกสลิปจ่ายให้ผู้รับจ้าง</p></section>
      <section v-if="payment.status==='refund_pending'" class="card"><h2>อนุมัติคืนเงินแล้ว รอสลิปคืนเงิน</h2><p>ผู้ดูแลจะบันทึกคืนเงินจำลองเต็มยอด ฿ {{money(payment.refundAmount)}}</p></section>
      <section v-if="payment.hasPayoutSlip" class="card"><h2>หลักฐานที่ admin จ่ายค่าจ้างให้ worker</h2><p>บันทึกจ่าย ฿ {{money(payment.payoutAmount ?? payment.netAmountToWorker)}} เมื่อ {{dateTime(payment.paidAt)}} · เลขอ้างอิง {{payment.payoutReference}}</p><PaymentSlipImage :payment-id="payment.id" direction="payout" /></section>
      <section v-if="payment.hasRefundSlip" class="card"><h2>หลักฐานคืนเงินที่ admin แนบ</h2><p>เลขอ้างอิง {{payment.refundReference}}</p><PaymentSlipImage :payment-id="payment.id" direction="refund" /></section>
      <section v-if="payment.status==='pending'" class="card">
        <h2>ชำระด้วยบัตร / PromptPay ผ่าน Stripe ทดสอบ</h2>
        <p class="hint">เลือกบัตรหรือ PromptPay บนหน้า Stripe โดย PromptPay จะแสดง QR สำหรับทดสอบ หากยกเลิกหรือบัตรถูกปฏิเสธ สามารถเปิด Stripe เพื่อลองใหม่ได้</p>
        <p class="notice">ใช้โหมดทดสอบเท่านั้น ไม่ต้องโอนเงินจริงผ่านแอปธนาคาร สร้าง QR แล้วยังไม่ถือว่าชำระ ต้องรอ Stripe ยืนยันก่อนเริ่มงาน</p>
        <p class="hint">ชำระผ่าน Stripe แล้วไม่ต้องแนบสลิป ระบบตรวจผลจาก Stripe โดยตรง ส่วนการคืนเงินใช้ Stripe Refund และ admin แนบหลักฐานหลังคืนสำเร็จ</p>
        <p v-if="!stripeStatus?.ready" class="notice">Stripe ทดสอบยังไม่พร้อม กรุณาให้ผู้ดูแลตั้งค่า test key ที่ backend แล้วเริ่มระบบใหม่</p>
        <button class="secondary" :disabled="busy || !stripeStatus?.ready" @click="checkout">{{busy?'กำลังเปิด Stripe…':'ชำระผ่าน Stripe ทดสอบ (บัตร / PromptPay)'}}</button>
      </section>
      <p v-if="route.query.checkout==='success' && payment.status==='pending'" class="notice" role="status">กลับจาก Stripe แล้ว กำลังตรวจสอบการชำระเงินกับ Stripe อัตโนมัติ การกลับมาหน้านี้ยังไม่ถือว่าชำระสำเร็จ</p>
      <p v-if="route.query.checkout==='cancelled' && payment.status==='pending'" class="notice" role="status">คุณกลับจากหน้าชำระเงินโดยยังไม่มีการยืนยันสำเร็จ สามารถเปิด Stripe เพื่อลองใหม่ได้</p>
      <section v-if="payment.paymentMode==='stripe_test' && payment.status==='disputed' && payment.refundDecision==='approved'" class="card"><h2>สถานะคืนเงินผ่าน Stripe ทดสอบ</h2><p v-if="['failed','canceled'].includes(payment.refundStatus)" class="error">Stripe คืนเงินไม่สำเร็จ กรุณาติดต่อผู้ดูแลเพื่อตรวจสอบ</p><p v-else>อนุมัติคำขอแล้ว กำลังรอ Stripe ยืนยันการคืนเงิน ยังไม่บันทึกว่าคืนเงินสำเร็จ</p></section>
    </template>
    <button class="secondary" :disabled="loading || busy" @click="load()">ตรวจสอบสถานะล่าสุด</button>
    <RouterLink class="primary" :to="{name:'hirer-job-detail',params:{id:route.params.id}}">กลับรายละเอียดงาน</RouterLink>
  </div></main>
</template>
<style scoped>.steps{list-style:none;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.steps li{display:flex;gap:8px;align-items:flex-start}.steps .hint{margin:4px 0}.step-number{display:grid;place-items:center;flex-shrink:0;width:26px;height:26px;background:#fff0b3;border-radius:50%;font-weight:700}.done .step-number{background:#dcfce7;color:#166534}.next-action{background:#f8fafc;border-left:4px solid #ffc629;padding:12px}.next-action p{margin:4px 0 0}@media(max-width:540px){.steps{grid-template-columns:1fr;gap:12px}}.payment{min-height:100vh;background:#f5f6f8}.content{padding:16px;display:grid;gap:14px;font-size:13px;line-height:1.7}.card{background:white;padding:16px;border-radius:12px;border:1px solid #e5e7eb}h2{font-size:15px;margin:0 0 10px}dl{margin:0}dl div{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #eee}dd{margin:0;text-align:right;font-weight:700}.total{font-size:16px}.notice{background:#fff3cd;color:#735200;padding:12px;border-radius:10px;margin:0}.hint{color:#667085;font-size:12px}.error{color:#b42318}.success{color:#167044}.primary,.secondary{display:block;text-align:center;padding:12px;border-radius:9px;font:inherit;cursor:pointer;text-decoration:none}.primary{background:#ffc629;color:#342600;font-weight:700}.secondary{border:1px solid #d1d5db;background:white;color:#344054}button:disabled{opacity:.5}summary{font-weight:700;cursor:pointer}</style>
