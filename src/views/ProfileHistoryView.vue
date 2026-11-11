<script setup>
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import api from "../services/api";
import { useAuthStore } from "../stores/auth";
import AppTopBar from "../components/AppTopBar.vue";
import AppRoleDrawer from "../components/AppRoleDrawer.vue";

const auth = useAuthStore();
const drawerOpen = ref(false);
const loading = ref(true);
const error = ref("");
const jobs = ref([]);
const servicePosts = ref([]);
const formatDate = (value) => value ? new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "-";

onMounted(async () => {
  try {
    const { data } = await api.get(`/users/${auth.user._id}/posts`);
    jobs.value = data.jobs || [];
    servicePosts.value = data.servicePosts || [];
  } catch (err) {
    error.value = err.response?.data?.message || "โหลดประวัติโพสต์ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="page">
    <AppTopBar role-label="" :show-notifications="false" @menu="drawerOpen = true" />
    <AppRoleDrawer v-model="drawerOpen" />
    <main class="content">
      <RouterLink to="/profile" class="back-link">‹ กลับหน้าโปรไฟล์</RouterLink>
      <section class="card">
        <h1>Post History</h1>
        <p v-if="loading || error" class="empty">{{ loading ? "กำลังโหลดประวัติโพสต์…" : error }}</p>
        <template v-else>
          <h2 class="role-band hirer-band">งานที่ประกาศ (Hirer)</h2>
          <p v-if="!jobs.length" class="empty">ยังไม่มีประวัติการประกาศงาน</p>
          <ul v-else class="list">
            <li v-for="job in jobs" :key="job._id" class="item">
              <div class="item-head">
                <strong>{{ job.title }}</strong>
              </div>
              <div class="meta">{{ job.category }} · {{ job.price }} บาท · {{ formatDate(job.createdAt) }}</div>
              <div v-if="job.status === 'rejected' && job.rejectionReason" class="reason">{{ job.rejectionReason }}</div>
            </li>
          </ul>
          <h2 class="role-band worker-band">บริการที่เสนอ (Worker)</h2>
          <p v-if="!servicePosts.length" class="empty">ยังไม่มีประวัติการเสนอบริการ</p>
          <ul v-else class="list">
            <li v-for="post in servicePosts" :key="post._id" class="item">
              <div class="item-head">
                <strong>{{ post.title }}</strong>
              </div>
              <div class="meta">{{ post.category }} · {{ post.fee }} บาท · {{ formatDate(post.createdAt) }}</div>
            </li>
          </ul>
        </template>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page { min-height: 100vh; background: #f0f0f0; }
.content { max-width: 620px; margin: 0 auto; padding: 16px; }
.back-link { display: inline-block; margin: 0 0 12px; color: #8a5a00; text-decoration: none; font-size: 14px; font-weight: 600; }
.card { padding: 18px; background: #fff; border-radius: 14px; box-shadow: 0 1px 3px #0000000f; }
h1 { margin: 0 0 14px; font-size: 18px; }
h2 { margin: 20px 0 8px; font-size: 14px; }
h2:first-of-type { margin-top: 0; }
.role-band { padding: 9px 11px; border-radius: 8px; }
.hirer-band { background: #fff5d6; color: #805500; border-left: 4px solid #f0b429; }
.worker-band { background: #eaf3ff; color: #245b91; border-left: 4px solid #5b9bd5; }
.empty { margin: 0 0 8px; color: #888; font-size: 13px; }
.list { margin: 0; padding: 0; list-style: none; }
.item { padding: 12px 0; border-top: 1px solid #eee; }
.item:first-child { border-top: 0; }
.item-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.item-head strong { font-size: 14px; }
.meta { margin-top: 4px; color: #888; font-size: 12px; }
.reason { margin-top: 4px; color: #b91c1c; font-size: 12px; }
</style>
