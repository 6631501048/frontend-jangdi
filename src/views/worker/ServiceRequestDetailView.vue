<script setup>
// FR-SERV-04: ผู้ว่าจ้างส่ง Service Request พร้อมรายละเอียดคำสั่งซื้อ (รายการ/ที่อยู่/หมายเหตุ)
// FR-SERV-05: เจ้าของ Service Post ดู ยอมรับ หรือปฏิเสธ Service Request แต่ละรายการ
// FR-SERV-07: Service Request ที่ยอมรับแล้วจะถูกแปลงเป็นบันทึกงาน (Job) เชื่อมโยงกับ Service Post ต้นทาง
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

/* ---------- ข้อมูลคำขอ ----------
   TODO: แทนที่ mock ด้วย GET /api/service-posts/{postId}/requests/{route.params.id} */
const request = ref({
  id: route.params.id,
  requester: "Marry",
  location: "F4 Dome",
  items: [
    { name: "Fried Rice 1", price: 35 },
    { name: "Fried Chicken 1", price: 25 },
  ],
  serviceFee: 20,
  address: { label: "F4 Dome", detail: "Building F4 room 204" },
  notes: "Any place is okay, you can choose for me. Thanks!",
});

const itemsTotal = computed(() => request.value.items.reduce((sum, i) => sum + i.price, 0));
const total = computed(() => itemsTotal.value + request.value.serviceFee);

const accepting = ref(false);
function acceptOrder() {
  // TODO FR-SERV-05/07: POST /api/service-posts/{postId}/requests/{request.id}/accept
  // → backend สร้าง Job ใหม่เชื่อมโยงกับ Service Post ต้นทาง แล้วเข้าสู่ Escrow (FR-PAY-01)
  accepting.value = true;
  setTimeout(() => {
    accepting.value = false;
    router.push("/worker/service-post");
  }, 300);
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
      <!-- ผู้ขอ + รายการสินค้า -->
      <div class="card">
        <div class="requester-head">
          <span class="avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
          </span>
          <div>
            <p class="requester-name">{{ request.requester }}</p>
            <p class="requester-loc">{{ request.location }}</p>
          </div>
        </div>

        <p class="items-title">Items Requested</p>
        <ul class="items-list">
          <li v-for="(item, i) in request.items" :key="i">
            <span class="item-name"><span class="dot"></span>{{ item.name }}</span>
            <span class="item-price">{{ item.price }} THB</span>
          </li>
        </ul>

        <div class="fee-row">
          <span>Service fee</span>
          <span>{{ request.serviceFee }} THB</span>
        </div>
        <div class="total-row">
          <span>Total</span>
          <span>{{ total }} THB</span>
        </div>
      </div>

      <!-- ที่อยู่ -->
      <div class="card">
        <p class="section-title">Address</p>
        <p class="address-line">
          <svg class="pin" viewBox="0 0 24 24"><path d="M12 21s-7-6.5-7-11a7 7 0 0114 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
          <strong>{{ request.address.label }}</strong>
        </p>
        <p class="address-detail">{{ request.address.detail }}</p>
      </div>

      <!-- หมายเหตุ -->
      <div class="card">
        <p class="section-title">Additional Notes</p>
        <p class="notes-text">{{ request.notes }}</p>
      </div>

      <div class="accept-wrap">
        <button class="btn-accept" :disabled="accepting" @click="acceptOrder">
          {{ accepting ? "Accepting..." : "Accept Order" }}
        </button>
      </div>
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