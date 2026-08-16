<script setup>
// FR-SERV-01: สร้าง Service Post โดยระบุหมวดหมู่ ชื่อ คำอธิบาย ค่าบริการ
//             จำนวนออร์เดอร์สูงสุดที่รับพร้อมกันได้ ช่วงเวลาที่พร้อมให้บริการ และรัศมีการให้บริการ
// FR-JOB-02 (รูปแบบเดียวกันฝั่งผู้รับจ้าง): นำทางผ่านขั้นตอน 3 ขั้นตอน (1) หมวดหมู่ (2) รายละเอียด (3) ตรวจสอบก่อนส่ง
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

/* ---------- หมวดหมู่ (เหมือนตัวกรองใน JobFeedView เพื่อความสอดคล้องกันทั้งแอป) ---------- */
const categories = [
  { id: "cleaning", label: "Cleaning", icon: "🧹" },
  { id: "delivery", label: "Delivery", icon: "🛵" },
  { id: "tutoring", label: "Tutoring & Education", icon: "📘" },
  { id: "it", label: "IT & Programming", icon: "💻" },
];

/* ---------- ตัวเลือกเวลา / รัศมี ---------- */
const timeOptions = (() => {
  const out = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      const period = h < 12 ? "AM" : "PM";
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      out.push(`${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`);
    }
  }
  return out;
})();
const radiusOptions = ["Within 500 m.", "Within 1 km.", "Within 2 km.", "Within 3 km.", "Within 5 km."];

/* ---------- สถานะฟอร์ม ---------- */
const step = ref(1); // 1: หมวดหมู่, 2: รายละเอียด, 3: ตรวจสอบ
const submitting = ref(false);
const submitted = ref(false);

const form = ref({
  category: "",
  name: "",
  details: "",
  feePerOrder: null,
  maxOrders: null,
  time: "",
  radius: "",
  notes: "",
});

const categoryLabel = computed(
  () => categories.find((c) => c.id === form.value.category)?.label || "-"
);

const step1Valid = computed(() => !!form.value.category);
const step2Valid = computed(
  () =>
    form.value.name.trim() &&
    form.value.details.trim() &&
    form.value.feePerOrder !== null &&
    form.value.feePerOrder !== "" &&
    form.value.maxOrders !== null &&
    form.value.maxOrders !== "" &&
    form.value.time &&
    form.value.radius
);

function selectCategory(id) {
  form.value.category = id;
}
function next() {
  if (step.value === 1 && !step1Valid.value) return;
  if (step.value === 2 && !step2Valid.value) return;
  if (step.value < 3) step.value++;
}
function back() {
  if (step.value > 1) step.value--;
  else router.back();
}

function submit() {
  // TODO FR-SERV-01: POST /api/service-posts
  // { category, name, details, feePerOrder, maxOrders, availableUntil: time, radius, notes }
  // TODO FR-SERV-02: backend จะปิดใช้งาน Service Post อัตโนมัติเมื่อพ้นเวลาที่พร้อมให้บริการ (time)
  submitting.value = true;
  setTimeout(() => {
    submitting.value = false;
    submitted.value = true;
  }, 400);
}

function viewMyPosts() {
  // FR-PROF-04: ไปหน้าประวัติประกาศบริการของตนเอง
  router.push("/worker/service-posts");
}
function backToHome() {
  router.push("/worker");
}
</script>

