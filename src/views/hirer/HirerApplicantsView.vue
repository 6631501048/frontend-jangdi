<script setup>
// FR-MATCH-03: Hirer ดูผู้สมัครทั้งหมด (avatar, ชื่อ, credibility score, ระยะทาง)
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHirerJobsStore } from "../../stores/hirerJobs";
import AppHeader from "../../components/AppHeader.vue";

const route = useRoute();
const router = useRouter();
const store = useHirerJobsStore();

const job = computed(() => store.byId(route.params.id));

function select(workerId) {
  // FR-MATCH-04: เตรียมข้อมูลก่อนไปหน้ายืนยันเลือกช่าง + จ่ายเงิน
  store.stageWorkerSelection(job.value.id, workerId);
  router.push({ name: "hirer-confirm-selection", params: { id: job.value.id, workerId } });
}
</script>

<template>
  <main v-if="job" class="applicants">
    <AppHeader :title="`View Applicants (${job.applicants.length})`" />

    <section class="list">
      <div v-for="a in job.applicants" :key="a.id" class="applicant-card">
        <div class="avatar">👤</div>
        <div class="info">
          <div class="name">{{ a.name }}</div>
          <div class="meta">⭐ {{ a.rating }} · {{ a.distanceKm }} km</div>
        </div>
        <button class="select-btn" @click="select(a.id)">Select</button>
      </div>
      <p v-if="!job.applicants.length" class="empty">No applicants yet.</p>
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
.empty { color: #888; text-align: center; padding: 32px 0; }
</style>