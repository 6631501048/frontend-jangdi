<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";

const route = useRoute();
const router = useRouter();
const post = ref(null);
const loading = ref(true);
const error = ref("");
const deliveryModeLabels = {
  shopping: "รับหิ้ว / ซื้อของตามรายการ",
  pickup_delivery: "ไปรับของแล้วนำไปส่ง",
  passenger: "รับส่งผู้โดยสาร",
};
function serviceFeeLabel(post) {
  if (post.category !== "delivery") return "ค่าบริการ";
  return post.serviceType === "shopping" || !post.serviceType ? "ค่าจ้างต่อออร์เดอร์รับหิ้ว" : "ค่าจ้างต่อเที่ยว";
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/service-posts/${route.params.id}`);
    post.value = data;
  } catch (err) {
    error.value = err.response?.data?.message || "โหลดรายละเอียดประกาศไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="page">
    <header class="topbar">
      <button class="back" aria-label="ย้อนกลับ" @click="router.back()">‹</button>
      <h1>รายละเอียดบริการ</h1><span class="spacer"></span>
    </header>
    <main class="content">
      <p v-if="loading" class="muted">กำลังโหลดรายละเอียด...</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <template v-else-if="post">
        <section class="card">
          <p class="worker">{{ post.worker?.fullName || "ผู้รับจ้าง" }}</p>
          <h2>{{ post.title || "บริการจากผู้รับจ้าง" }}</h2>
          <p class="description">{{ post.description || "-" }}</p>
        </section>
        <section class="card details">
          <div><span>ประเภทบริการ</span><strong>{{ post.category || "-" }}</strong></div>
          <div v-if="post.category === 'delivery'"><span>รูปแบบบริการ</span><strong>{{ deliveryModeLabels[post.serviceType] || deliveryModeLabels.shopping }}</strong></div>
          <div><span>{{ serviceFeeLabel(post) }}</span><strong>฿{{ Number(post.fee || 0).toFixed(2) }}</strong></div>
          <div><span>สถานที่ให้บริการ</span><strong>{{ post.locationLabel || post.title || "ตำแหน่งที่ผู้รับจ้างกำหนด" }}</strong></div>
          <div v-if="post.category === 'delivery'"><span>รัศมีให้บริการ</span><strong>{{ post.serviceRadiusMeters ? `${(post.serviceRadiusMeters / 1000).toFixed(1)} กม.` : "-" }}</strong></div>
          <div v-if="post.availabilityStart || post.availabilityEnd"><span>ช่วงเวลาที่ให้บริการ</span><strong>{{ [post.availabilityStart, post.availabilityEnd].filter(Boolean).map(value => new Date(value).toLocaleString('th-TH')).join(' – ') }}</strong></div>
          <div v-if="post.maxSimultaneousOrders"><span>รับออร์เดอร์พร้อมกันได้</span><strong>ไม่เกิน {{ post.maxSimultaneousOrders }} ออร์เดอร์</strong></div>
        </section>
        <RouterLink :to="`/hirer/hire/${post._id}`" class="apply">รับบริการ</RouterLink>
      </template>
    </main>
  </div>
</template>

<style scoped>
.page { min-height: 100vh; background: #f0f0f0; }
.topbar { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #fff; border-bottom: 1px solid #eee; }
.back { width: 40px; height: 40px; border: 0; background: transparent; font-size: 30px; cursor: pointer; }
h1 { margin: 0; font-size: 16px; }.spacer { width: 40px; }
.content { padding: 16px; display: grid; gap: 12px; }.card { padding: 16px; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px #0001; }
.worker { margin: 0 0 6px; color: #777; font-size: 13px; }h2 { margin: 0 0 8px; font-size: 18px; }.description { margin: 0; white-space: pre-wrap; }
.details > div { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #eee; }.details > div:last-child { border: 0; }.details span { color: #777; }.details strong { text-align: right; }
.apply { display: flex; align-items: center; justify-content: center; min-height: 44px; border-radius: 9px; background: #ffc93c; color: #111; font-weight: 700; text-decoration: none; }.muted,.error { text-align: center; color: #777; }.error { color: #c22; }
</style>