<template>
  <div class="page">
    <!-- แถบด้านบนแบบ sub-page: ปุ่มย้อนกลับ + ชื่อหน้า -->
    <header class="topbar">
      <button class="icon-btn" aria-label="ย้อนกลับ" @click="submitted ? backToHome() : back()">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="title">Post Job</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>

    <main class="content">
      <div class="card">
        <!-- ===== หน้าจอสำเร็จ ===== -->
        <section v-if="submitted" class="success">
          <div class="check-circle">
            <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 class="success-title">Post Success!</h2>
          <p class="success-sub">Your service has been posted.</p>
          <div class="success-actions">
            <button class="btn-primary" @click="viewMyPosts">View My Posts</button>
            <button class="btn-muted" @click="backToHome">Back to Home</button>
          </div>
        </section>

        <!-- ===== ตัวช่วยสร้างประกาศ (3 ขั้นตอน) ===== -->
        <template v-else>
          <!-- Stepper -->
          <div class="stepper">
            <span class="step-dot" :class="{ active: step === 1 }">1</span>
            <span class="step-line"></span>
            <span class="step-dot" :class="{ active: step === 2 }">2</span>
            <span class="step-line"></span>
            <span class="step-dot" :class="{ active: step === 3 }">3</span>
          </div>

          <!-- ขั้นตอน 1: หมวดหมู่ -->
          <section v-if="step === 1" class="step-body">
            <h2 class="section-title">Select Job Category</h2>
            <div class="category-grid">
              <button
                v-for="c in categories"
                :key="c.id"
                type="button"
                class="category-card"
                :class="{ active: form.category === c.id }"
                @click="selectCategory(c.id)"
              >
                <span v-if="form.category === c.id" class="cat-dot" aria-hidden="true"></span>
                <span class="cat-icon">{{ c.icon }}</span>
                <span class="cat-label">{{ c.label }}</span>
              </button>
            </div>
          </section>

          <!-- ขั้นตอน 2: รายละเอียดบริการ -->
          <section v-else-if="step === 2" class="step-body">
            <h2 class="section-title">Details of Service</h2>

            <label class="field-label">Name / Service</label>
            <input v-model="form.name" type="text" placeholder="เช่น รับไปซื้อของ / รับส่งพัสดุ" />

            <label class="field-label">Details</label>
            <textarea v-model="form.details" rows="3" placeholder="อธิบายบริการของคุณ"></textarea>

            <div class="field-row">
              <div class="field-col">
                <label class="field-label">Service fee / Order</label>
                <div class="input-suffix">
                  <input v-model.number="form.feePerOrder" type="number" min="0" placeholder="0" />
                  <span class="suffix">Baht</span>
                </div>
              </div>
              <div class="field-col">
                <label class="field-label">Maximum Orders</label>
                <div class="input-suffix">
                  <input v-model.number="form.maxOrders" type="number" min="1" placeholder="1" />
                  <span class="suffix">Order</span>
                </div>
              </div>
            </div>

            <div class="field-row">
              <div class="field-col">
                <label class="field-label">Time</label>
                <select v-model="form.time">
                  <option value="" disabled>เลือกเวลา</option>
                  <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div class="field-col">
                <label class="field-label">Service Radius</label>
                <select v-model="form.radius">
                  <option value="" disabled>เลือกรัศมี</option>
                  <option v-for="r in radiusOptions" :key="r" :value="r">{{ r }}</option>
                </select>
              </div>
            </div>

            <label class="field-label">Additional Notes (Optional)</label>
            <textarea v-model="form.notes" rows="2" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"></textarea>
          </section>

          <!-- ขั้นตอน 3: ตรวจสอบก่อนส่ง -->
          <section v-else class="step-body">
            <h2 class="section-title">Review Details</h2>
            <dl class="review-list">
              <div class="review-row">
                <dt>Job Category</dt>
                <dd>{{ categoryLabel }}</dd>
              </div>
              <div class="review-row">
                <dt>Name / Service</dt>
                <dd>{{ form.name || "-" }}</dd>
              </div>
              <div class="review-row">
                <dt>Details</dt>
                <dd>{{ form.details || "-" }}</dd>
              </div>
              <div class="review-row">
                <dt>Service fee / Order</dt>
                <dd>{{ form.feePerOrder !== null && form.feePerOrder !== "" ? `${form.feePerOrder} Baht` : "-" }}</dd>
              </div>
              <div class="review-row">
                <dt>Maximum Orders</dt>
                <dd>{{ form.maxOrders || "-" }}</dd>
              </div>
              <div class="review-row">
                <dt>Time</dt>
                <dd>{{ form.time || "-" }}</dd>
              </div>
              <div class="review-row">
                <dt>Service Radius</dt>
                <dd>{{ form.radius || "-" }}</dd>
              </div>
              <div class="review-row">
                <dt>Additional Notes (Optional)</dt>
                <dd>{{ form.notes || "-" }}</dd>
              </div>
            </dl>
          </section>

          <!-- ปุ่มควบคุมขั้นตอน -->
          <div class="actions">
            <button class="btn-muted" @click="back">Previous</button>
            <button
              v-if="step < 3"
              class="btn-primary"
              :disabled="(step === 1 && !step1Valid) || (step === 2 && !step2Valid)"
              @click="next"
            >Next</button>
            <button v-else class="btn-primary" :disabled="submitting" @click="submit">
              {{ submitting ? "Posting..." : "Confirm" }}
            </button>
          </div>
        </template>
      </div>
    </main>
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

