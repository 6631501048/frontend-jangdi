<script setup>
// FR-SERV-04: ผู้ว่าจ้างเรียกดู Service Post ที่ใช้งานอยู่ และส่ง Service Request พร้อมรายละเอียดคำสั่งซื้อ
// FR-SERV-06: หน้านี้เช็คเบื้องต้นว่า Service Post ยังไม่เต็มจำนวนออร์เดอร์/ยังไม่ถูกปิด (เช็คจริงตอนเรียก API)
// FR-SERV-07: เมื่อผู้รับจ้างยอมรับ Service Request นี้ ระบบจะแปลงเป็นบันทึกงาน (Job)
// FR-PAY-01: เมื่อ Service Request ได้รับการยอมรับ เงินของผู้ว่าจ้างจะถูกนำเข้าสู่ระบบ Escrow
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

/* ---------- ข้อมูล Service Post ที่จะจ้าง ----------
   TODO: แทนที่ mock นี้ด้วย GET /api/service-posts/{route.params.id} */
const servicePost = ref({
  id: route.params.id,
  workerName: "Somsak",
  postedAgo: "3m ago",
  description: "I'm going to buy chicken rice at Ling Lin. Does anyone want some?",
  serviceFee: 20,
  window: "within 1 hour",
  distance: "2 km",
  fromLabel: "Ling Lin MFU",
  fromDetail: "514 87 หมู่ ถนน กม.มหาวิทยาลัยแม่ฟ้าหลวง เชียงราย 57100",
});

/* ---------- ขั้นตอน: 1 กรอกรายละเอียด, 2 สรุปคำสั่งซื้อ, สำเร็จ ---------- */
const step = ref(1);
const submitting = ref(false);
const hired = ref(false);
const showSuccessModal = ref(false);

const form = ref({
  serviceFee: servicePost.value.serviceFee,
  from: servicePost.value.fromLabel,
  to: "Lamduan 4",
  estimatedDelivery: "",
  requirements: "",
  price: null,
});

const step1Valid = computed(
  () =>
    form.value.to.trim() &&
    form.value.estimatedDelivery.trim() &&
    form.value.price !== null &&
    form.value.price !== ""
);

const total = computed(() => Number(form.value.serviceFee || 0) + Number(form.value.price || 0));

function goToSummary() {
  if (!step1Valid.value) return;
  step.value = 2;
}
function back() {
  if (step.value === 2) step.value = 1;
  else router.back();
}

function confirmHiring() {
  // TODO FR-SERV-04: POST /api/service-posts/{servicePost.id}/requests
  // { to, estimatedDelivery, requirements, price, serviceFee } -> สร้าง Service Request รอผู้รับจ้างยอมรับ
  submitting.value = true;
  setTimeout(() => {
    submitting.value = false;
    hired.value = true;
    showSuccessModal.value = true;
  }, 400);
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
            <span class="tag">฿{{ servicePost.serviceFee }}</span>
            <span class="tag">{{ servicePost.window }}</span>
            <span class="tag">{{ servicePost.distance }}</span>
          </div>
        </div>

        <div class="card">
          <p class="section-title">Details</p>

          <label class="field-label">Service Fee</label>
          <div class="input-suffix">
            <input v-model.number="form.serviceFee" type="number" min="0" />
            <span class="suffix">Baht</span>
          </div>

          <label class="field-label">From</label>
          <div class="input-icon">
            <input v-model="form.from" type="text" />
            <svg class="pin" viewBox="0 0 24 24"><path d="M12 21s-7-6.5-7-11a7 7 0 0114 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
          </div>
          <p class="field-hint">{{ servicePost.fromDetail }}</p>

          <label class="field-label">To</label>
          <div class="input-icon">
            <input v-model="form.to" type="text" placeholder="เลือกที่อยู่ปลายทาง" />
            <svg class="chevron" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
          </div>

          <label class="field-label">Estimated Delivery</label>
          <input v-model="form.estimatedDelivery" type="text" placeholder="เช่น 10:30 - 10:40" />

          <label class="field-label">Requirements</label>
          <textarea v-model="form.requirements" rows="3" placeholder="ระบุสิ่งที่ต้องการ เช่น รายการที่จะฝากซื้อ"></textarea>

          <label class="field-label">Price</label>
          <div class="input-suffix">
            <input v-model.number="form.price" type="number" min="0" placeholder="0" />
            <span class="suffix">Baht</span>
          </div>
        </div>

        <div class="actions">
          <button class="btn-muted" @click="router.back()">Cancel</button>
          <button class="btn-primary" :disabled="!step1Valid" @click="goToSummary">Hiring</button>
        </div>
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
              <dt>From</dt>
              <dd>{{ form.from }}</dd>
            </div>
            <div class="review-row">
              <dt>To</dt>
              <dd>{{ form.to }}</dd>
            </div>
            <div class="review-row">
              <dt>Estimated Delivery</dt>
              <dd>{{ form.estimatedDelivery || "-" }}</dd>
            </div>
            <div class="review-row">
              <dt>Requirement</dt>
              <dd>{{ form.requirements || "-" }}</dd>
            </div>
            <div class="review-row">
              <dt>Service Fee</dt>
              <dd>฿{{ form.serviceFee }}</dd>
            </div>
            <div class="review-row">
              <dt>Price</dt>
              <dd>฿{{ form.price }}</dd>
            </div>
            <div class="review-row total">
              <dt>Total</dt>
              <dd>฿{{ total }}</dd>
            </div>
          </dl>
        </div>

        <div class="actions">
          <button class="btn-muted" @click="step = 1">Cancel</button>
          <button class="btn-primary" :disabled="submitting" @click="confirmHiring">
            {{ submitting ? "Confirming..." : "Confirm Hiring" }}
          </button>
        </div>
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
