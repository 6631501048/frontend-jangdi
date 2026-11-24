<script setup>
import { useWizardSteps } from "../../composables/useWizardSteps";
import { usePageNavigation } from "../../composables/usePageNavigation";
// FR-SERV-01: สร้าง Service Post โดยระบุหมวดหมู่ ชื่อ คำอธิบาย ค่าบริการ
//             จำนวนออร์เดอร์สูงสุดที่รับพร้อมกันได้ ช่วงเวลาที่พร้อมให้บริการ และรัศมีการให้บริการ
// FR-JOB-02 (รูปแบบเดียวกันฝั่งผู้รับจ้าง): นำทางผ่านขั้นตอน 3 ขั้นตอน (1) หมวดหมู่ (2) รายละเอียด (3) ตรวจสอบก่อนส่ง
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../services/api";
const { goBack: navigateBack } = usePageNavigation();

const router = useRouter();

/* ---------- หมวดหมู่ (เหมือนตัวกรองใน JobFeedView เพื่อความสอดคล้องกันทั้งแอป) ---------- */
const categories = [
  { id: "cleaning", label: "ทำความสะอาด", icon: "🧹" },
  { id: "delivery", label: "จัดส่ง / รับหิ้ว", icon: "🛵" },
  { id: "tutoring", label: "สอนพิเศษ", icon: "📘" },
  { id: "it", label: "ไอทีและเขียนโปรแกรม", icon: "💻" },
];
const deliveryModes = [
  { id: "shopping", label: "รับหิ้ว / ซื้อของตามรายการ" },
  { id: "pickup_delivery", label: "ไปรับของแล้วนำไปส่ง" },
  { id: "passenger", label: "รับส่งผู้โดยสาร" },
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
const radiusToMeters = {
  "Within 500 m.": 500,
  "Within 1 km.": 1000,
  "Within 2 km.": 2000,
  "Within 3 km.": 3000,
  "Within 5 km.": 5000,
};

function localDateValue(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

// แปลงวันที่และเวลาเลือกไว้เป็นเวลาท้องถิ่นจริง โดยไม่เลื่อนเวลาที่ผ่านไปเป็นวันถัดไป
function timeLabelToDate(dateValue, label) {
  const match = label.match(/^(\d{2}):(\d{2}) (AM|PM)$/);
  if (!match || !dateValue) return null;
  let [, hh, mm, period] = match;
  hh = Number(hh) % 12;
  if (period === "PM") hh += 12;
  const d = new Date(dateValue + "T00:00:00");
  d.setHours(hh, Number(mm), 0, 0);
  return d;
}

/* ---------- สถานะฟอร์ม ---------- */
const step = useWizardSteps(3); // 1: หมวดหมู่, 2: รายละเอียด, 3: ตรวจสอบ
const submitting = ref(false);
const submitted = ref(false);
const errorMsg = ref("");

const form = ref({
  category: "",
  serviceType: "shopping",
  name: "",
  details: "",
  feePerOrder: null,
  maxOrders: null,
  serviceDate: "",
  time: "",
  serviceLocation: "",
  radius: "",
  notes: "",
});

const categoryLabel = computed(
  () => categories.find((c) => c.id === form.value.category)?.label || "-"
);
const deliveryFeeLabel = computed(() => form.value.serviceType === "shopping" ? "ค่าจ้างต่อออร์เดอร์รับหิ้ว" : "ค่าจ้างต่อเที่ยว");
const today = localDateValue();
const selectedServiceDateTime = computed(() => timeLabelToDate(form.value.serviceDate, form.value.time));

const step1Valid = computed(() => !!form.value.category);
const step2Valid = computed(
  () =>
    form.value.name.trim() &&
    form.value.details.trim() &&
    form.value.feePerOrder !== null &&
    form.value.feePerOrder !== "" && Number(form.value.feePerOrder) >= 40 &&
    form.value.maxOrders !== null &&
    form.value.maxOrders !== "" && Number.isInteger(Number(form.value.maxOrders)) && Number(form.value.maxOrders) >= 1 && Number(form.value.maxOrders) <= 3 &&
    form.value.serviceDate && form.value.serviceDate >= today &&
    form.value.time && selectedServiceDateTime.value?.getTime() > Date.now() &&
    (form.value.category === "delivery" || form.value.serviceLocation.trim()) &&
    (form.value.category !== "delivery" || form.value.radius)
);
function selectCategory(id) {
  form.value.category = id;
  if (form.value.maxOrders === null || form.value.maxOrders === "") form.value.maxOrders = 1;
  if (id !== "delivery") form.value.radius = "";
}
function next() {
  if (step.value === 1 && !step1Valid.value) return;
  if (step.value === 2 && (!step2Valid.value || !selectedServiceDateTime.value || selectedServiceDateTime.value.getTime() <= Date.now())) return;
  if (step.value < 3) step.value++;
}
function back() {
  if (step.value > 1) step.value--;
  else navigateBack();
}

// ขอพิกัดปัจจุบันของผู้ใช้ (บังคับ เพราะ backend ต้องใช้ lat/lng สร้าง Service Post)
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("เบราว์เซอร์นี้ไม่รองรับการขอตำแหน่ง"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("กรุณาอนุญาตให้เข้าถึงตำแหน่ง เพื่อระบุพื้นที่ให้บริการ"))
    );
  });
}