.content { padding: 16px; }
.card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }

/* ---------- Stepper ---------- */
.stepper { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 20px; }
.step-dot {
  width: 26px; height: 26px; border-radius: 50%; border: 1px solid #ddd;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #999; background: #fff; flex-shrink: 0;
}
.step-dot.active { background: #ffc93c; border-color: #ffc93c; color: #111; }
.step-line { width: 36px; height: 1px; background: #ddd; }

.section-title { margin: 0 0 14px; font-size: 14px; font-weight: 700; color: #111; }

/* ---------- ขั้นตอน 1: หมวดหมู่ ---------- */
.category-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.category-card {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 20px 8px; min-height: 88px;
  border: 1px solid #e5e5e5; border-radius: 10px; background: #fff; cursor: pointer;
}
.category-card.active { border-color: #ffc93c; background: #fffbea; }
.cat-dot { position: absolute; top: 8px; left: 8px; width: 8px; height: 8px; border-radius: 50%; background: #ffc93c; }
.cat-icon { font-size: 22px; }
.cat-label { font-size: 13px; color: #333; text-align: center; }
.category-card.active .cat-label { color: #111; font-weight: 600; }

/* ---------- ขั้นตอน 2: ฟอร์มรายละเอียด ---------- */
.step-body { display: flex; flex-direction: column; }
.field-label { display: block; margin-top: 12px; margin-bottom: 4px; font-size: 12px; color: #666; }
input, select, textarea {
  width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #ddd;
  font-size: 13px; font-family: inherit; min-height: 42px; color: #111; background: #fff;
}
textarea { resize: vertical; }
select { appearance: none; background-image: linear-gradient(45deg, transparent 50%, #999 50%), linear-gradient(135deg, #999 50%, transparent 50%); background-position: calc(100% - 18px) center, calc(100% - 13px) center; background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; }
.field-row { display: flex; gap: 10px; }
.field-col { flex: 1; min-width: 0; }
.input-suffix { position: relative; display: flex; align-items: center; }
.input-suffix input { padding-right: 46px; }
.input-suffix .suffix { position: absolute; right: 12px; font-size: 12px; color: #999; }

/* ---------- ขั้นตอน 3: ตรวจสอบ ---------- */
.review-list { margin: 0; display: flex; flex-direction: column; }
.review-row { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; border-bottom: 1px solid #f2f2f2; }
.review-row:last-child { border-bottom: none; }
.review-row dt { flex-shrink: 0; font-size: 12px; color: #999; }
.review-row dd { margin: 0; font-size: 13px; color: #111; font-weight: 600; text-align: right; }

/* ---------- ปุ่ม ---------- */
.actions { display: flex; gap: 10px; margin-top: 20px; }
.btn-primary, .btn-muted {
  flex: 1; min-height: 44px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;
}
.btn-primary { background: #ffc93c; border: none; color: #111; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-muted { background: #e5e5e5; border: none; color: #333; }

/* ---------- หน้าจอสำเร็จ ---------- */
.success { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 40px 8px 8px; }
.check-circle {
  width: 64px; height: 64px; border-radius: 50%; background: #22c55e; color: #fff;
  display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
}
.check-circle svg { width: 32px; height: 32px; stroke-width: 3; }
.success-title { margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #22c55e; }
.success-sub { margin: 0 0 32px; font-size: 13px; color: #888; }
.success-actions { width: 100%; display: flex; flex-direction: column; gap: 10px; }
.success-actions .btn-primary, .success-actions .btn-muted { width: 100%; }
</style>