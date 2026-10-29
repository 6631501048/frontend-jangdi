<script setup>
// MVP-02: Service Request details are the Hirer's persisted orderData (legacy text is still supported).
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const errorMsg = ref("");
const request = ref(null);
const accepting = ref(false);
const isPending = computed(() => request.value?.status === "pending");
const canAccept = computed(() => isPending.value && request.value?.postStatus === "active" && !request.value?.postFull);
const total = computed(() => request.value?.itemBudget == null ? null : request.value.itemBudget + request.value.serviceFee);

async function loadRequest() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const { data } = await api.get(`/service-posts/requests/${route.params.id}`);
    const structured = data.orderData || {};
    const post = data.servicePost || {};
    request.value = {
      id: data._id,
      requester: data.hirer?.fullName || "ผู้ว่าจ้าง",
      serviceTitle: post.title || "-",
      details: data.orderDetails || "-",
      requirements: structured.requirements || "",
      from: structured.from || "",
      to: structured.to || "",
      deliveryTime: structured.estimatedDelivery || "",
      itemBudget: structured.itemBudget == null ? null : Number(structured.itemBudget),
      serviceFee: Number(post.fee || 0),
      status: data.status,
      postStatus: post.status,
      postFull: Number(post.currentOrderCount || 0) >= Number(post.maxSimultaneousOrders || 1),
      jobId: data.resultingJob?._id || data.resultingJob || null,
    };
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "โหลดรายละเอียดคำขอไม่สำเร็จ";
  } finally { loading.value = false; }
}
onMounted(loadRequest);

async function respond(action) {
  if (!isPending.value || accepting.value) return;
  if (action === "accept" && !canAccept.value) return;
  accepting.value = true;
  errorMsg.value = "";
  try {
    await api.patch(`/service-posts/requests/${request.value.id}`, { action });
    await loadRequest();
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "ดำเนินการคำขอไม่สำเร็จ";
  } finally { accepting.value = false; }
}
</script>

