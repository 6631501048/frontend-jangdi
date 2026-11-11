<script setup>
// FR-SERV-04: ผู้ว่าจ้างเรียกดู Service Post ที่ใช้งานอยู่ และส่ง Service Request พร้อมรายละเอียดคำสั่งซื้อ
// FR-SERV-06: หน้านี้เช็คเบื้องต้นว่า Service Post ยังไม่เต็มจำนวนออร์เดอร์/ยังไม่ถูกปิด (เช็คจริงตอนเรียก API)
// FR-SERV-07: เมื่อผู้รับจ้างยอมรับ Service Request นี้ ระบบจะแปลงเป็นบันทึกงาน (Job)
// FR-PAY-01: เมื่อ Service Request ได้รับการยอมรับ เงินของผู้ว่าจ้างจะถูกนำเข้าสู่ระบบ Escrow
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
import { calculatePaymentFees, defaultPaymentTerms } from "../../services/paymentFees";

const route = useRoute();
const router = useRouter();
const loadingPost = ref(true);
const errorMsg = ref("");
const feeTerms = ref({ ...defaultPaymentTerms });

function timeAgo(dateStr) {
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

const servicePost = ref({
  id: route.params.id,
  workerName: "",
  postedAgo: "-",
  description: "",
  category: "",
  serviceType: "shopping",
  serviceFee: 0,
  window: "-",
  distance: "-",
  fromLabel: "",
  fromDetail: "",
});

const form = ref({
  serviceFee: 0,
  itemName: "",
  pickupLocation: "",
  passengerCount: 1,
  from: "",
  to: "",
  requirements: "",
});
const isDelivery = computed(() => servicePost.value.category === "delivery");
const deliveryMode = computed(() => servicePost.value.serviceType || "shopping");
const isPassenger = computed(() => deliveryMode.value === "passenger");
const needsPickupLocation = computed(() => deliveryMode.value === "pickup_delivery" || isPassenger.value);
const serviceFeeLabel = computed(() => isPassenger.value ? "ค่าจ้างต่อเที่ยว" : deliveryMode.value === "shopping" ? "ค่าจ้างต่อออร์เดอร์รับหิ้ว" : "ค่าจ้างต่อเที่ยว");
const feeBreakdown = computed(() => calculatePaymentFees(form.value.serviceFee, feeTerms.value, { deliveryService: isDelivery.value }));
const platformFee = computed(() => feeBreakdown.value.platformFeeAmount);
const payableTotal = computed(() => feeBreakdown.value.totalDue);

async function loadServicePost() {
  loadingPost.value = true;
  try {
    const { data } = await api.get(`/service-posts/${route.params.id}`);
    servicePost.value = {
      id: data._id,
      workerName: data.worker?.fullName || "ผู้รับจ้าง",
      postedAgo: timeAgo(data.createdAt),
      description: data.description,
      category: data.category,
      serviceType: data.serviceType || "shopping",
      serviceFee: data.fee,
      window: new Date(data.availabilityEnd).toLocaleString("th-TH"),
      distance: `${(data.serviceRadiusMeters / 1000).toFixed(1)} กม.`,
      fromLabel: data.locationLabel || data.title,
      fromDetail: "",
    };
    form.value.serviceFee = Number(data.fee || 0);
    form.value.from = data.locationLabel || data.title;
    try {
      const { data: terms } = await api.get('/payments/config');
      feeTerms.value = { ...feeTerms.value, ...terms };
    } catch { /* Display the configured defaults when the terms endpoint is unavailable. */ }
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "โหลดข้อมูลประกาศบริการไม่สำเร็จ";
  } finally {
    loadingPost.value = false;
  }
}
onMounted(loadServicePost);

/* ---------- ขั้นตอน: 1 กรอกรายละเอียด, 2 สรุปคำสั่งซื้อ, สำเร็จ ---------- */
const step = ref(1);
const submitting = ref(false);
const hired = ref(false);
const showSuccessModal = ref(false);

const step1Valid = computed(
  () =>
    (!isDelivery.value || (isPassenger.value
      ? Number.isInteger(Number(form.value.passengerCount)) && Number(form.value.passengerCount) >= 1
      : form.value.itemName.trim() && form.value.requirements.trim())) &&
    (!needsPickupLocation.value || form.value.pickupLocation.trim()) &&
    form.value.to.trim()
);

function goToSummary() {
  if (!step1Valid.value) return;
  step.value = 2;
}
function back() {
  if (step.value === 2) step.value = 1;
  else router.back();
}

async function confirmHiring() {
  // FR-SERV-04: ServiceRequest.orderDetails เป็น string เดียว จึงรวมรายละเอียดฟอร์มเป็นข้อความอ่านง่าย
  const orderDetails = [
    isDelivery.value && !isPassenger.value ? `สิ่งของ: ${form.value.itemName.trim()}` : null,
    needsPickupLocation.value ? `จุดรับ: ${form.value.pickupLocation.trim()}` : null,
    isPassenger.value ? `จำนวนผู้โดยสาร: ${form.value.passengerCount}` : null,
    `ปลายทาง: ${form.value.to}`,
    form.value.requirements ? `รายละเอียดของ: ${form.value.requirements.trim()}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  submitting.value = true;
  errorMsg.value = "";
  try {
    await api.post(`/service-posts/${servicePost.value.id}/requests`, {
      orderDetails,
      orderData: {
        serviceType: isDelivery.value ? deliveryMode.value : null,
        itemName: form.value.itemName.trim(),
        pickupLocation: form.value.pickupLocation.trim(),
        passengerCount: Number(form.value.passengerCount),
        from: form.value.from.trim(),
        to: form.value.to.trim(),
        requirements: form.value.requirements.trim(),
      },
    });
    hired.value = true;
    showSuccessModal.value = true;
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "ส่งคำขอบริการไม่สำเร็จ";
  } finally {
    submitting.value = false;
  }
}

function closeModal() {
  showSuccessModal.value = false;
  router.push("/hirer");
}
</script>

<template>
  <div class="page">
    <!-- แถบด้านบนแบบ sub-page -->
    <header class="topbar">
      <button class="icon-btn" aria-label="ย้อนกลับ" @click="back">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="title">Hiring</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>

    <main class="content">
      <!-- ===== ขั้นตอน 1: กรอกรายละเอียดการจ้าง ===== -->
      <template v-if="step === 1">
        <div class="card">
          <div class="post-head">
            <span class="avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
            </span>
            <div>
              <p class="worker-name">{{ servicePost.workerName }} <span class="posted-ago">{{ servicePost.postedAgo }}</span></p>
              <p class="post-desc">{{ servicePost.description }}</p>
            </div>
          </div>
          <div class="tags">
            <span class="tag">{{ isDelivery ? 'ค่าจ้าง/ออร์เดอร์' : 'ค่าบริการ' }} ฿{{ servicePost.serviceFee }}</span>
            <span class="tag">{{ servicePost.window }}</span>
            <span class="tag">{{ servicePost.distance }}</span>
          </div>
        </div>

        <div class="card">
          <p class="section-title">{{ isDelivery ? 'รายละเอียดคำขอ' : 'รายละเอียดการจ้าง' }}</p>

          <label class="field-label">{{ isDelivery ? serviceFeeLabel : 'ค่าบริการผู้รับงาน' }}</label>
          <div class="input-suffix">
            <input v-model.number="form.serviceFee" type="number" min="0" readonly aria-label="Service Fee จากประกาศ" />
            <span class="suffix">Baht</span>
          </div>

          <label class="field-label">จุดรับ / จุดเริ่มต้น</label>
          <div class="input-icon">
            <input v-model="form.from" type="text" readonly aria-readonly="true" />
            <svg class="pin" viewBox="0 0 24 24"><path d="M12 21s-7-6.5-7-11a7 7 0 0114 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
          </div>
          <p class="field-hint">{{ servicePost.fromDetail }}</p>

          <template v-if="isDelivery && !isPassenger">
            <label class="field-label">{{ deliveryMode === 'shopping' ? 'รายการของที่ฝากหิ้ว' : 'สิ่งของ/พัสดุที่ให้ไปรับ' }}</label>
            <input v-model="form.itemName" type="text" :placeholder="deliveryMode === 'shopping' ? 'เช่น อาหารหรือของใช้ที่ต้องการซื้อ' : 'เช่น เอกสารหรือพัสดุ'" />
            <label class="field-label">รายละเอียดสิ่งของ</label>
            <textarea v-model="form.requirements" rows="3" placeholder="จำนวน ขนาด สี หรือลักษณะของ"></textarea>
          </template>

          <template v-if="isPassenger">
            <label class="field-label">จำนวนผู้โดยสาร</label>
            <input v-model.number="form.passengerCount" type="number" min="1" step="1" />
            <label class="field-label">หมายเหตุการเดินทาง</label>
            <textarea v-model="form.requirements" rows="2" placeholder="เช่น สัมภาระหรือจุดสังเกต"></textarea>
          </template>

          <template v-if="needsPickupLocation">
            <label class="field-label">{{ isPassenger ? 'จุดรับผู้โดยสาร' : 'สถานที่เข้ารับของ' }}</label>
            <input v-model="form.pickupLocation" type="text" :placeholder="isPassenger ? 'ระบุจุดรับผู้โดยสาร' : 'ระบุสถานที่รับพัสดุ/สิ่งของ'" />
          </template>

          <label class="field-label">{{ isPassenger ? 'จุดหมายปลายทาง' : deliveryMode === 'pickup_delivery' ? 'สถานที่นำของไปส่ง' : isDelivery ? 'สถานที่ไปส่งของ' : 'สถานที่ปลายทาง' }}</label>
          <div class="input-icon">
            <input v-model="form.to" type="text" placeholder="เลือกที่อยู่ปลายทาง" />
            <svg class="chevron" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
          </div>

          <p v-if="isDelivery && !isPassenger" class="payment-note">ค่าสินค้าชำระกับผู้รับจ้างเมื่อมาถึงสถานที่ส่งของ</p>

          <template v-if="!isDelivery">
            <label class="field-label">Requirements</label>
            <textarea v-model="form.requirements" rows="3" placeholder="ระบุรายละเอียดหรือสิ่งที่ต้องการ"></textarea>
          </template>

        </div>

        <div class="actions">
          <button class="btn-muted" @click="router.back()">Cancel</button>
          <button class="btn-primary" :disabled="!step1Valid" @click="goToSummary">Hiring</button>
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </template>

      <!-- ===== ขั้นตอน 2: สรุปคำสั่งซื้อ ===== -->
      <template v-else>
        <div class="card">
          <p class="section-title">Order Summary</p>
          <dl class="review-list">
            <div class="review-row">
              <dt>Worker</dt>
              <dd>{{ servicePost.workerName }}</dd>
            </div>
            <div class="review-row">
              <dt>จุดรับ / จุดเริ่มต้น</dt>
              <dd>{{ form.from }}</dd>
            </div>
            <div v-if="isDelivery && !isPassenger" class="review-row">
              <dt>{{ deliveryMode === 'shopping' ? 'ของที่ฝากหิ้ว' : 'สิ่งของที่ไปรับ' }}</dt>
              <dd>{{ form.itemName }}</dd>
            </div>
            <div v-if="needsPickupLocation" class="review-row"><dt>{{ isPassenger ? 'จุดรับผู้โดยสาร' : 'สถานที่รับของ' }}</dt><dd>{{ form.pickupLocation }}</dd></div>
            <div v-if="isPassenger" class="review-row"><dt>จำนวนผู้โดยสาร</dt><dd>{{ form.passengerCount }} คน</dd></div>
            <div class="review-row">
              <dt>To</dt>
              <dd>{{ form.to }}</dd>
            </div>
            <div class="review-row">
              <dt>Requirement</dt>
              <dd>{{ form.requirements || "-" }}</dd>
            </div>
            <div class="review-row">
              <dt>{{ isDelivery ? serviceFeeLabel : 'ค่าจ้างผู้รับงาน' }}</dt>
              <dd>฿{{ form.serviceFee }}</dd>
            </div>
            <div class="review-row">
              <dt>ค่าบริการแพลตฟอร์ม (รวมค่าธรรมเนียมธุรกรรม)</dt>
              <dd>฿{{ platformFee.toFixed(2) }}</dd>
            </div>
            <div class="review-row total">
              <dt>ยอดชำระผ่านระบบ</dt>
              <dd>฿{{ payableTotal.toFixed(2) }}</dd>
            </div>
            <p v-if="isDelivery && !isPassenger" class="payment-note">ค่าสินค้าชำระกับผู้รับจ้างเมื่อมาถึงสถานที่ส่งของ</p>
          </dl>
        </div>

        <div class="actions">
          <button class="btn-muted" @click="step = 1">Cancel</button>
          <button class="btn-primary" :disabled="submitting" @click="confirmHiring">
            {{ submitting ? "Confirming..." : "Confirm Hiring" }}
          </button>
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </template>
    </main>

    <!-- ===== โมดัลสำเร็จ ===== -->
    <Transition name="fade">
      <div v-if="showSuccessModal" class="modal-backdrop" @click="closeModal">
        <div class="modal-card" @click.stop>
          <div class="check-circle">
            <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 class="modal-title">Hiring Successful</h2>
          <p class="modal-sub">You have successfully hired {{ servicePost.workerName }}.</p>
          <button class="btn-primary" @click="closeModal">Done</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; background: #f0f0f0; }
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

/* ---------- Top bar (sub-page) ---------- */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; background: #fff; position: sticky; top: 0; z-index: 10;
  border-bottom: 1px solid #eee;
}
.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border: none; background: transparent;
  border-radius: 50%; color: #111; cursor: pointer;
}
.title { margin: 0; font-size: 15px; font-weight: 700; color: #111; }
.spacer { width: 40px; }

.content { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }

/* ---------- หัวโพสต์ผู้รับจ้าง ---------- */
.post-head { display: flex; gap: 10px; }
.avatar {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; border: 1px solid #ddd;
  display: flex; align-items: center; justify-content: center; color: #555;
}
.worker-name { margin: 0; font-size: 14px; font-weight: 700; color: #111; }
.posted-ago { font-size: 11px; font-weight: 400; color: #999; margin-left: 4px; }
.post-desc { margin: 2px 0 0; font-size: 12.5px; color: #555; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.tag { background: #eee; color: #444; font-size: 11px; padding: 3px 8px; border-radius: 10px; }

/* ---------- ฟอร์ม ---------- */
.section-title { margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #111; }
.field-label { display: block; margin-top: 12px; margin-bottom: 4px; font-size: 12px; color: #666; }
.field-hint { margin: 4px 0 0; font-size: 11px; color: #999; }
.payment-note { margin: 12px 0 0; padding: 10px 12px; border-radius: 8px; background: #fff6d8; color: #705500; font-size: 12px; line-height: 1.5; }
input, textarea {
  width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #ddd;
  font-size: 13px; font-family: inherit; min-height: 42px; color: #111; background: #fff;
}
textarea { resize: vertical; }
.input-suffix { position: relative; display: flex; align-items: center; }
.input-suffix input { padding-right: 46px; }
.input-suffix .suffix { position: absolute; right: 12px; font-size: 12px; color: #999; }
.input-icon { position: relative; display: flex; align-items: center; }
.input-icon input { padding-right: 36px; }
.input-icon .pin, .input-icon .chevron { position: absolute; right: 10px; width: 16px; height: 16px; color: #999; }

/* ---------- สรุปคำสั่งซื้อ ---------- */
.review-list { margin: 0; display: flex; flex-direction: column; }
.review-row { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; border-bottom: 1px solid #f2f2f2; }
.review-row:last-child { border-bottom: none; }
.review-row dt { flex-shrink: 0; font-size: 12px; color: #999; }
.review-row dd { margin: 0; font-size: 13px; color: #111; font-weight: 600; text-align: right; }
.review-row.total dt, .review-row.total dd { font-size: 15px; font-weight: 800; color: #111; }
.review-row.total dd { color: #d99a00; }

/* ---------- ปุ่ม ---------- */
.actions { display: flex; gap: 10px; }
.btn-primary, .btn-muted {
  flex: 1; min-height: 44px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;
}
.btn-primary { background: #ffc93c; border: none; color: #111; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-muted { background: #e5e5e5; border: none; color: #333; }
.error-msg { margin: 10px 0 0; font-size: 12px; color: #e11d48; text-align: center; }

/* ---------- โมดัลสำเร็จ ---------- */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 30; padding: 24px;
}
.modal-card {
  width: 100%; max-width: 320px; background: #fff; border-radius: 14px; padding: 28px 20px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.check-circle {
  width: 56px; height: 56px; border-radius: 50%; background: #22c55e; color: #fff;
  display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
}
.check-circle svg { width: 28px; height: 28px; stroke-width: 3; }
.modal-title { margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #111; }
.modal-sub { margin: 0 0 20px; font-size: 12.5px; color: #888; }
.modal-card .btn-primary { width: 100%; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
