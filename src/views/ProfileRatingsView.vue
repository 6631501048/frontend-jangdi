<script setup>
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import api from "../services/api";
import { useAuthStore } from "../stores/auth";
import AppTopBar from "../components/AppTopBar.vue";
import AppRoleDrawer from "../components/AppRoleDrawer.vue";

const auth = useAuthStore();
const drawerOpen = ref(false);
const loading = ref(true);
const error = ref("");
const averageRating = ref(0);
const reviewCount = ref(0);
const reviews = ref([]);
const ratingStars = computed(() => Math.round(averageRating.value));

onMounted(async () => {
  try {
    const { data } = await api.get(`/users/${auth.user._id}/reviews`);
    averageRating.value = data.averageRating || 0;
    reviewCount.value = data.reviewCount || 0;
    reviews.value = (data.reviews || []).map((review) => ({
      id: review._id,
      reviewer: review.fromUser?.fullName || "ผู้ใช้",
      rating: review.rating,
      comment: review.comment,
      date: review.createdAt,
    }));
  } catch (err) {
    error.value = err.response?.data?.message || "โหลดรีวิวไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="page jd-page">
    <AppTopBar role-label="" :show-notifications="false" @menu="drawerOpen = true" />
    <AppRoleDrawer v-model="drawerOpen" />
    <main class="content">
      <RouterLink to="/profile" class="back-link">‹ กลับหน้าโปรไฟล์</RouterLink>
      <section class="card">
        <h1>คะแนนและรีวิว</h1>
        <div class="summary">
          <strong>{{ averageRating }}</strong>
          <span class="stars"><span v-for="n in 5" :key="n" :class="{ filled: n <= ratingStars }">★</span></span>
          <span class="muted">จาก {{ reviewCount }} รีวิว</span>
        </div>
        <p v-if="loading" class="muted">กำลังโหลดรีวิว…</p>
        <p v-else-if="error" class="muted">{{ error }}</p>
        <p v-else-if="!reviews.length" class="muted">ยังไม่มีรีวิว</p>
        <ul v-else class="list">
          <li v-for="review in reviews" :key="review.id" class="item">
            <div class="item-head">
              <strong>{{ review.reviewer }}</strong>
              <span class="stars"><span v-for="n in 5" :key="n" :class="{ filled: n <= review.rating }">★</span></span>
            </div>
            <p v-if="review.comment" class="comment">{{ review.comment }}</p>
            <small v-if="review.date" class="muted">{{ new Date(review.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) }}</small>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page { min-height: 100vh; background: var(--jd-canvas); }
.content { max-width: 620px; margin: 0 auto; padding: 16px; }
.back-link { display: inline-block; margin: 0 0 12px; color: var(--jd-warning); text-decoration: none; font-size: 0.875rem; font-weight: 600; }
.card { padding: 18px; background: var(--jd-surface); border-radius: 14px; box-shadow: 0 1px 3px #0000000f; }
h1 { margin: 0 0 14px; font-size: 1.125rem; }
.summary, .item-head { display: flex; align-items: center; gap: 10px; }
.summary { margin-bottom: 14px; }
.summary strong { font-size: 1.5rem; }
.stars { color: var(--jd-input-border); letter-spacing: 1px; white-space: nowrap; }
.stars .filled { color: var(--jd-warning); }
.muted { color: var(--jd-muted); font-size: 0.875rem; }
.list { margin: 0; padding: 0; list-style: none; }
.item { padding: 14px 0; border-top: 1px solid var(--jd-line); }
.item-head { justify-content: space-between; gap: 8px; }
.item-head strong { font-size: 0.875rem; }
.comment { margin: 8px 0 4px; color: var(--jd-muted); font-size: 0.875rem; white-space: pre-wrap; }
</style>
