<script setup>
// FR-MATCH-03: Hirer ดูผู้สมัครทั้งหมด (avatar, ชื่อ, credibility score, ระยะทาง)
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
import AppHeader from "../../components/AppHeader.vue";

const route = useRoute();
const router = useRouter();
const job = ref({ _id: route.params.id, status: "", applicants: [] });
const applicants = ref([]);
const loading = ref(true);
const errorMsg = ref("");
const canSelect = computed(() => job.value.status === "waiting");

async function loadApplicants() {
  loading.value = true;
  try {
    const [{ data: jobData }, { data: applicantData }] = await Promise.all([
      api.get(`/jobs/${route.params.id}`), api.get(`/jobs/${route.params.id}/applicants`),
    ]);
    job.value = jobData;
    applicants.value = applicantData.map((item) => ({
      id: item._id,
      workerId: item.worker?._id || item.worker,
      name: item.worker?.fullName || "Worker",
      avatarUrl: item.worker?.avatarUrl || "",
      score: item.worker?.credibilityScore ?? 0,
      reviewCount: item.worker?.reviewCount ?? 0,
      distanceMeters: item.distanceMeters,
    }));
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "Unable to load applicants.";
  } finally {
    loading.value = false;
  }
}
onMounted(loadApplicants);

function select(workerId) {
  // FR-MATCH-04: เตรียมข้อมูลก่อนไปหน้ายืนยันเลือกช่าง + จ่ายเงิน
  router.push({ name: "hirer-confirm-selection", params: { id: job.value._id, workerId } });
}
</script>

<template>
  <main class="applicants">
    <AppHeader :title="`View Applicants (${applicants.length})`" />

    <section class="list">
      <p v-if="loading" class="empty">Loading applicants...</p>
      <p v-else-if="errorMsg" class="empty error">{{ errorMsg }}</p>
      <div v-else v-for="a in applicants" :key="a.id" class="applicant-card">
        <div class="avatar">👤</div>
        <div class="info">
          <div class="name">{{ a.name }}</div>
          <div class="meta">⭐ {{ a.rating }} · {{ a.distanceKm }} km</div>
        </div>
        <button class="select-btn" :disabled="!canSelect" @click="select(a.workerId)">Select</button>
      </div>
      <p v-if="!loading && !errorMsg && !applicants.length" class="empty">No applicants yet.</p>
    </section>
  </main>
</template>

<style scoped>
.applicants { padding-bottom: 32px; }
.list { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.applicant-card {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  border: 1px solid #eee; border-radius: 12px; background: white;
}
.avatar { width: 40px; height: 40px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.info { flex: 1; }
.name { font-weight: 600; font-size: 14px; }
.meta { font-size: 12px; color: #888; margin-top: 2px; }
.select-btn {
  min-height: 40px; padding: 8px 18px; border-radius: 20px;
  border: 1px solid #fbbf24; background: white; color: #b45309; font-weight: 600; cursor: pointer;
}
.select-btn:hover { background: #fffbeb; }
.select-btn:disabled { opacity: .5; cursor: not-allowed; }
.empty { color: #888; text-align: center; padding: 32px 0; }
.error { color: #e11d48; }
</style>
