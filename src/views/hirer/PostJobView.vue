<script setup>
// FR-JOB-01: สร้างประกาศงาน โดยระบุหมวดหมู่ ชื่องาน คำอธิบาย ตำแหน่งที่ตั้ง ราคา และวันเวลาที่กำหนด
// FR-JOB-02: นำทางการสร้างประกาศงานผ่าน 3 ขั้นตอน (1) หมวดหมู่ (2) รายละเอียด+ตำแหน่ง (3) ตรวจสอบก่อนส่ง
//            (ในไฟล์นี้แบ่งเป็น step UI 1-2-3 เหมือนเดิม + หน้าจอผลลัพธ์ "Post Success" แยกต่างหาก)
// FR-JOB-03/05: ข้อความจะถูกกรองเนื้อหาอัตโนมัติก่อนเข้าคิวรอ Admin อนุมัติ (ทำที่ backend)
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

/* ---------- หมวดหมู่ (เหมือนตัวกรองใน HirerDashboard เพื่อความสอดคล้องกันทั้งแอป) ---------- */
const categories = [
  { id: "cleaning", label: "Cleaning", icon: "🧹" },
  { id: "delivery", label: "Delivery", icon: "🛵" },
  { id: "tutoring", label: "Tutoring & Education", icon: "📘" },
  { id: "it", label: "IT & Programming", icon: "💻" },
];

/* ---------- สถานะฟอร์ม ---------- */
const step = ref(1); // 1: หมวดหมู่, 2: รายละเอียด+ตำแหน่ง, 3: ตรวจสอบ
const submitting = ref(false);
const submitted = ref(false);

const form = ref({
  category: "",
  name: "",
  details: "",
  serviceFee: null,
  startTime: "",
  endTime: "",
  from: "",
  to: "",
  notes: "",
});

const categoryLabel = computed(
  () => categories.find((c) => c.id === form.value.category)?.label || "-"
);
const conditionLabel = computed(() =>
  form.value.startTime && form.value.endTime ? `${form.value.startTime} - ${form.value.endTime}` : "-"
);

const step1Valid = computed(() => !!form.value.category);
const step2Valid = computed(
  () =>
    form.value.name.trim() &&
    form.value.details.trim() &&
    form.value.serviceFee !== null &&
    form.value.serviceFee !== "" &&
    form.value.startTime &&
    form.value.endTime &&
    form.value.from.trim() &&
    form.value.to.trim()
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
  // TODO FR-JOB-01: POST /api/jobs { category, name(title), details(description), serviceFee(price), from, to, startTime, endTime, notes }
  // TODO FR-JOB-03/04/05: backend กรองเนื้อหาอัตโนมัติก่อน แล้วส่งต่อเข้าคิวรอ Admin อนุมัติ
  submitting.value = true;
  setTimeout(() => {
    submitting.value = false;
    submitted.value = true;
  }, 400);
}

function viewMyPosts() {
  router.push("/hirer"); // TODO: ไปหน้ารายการประกาศของฉัน (FR-JOB-08) เมื่อสร้างหน้านี้แล้ว
}
function backToHome() {
  router.push("/hirer");
}
function close() {
  submitted.value ? backToHome() : router.push("/hirer");
}
</script>

<template>
  <div class="page">
    <!-- แถบด้านบนแบบ sub-page: ปุ่มปิด + ชื่อหน้า -->
    <header class="topbar">
      <button class="icon-btn" aria-label="ปิด" @click="close">
        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <h1 class="title">Post Hirer</h1>
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

          <!-- ขั้นตอน 2: รายละเอียดงาน + ตำแหน่งที่ตั้ง -->
          <section v-else-if="step === 2" class="step-body">
            <h2 class="section-title">Work Details</h2>

            <label class="field-label">Name / Service</label>
            <input v-model="form.name" type="text" placeholder="เช่น รับส่งพัสดุ / ซื้อของฝาก" />

            <label class="field-label">Details</label>
            <textarea v-model="form.details" rows="3" placeholder="อธิบายงานที่ต้องการให้ทำ"></textarea>

            <div class="field-row">
              <div class="field-col">
                <label class="field-label">Service Fee</label>
                <div class="input-suffix">
                  <input v-model.number="form.serviceFee" type="number" min="0" placeholder="0" />
                  <span class="suffix">Baht</span>
                </div>
              </div>
              <div class="field-col">
                <label class="field-label">Duration</label>
                <div class="time-range">
                  <input v-model="form.startTime" type="time" />
                  <span class="dash">-</span>
                  <input v-model="form.endTime" type="time" />
                </div>
              </div>
            </div>

            <p class="location-title">Location</p>
            <!-- TODO: เพิ่ม Google Maps pin เลือกตำแหน่งที่ตั้งแทน input ข้อความ -->
            <label class="field-label">From</label>
            <div class="input-icon">
              <input v-model="form.from" type="text" placeholder="ตำแหน่งต้นทาง" />
              <svg class="pin" viewBox="0 0 24 24"><path d="M12 21s-7-6.5-7-11a7 7 0 0114 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
            </div>
            <label class="field-label">To</label>
            <div class="input-icon">
              <input v-model="form.to" type="text" placeholder="ตำแหน่งปลายทาง" />
              <svg class="pin" viewBox="0 0 24 24"><path d="M12 21s-7-6.5-7-11a7 7 0 0114 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
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
                <dt>Service Fee</dt>
                <dd>{{ form.serviceFee !== null && form.serviceFee !== "" ? `${form.serviceFee} Baht` : "-" }}</dd>
              </div>
              <div class="review-row">
                <dt>Condition</dt>
                <dd>{{ conditionLabel }}</dd>
              </div>
              <div class="review-row">
                <dt>From</dt>
                <dd>{{ form.from || "-" }}</dd>
              </div>
              <div class="review-row">
                <dt>To</dt>
                <dd>{{ form.to || "-" }}</dd>
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
              {{ submitting ? "Posting..." : "Post" }}
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
.field-row { display: flex; gap: 10px; }
.field-col { flex: 1; min-width: 0; }
.input-suffix { position: relative; display: flex; align-items: center; }
.input-suffix input { padding-right: 46px; }
.input-suffix .suffix { position: absolute; right: 12px; font-size: 12px; color: #999; }
.time-range { display: flex; align-items: center; gap: 6px; }
.time-range input { min-width: 0; }
.time-range .dash { color: #999; flex-shrink: 0; }

.location-title { margin: 16px 0 0; font-size: 12px; font-weight: 700; color: #111; }
.input-icon { position: relative; display: flex; align-items: center; }
.input-icon input { padding-right: 36px; }
.input-icon .pin { position: absolute; right: 10px; width: 16px; height: 16px; color: #999; }

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