async function submit() {
  submitting.value = true;
  errorMsg.value = "";
  try {
    const { lat, lng } = await getCurrentPosition();
    const availabilityEnd = selectedServiceDateTime.value;
    if (!step2Valid.value || !availabilityEnd || availabilityEnd.getTime() <= Date.now() || Number(form.value.feePerOrder) < 40) {
      throw new Error("กรุณาตรวจสอบค่าจ้างขั้นต่ำ 40 บาทและวันที่/เวลาให้เป็นข้อมูลในอนาคต");
    }

    await api.post("/service-posts", {
      category: form.value.category,
      serviceType: form.value.category === "delivery" ? form.value.serviceType : undefined,
      title: form.value.name,
      description: form.value.notes ? `${form.value.details}\n\nหมายเหตุ: ${form.value.notes}` : form.value.details,
      fee: form.value.feePerOrder,
      maxSimultaneousOrders: form.value.maxOrders,
      availabilityStart: new Date().toISOString(),
      availabilityEnd: availabilityEnd?.toISOString(),
      locationLabel: form.value.serviceLocation.trim(),
      serviceRadiusMeters: form.value.category === "delivery" ? radiusToMeters[form.value.radius] || 2000 : 0,
      lat,
      lng,
    });

    submitted.value = true;
  } catch (err) {
    errorMsg.value = err.response?.data?.message || err.message || "สร้างประกาศบริการไม่สำเร็จ";
  } finally {
    submitting.value = false;
  }
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
  <div class="page jd-page">
    <!-- แถบด้านบนแบบ sub-page: ปุ่มย้อนกลับ + ชื่อหน้า -->
    <header class="topbar">
      <button class="icon-btn" aria-label="ย้อนกลับ" @click="submitted ? backToHome() : back()">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="title">ประกาศบริการ</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>

    <main class="content">
      <div class="card">
        <!-- ===== หน้าจอสำเร็จ ===== -->
        <section v-if="submitted" class="success">
          <div class="check-circle">
            <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 class="success-title">ส่งประกาศบริการแล้ว</h2>
          <p class="success-sub">ประกาศกำลังรอผู้ดูแลตรวจสอบ เมื่ออนุมัติแล้วจึงจะแสดงใน Feed</p>
          <div class="success-actions">
            <button class="btn-primary" @click="viewMyPosts">ดูประกาศของฉัน</button>
            <button class="btn-muted" @click="backToHome">กลับหน้าแรก</button>
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
            <h2 class="section-title">เลือกหมวดหมู่บริการ</h2>
            <div class="category-grid">
              <button :aria-pressed="form.category === c.id"
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
            <h2 class="section-title">รายละเอียดบริการ</h2>
            <div class="selected-category">
              <div><span class="selected-category-label">เลือกประเภทงานแล้ว</span><strong>{{ categoryLabel }}</strong></div>
              <button type="button" class="change-category-btn" @click="step = 1">เปลี่ยนประเภทงาน</button>
            </div>

            <label class="field-label">ชื่อบริการ</label>
            <input aria-label="ชื่อบริการ" v-model="form.name" type="text" :placeholder="form.category === 'delivery' ? 'เช่น รับฝากหิ้วของจากห้าง' : 'เช่น รับส่งพัสดุ / ให้บริการทำความสะอาด'" />

            <label class="field-label">รายละเอียด</label>
            <textarea aria-label="รายละเอียด" v-model="form.details" rows="3" placeholder="อธิบายบริการของคุณ"></textarea>

            <template v-if="form.category === 'delivery'">
              <label class="field-label">รูปแบบบริการ</label>
              <select aria-label="รูปแบบบริการ" v-model="form.serviceType">
                <option v-for="mode in deliveryModes" :key="mode.id" :value="mode.id">{{ mode.label }}</option>
              </select>
            </template>

            <div class="field-row">
              <div class="field-col">
                <label class="field-label">{{ form.category === 'delivery' ? deliveryFeeLabel : 'ค่าบริการต่อรายการ' }}</label>
                <div class="input-suffix">
                  <input :aria-label="form.category === 'delivery' ? deliveryFeeLabel : 'ค่าบริการต่อรายการ'" v-model.number="form.feePerOrder" type="number" min="40" placeholder="40" />
                  <span class="suffix">บาท</span>
                </div>
                <small class="price-hint">ค่าจ้างขั้นต่ำ 40 บาท</small>
              </div>
              <div class="field-col">
                <label class="field-label">จำนวนงานที่รับพร้อมกัน</label>
                <div class="input-suffix">
                  <input aria-label="จำนวนงานที่รับพร้อมกัน" v-model.number="form.maxOrders" type="number" min="1" max="3" step="1" placeholder="1" />
                  <span class="suffix">งาน</span>
                </div>
                <small class="price-hint">กำหนดได้ตั้งแต่ 1 ถึง 3 งานพร้อมกัน</small>
              </div>
            </div>

            <div class="field-row">
              <div class="field-col">
                <label class="field-label">วันที่ให้บริการ</label>
                <input aria-label="วันที่ให้บริการ" v-model="form.serviceDate" type="date" :min="today" required />
              </div>
              <div class="field-col">
                <label class="field-label">เวลา</label>
                <select aria-label="เวลา" v-model="form.time">
                  <option value="" disabled>เลือกเวลา</option>
                  <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div class="field-col">
                <label v-if="form.category === 'delivery'" class="field-label">รัศมีให้บริการ</label>
                <label v-else class="field-label">สถานที่ให้บริการ</label>
                <select aria-label="รัศมีให้บริการ" v-if="form.category === 'delivery'" v-model="form.radius">
                  <option value="" disabled>เลือกรัศมี</option>
                  <option v-for="r in radiusOptions" :key="r" :value="r">{{ r }}</option>
                </select>
                <input aria-label="สถานที่ให้บริการ" v-else v-model="form.serviceLocation" type="text" placeholder="เช่น อาคาร/หอพัก/สถานที่ที่รับงาน" />
              </div>
            </div>
            <label class="field-label">หมายเหตุเพิ่มเติม (ไม่บังคับ)</label>
            <textarea aria-label="หมายเหตุเพิ่มเติม (ไม่บังคับ)" v-model="form.notes" rows="2" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"></textarea>
          </section>

          <!-- ขั้นตอน 3: ตรวจสอบก่อนส่ง -->
          <section v-else class="step-body">
            <h2 class="section-title">ตรวจสอบรายละเอียด</h2>
            <dl class="review-list">
              <div class="review-row">
                <dt>หมวดหมู่บริการ</dt>
                <dd>{{ categoryLabel }}</dd>
              </div>
              <div class="review-row">
                <dt>ชื่อบริการ</dt>
                <dd>{{ form.name || "-" }}</dd>
              </div>
              <div class="review-row">
                <dt>รายละเอียด</dt>
                <dd>{{ form.details || "-" }}</dd>
              </div>
              <div class="review-row">
                <dt>{{ form.category === 'delivery' ? deliveryFeeLabel : 'ค่าบริการต่อรายการ' }}</dt>
                <dd>{{ form.feePerOrder !== null && form.feePerOrder !== "" ? `${form.feePerOrder} บาท` : "-" }}</dd>
              </div>
              <div v-if="form.category === 'delivery'" class="review-row">
                <dt>รูปแบบบริการ</dt>
                <dd>{{ deliveryModes.find((mode) => mode.id === form.serviceType)?.label }}</dd>
              </div>
              <div class="review-row">
                <dt>จำนวนงานที่รับพร้อมกันสูงสุด</dt>
                <dd>{{ form.maxOrders }} งาน</dd>
              </div>
              <div class="review-row">
                <dt>วันที่และเวลาให้บริการ</dt>
                <dd>{{ form.serviceDate && form.time ? new Date(form.serviceDate + "T00:00:00").toLocaleDateString("th-TH") + " · " + form.time : "-" }}</dd>
              </div>
              <div v-if="form.category !== 'delivery'" class="review-row">
                <dt>สถานที่ให้บริการ</dt>
                <dd>{{ form.serviceLocation || "-" }}</dd>
              </div>
              <div v-if="form.category === 'delivery'" class="review-row">
                <dt>รัศมีให้บริการ</dt>
                <dd>{{ form.radius || "-" }}</dd>
              </div>
              <div class="review-row">
                <dt>หมายเหตุเพิ่มเติม (ไม่บังคับ)</dt>
                <dd>{{ form.notes || "-" }}</dd>
              </div>
            </dl>
          </section>

          <!-- ปุ่มควบคุมขั้นตอน -->
          <div class="actions">
            <button class="btn-muted" @click="back">ย้อนกลับ</button>
            <button
              v-if="step < 3"
              class="btn-primary"
              :disabled="(step === 1 && !step1Valid) || (step === 2 && !step2Valid)"
              @click="next"
            >ถัดไป</button>
            <button v-else class="btn-primary" :disabled="submitting" @click="submit">
              {{ submitting ? "กำลังส่งประกาศ…" : "ยืนยันประกาศบริการ" }}
            </button>
          </div>
          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; background: var(--jd-canvas); }
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