<template>
  <div class="page">
    <!-- แถบด้านบนแบบ sub-page -->
    <header class="topbar">
      <button class="icon-btn" aria-label="ย้อนกลับ" @click="router.back()">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="title">Details Request</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>

    <main class="content">
      <p v-if="loading" class="empty">กำลังโหลดรายละเอียด...</p>
      <template v-else-if="request">
        <div class="card">
          <div class="requester-head">
            <span class="avatar" aria-hidden="true">👤</span>
            <div><p class="requester-name">{{ request.requester }}</p><p class="requester-loc">{{ request.serviceTitle }}</p></div>
          </div>
          <p class="section-title">รายละเอียดคำขอจาก Hirer</p>
          <p class="notes-text">{{ request.details }}</p>
          <p class="request-state">สถานะ: {{ request.status === 'pending' ? 'รอการตอบรับ' : request.status === 'accepted' ? 'รับคำขอแล้ว' : 'ปฏิเสธแล้ว' }}</p>
        </div>
        <div class="card">
          <p class="section-title">รายละเอียดการจัดส่ง</p>
          <p class="notes-text">จุดรับ: {{ request.from || 'ไม่ระบุ (ข้อมูลเก่า)' }}</p>
          <p class="notes-text">ปลายทาง: {{ request.to || 'ไม่ระบุ (ข้อมูลเก่า)' }}</p>
          <p class="notes-text">เวลาประมาณ: {{ request.deliveryTime || 'ไม่ระบุ (ข้อมูลเก่า)' }}</p>
          <p class="notes-text">หมายเหตุ: {{ request.requirements || 'ไม่มี' }}</p>
        </div>
        <div class="card">
          <p class="section-title">สรุปประมาณการ</p>
          <div class="fee-row"><span>ค่าบริการ Worker (ใช้คำนวณ Mock Payment)</span><strong>{{ request.serviceFee }} บาท</strong></div>
          <div class="fee-row"><span>งบสินค้าประมาณการ</span><strong>{{ request.itemBudget == null ? 'ไม่มีข้อมูล' : `${request.itemBudget} บาท` }}</strong></div>
          <div class="total-row"><span>รวมประมาณการ</span><span>{{ total == null ? 'ไม่สามารถคำนวณ (ข้อมูลเก่า)' : `${total} บาท` }}</span></div>
          <p class="fine-print">หมายเหตุ: งบสินค้าเป็นข้อมูลประกอบคำขอ ไม่ได้ถูกหักเงินจริงหรือบวกเข้ายอด Mock Payment โดยอัตโนมัติ</p>
        </div>
        <p v-if="isPending && !canAccept" class="empty">ประกาศนี้ปิดรับหรือเต็มจำนวนแล้ว ไม่สามารถตอบรับเพิ่มได้</p>
        <div v-if="isPending" class="accept-wrap">
          <button class="btn-accept" :disabled="accepting || !canAccept" @click="respond('accept')">{{ accepting ? 'กำลังบันทึก...' : 'ยอมรับคำขอ' }}</button>
          <button class="btn-decline" :disabled="accepting" @click="respond('decline')">ปฏิเสธ</button>
        </div>
        <div v-if="request.jobId" class="accept-wrap">
          <button class="btn-accept" @click="router.push(`/worker/jobs/${request.jobId}/tracking`)">เปิดงานที่สร้างแล้ว</button>
        </div>
      </template>
      <p v-if="errorMsg" class="empty error-text" role="alert">{{ errorMsg }}</p>
    </main>
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; background: #f0f0f0; }
svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

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
.card { background: #fff; border-radius: 12px; padding: 14px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }

/* ---------- ผู้ขอ ---------- */
.requester-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.avatar {
  flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; border: 1px solid #ddd;
  display: flex; align-items: center; justify-content: center; color: #555;
}
.requester-name { margin: 0; font-size: 13.5px; font-weight: 700; color: #111; }
.requester-loc { margin: 1px 0 0; font-size: 11px; color: #999; }

.items-title { margin: 0 0 6px; font-size: 11px; color: #999; }
.items-list { list-style: none; margin: 0 0 6px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.items-list li { display: flex; justify-content: space-between; font-size: 13px; color: #111; }
.item-name { display: flex; align-items: center; gap: 6px; }
.item-name .dot { width: 6px; height: 6px; border-radius: 50%; background: #ffc93c; flex-shrink: 0; }

.fee-row {
  display: flex; justify-content: space-between; font-size: 12.5px; color: #666;
  padding-top: 10px; margin-top: 6px; border-top: 1px solid #f2f2f2;
}
.total-row {
  display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; color: #111;
  padding-top: 8px; margin-top: 6px; border-top: 1px solid #f2f2f2;
}
.total-row span:last-child { color: #d99a00; }

/* ---------- ที่อยู่ / หมายเหตุ ---------- */
.section-title { margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #111; }
.address-line { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 13px; color: #111; }
.address-line .pin { width: 15px; height: 15px; color: #999; }
.address-detail { margin: 4px 0 0 21px; font-size: 12px; color: #999; }
.notes-text { margin: 0; font-size: 12.5px; color: #333; line-height: 1.5; }

/* ---------- ปุ่มยอมรับ ---------- */
.accept-wrap { display: flex; justify-content: center; padding-top: 6px; }
.btn-accept {
  min-width: 200px; min-height: 46px; padding: 0 24px; border: none; border-radius: 10px;
  background: #ffc93c; color: #111; font-size: 14px; font-weight: 700; cursor: pointer;
}
.btn-accept:disabled { opacity: 0.6; cursor: not-allowed; }
</style>

<style scoped>
.btn-decline { min-height:46px; padding:0 22px; background:white; border:1px solid #dc2626; border-radius:10px; color:#b91c1c; cursor:pointer; }
.fine-print { font-size:12px; color:#666; line-height:1.5; }
.request-state { font-size:12px; color:#765107; font-weight:700; }
</style>