/* ---------- Top bar (sub-page) ---------- */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; background: var(--jd-surface); position: sticky; top: 0; z-index: 10;
  border-bottom: 1px solid var(--jd-line);
}
.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border: none; background: transparent;
  border-radius: 50%; color: var(--jd-ink); cursor: pointer;
}
.title { margin: 0; font-size: 0.9375rem; font-weight: 700; color: var(--jd-ink); }
.spacer { width: 40px; }

.content { padding: 16px; }
.card { background: var(--jd-surface); border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }

/* ---------- Stepper ---------- */
.stepper { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 20px; }
.step-dot {
  width: 26px; height: 26px; border-radius: 50%; border: 1px solid var(--jd-input-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.875rem; font-weight: 700; color: var(--jd-muted); background: var(--jd-surface); flex-shrink: 0;
}
.step-dot.active { background: var(--jd-accent); border-color: var(--jd-warning); color: var(--jd-ink); }
.step-line { width: 36px; height: 1px; background: var(--jd-input-border); }

.section-title { margin: 0 0 14px; font-size: 0.875rem; font-weight: 700; color: var(--jd-ink); }
.selected-category { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; padding:10px 12px; border:1px solid #f0e2b5; border-radius:9px; background:var(--jd-accent-soft); }
.selected-category > div { display:flex; flex-direction:column; gap:4px; }
.selected-category-label { font-size: 0.875rem; color:var(--jd-muted); }
.selected-category strong { font-size: 0.875rem; color:var(--jd-ink); }
.change-category-btn { flex-shrink:0; border:0; padding:8px 10px; border-radius:6px; background:var(--jd-surface); color:#78350f; font-size: 0.875rem; font-weight:700; cursor:pointer; }

/* ---------- ขั้นตอน 1: หมวดหมู่ ---------- */
.category-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.category-card {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 20px 8px; min-height: 88px;
  border: 1px solid var(--jd-line); border-radius: 10px; background: var(--jd-surface); cursor: pointer;
}
.category-card.active { border-color: var(--jd-warning); background: var(--jd-accent-soft); }
.cat-dot { position: absolute; top: 8px; left: 8px; width: 8px; height: 8px; border-radius: 50%; background: var(--jd-accent); }
.cat-icon { font-size: 1.375rem; }
.cat-label { font-size: 0.875rem; color: var(--jd-ink); text-align: center; }
.category-card.active .cat-label { color: var(--jd-ink); font-weight: 600; }

/* ---------- ขั้นตอน 2: ฟอร์มรายละเอียด ---------- */
.step-body { display: flex; flex-direction: column; }
.field-label { display: block; margin-top: 12px; margin-bottom: 4px; font-size: 0.875rem; color: var(--jd-muted); }
input, select, textarea {
  width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--jd-input-border);
  font-size: 0.875rem; font-family: inherit; min-height: 44px; color: var(--jd-ink); background: var(--jd-surface);
}
textarea { resize: vertical; }
select { appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--jd-muted) 50%), linear-gradient(135deg, var(--jd-muted) 50%, transparent 50%); background-position: calc(100% - 18px) center, calc(100% - 13px) center; background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; }
.field-row { display: flex; gap: 10px; }
.field-col { flex: 1; min-width: 0; }
.price-hint { display: block; margin-top: 4px; color: var(--jd-muted); font-size: 0.875rem; }
.fixed-capacity { margin: 0; min-height: 44px; display: flex; align-items: center; padding: 0 12px; border: 1px solid var(--jd-line); border-radius: 8px; background: #f8f8f8; font-size: 0.875rem; }
.input-suffix { position: relative; display: flex; align-items: center; }
.input-suffix input { padding-right: 46px; }
.input-suffix .suffix { position: absolute; right: 12px; font-size: 0.875rem; color: var(--jd-muted); }

/* ---------- ขั้นตอน 3: ตรวจสอบ ---------- */
.review-list { margin: 0; display: flex; flex-direction: column; }
.review-row { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; border-bottom: 1px solid var(--jd-subtle); }
.review-row:last-child { border-bottom: none; }
.review-row dt { flex-shrink: 0; font-size: 0.875rem; color: var(--jd-muted); }
.review-row dd { margin: 0; font-size: 0.875rem; color: var(--jd-ink); font-weight: 600; text-align: right; }

/* ---------- ปุ่ม ---------- */
.actions { display: flex; gap: 10px; margin-top: 20px; }
.btn-primary, .btn-muted {
  flex: 1; min-height: 44px; border-radius: 8px; font-size: 0.875rem; font-weight: 700; cursor: pointer;
}
.btn-primary { background: var(--jd-accent); border: none; color: var(--jd-ink); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-muted { background: var(--jd-line); border: none; color: var(--jd-ink); }
.error-msg { margin: 10px 0 0; font-size: 0.875rem; color: #e11d48; text-align: center; }

/* ---------- หน้าจอสำเร็จ ---------- */
.success { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 40px 8px 8px; }
.check-circle {
  width: 64px; height: 64px; border-radius: 50%; background: #22c55e; color: var(--jd-surface);
  display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
}
.check-circle svg { width: 32px; height: 32px; stroke-width: 3; }
.success-title { margin: 0 0 6px; font-size: 1.125rem; font-weight: 700; color: var(--jd-success); }
.success-sub { margin: 0 0 32px; font-size: 0.875rem; color: var(--jd-muted); }
.success-actions { width: 100%; display: flex; flex-direction: column; gap: 10px; }
.success-actions .btn-primary, .success-actions .btn-muted { width: 100%; }
</style>
