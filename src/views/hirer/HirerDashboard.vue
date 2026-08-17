<script setup>
// FR-JOB-08: งานที่ประกาศ จัดกลุ่มตามสถานะ (Waiting / In Progress / Completed / Cancelled)
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useHirerJobsStore } from "../../stores/hirerJobs";
import JobCard from "../../components/JobCard.vue";

const router = useRouter();
const store = useHirerJobsStore();

const tabs = [
  { key: "waiting", label: "Waiting" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];
const activeTab = ref("waiting");

const filteredJobs = computed(() => store.byStatus(activeTab.value));

function openJob(id) {
  router.push({ name: "hirer-job-detail", params: { id } });
}
</script>

<template>
  <main class="dashboard">
    <header class="top">
      <h1>My Job</h1>
    </header>

    <nav class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >{{ t.label }}</button>
    </nav>

    <section class="list">
      <JobCard v-for="job in filteredJobs" :key="job.id" :job="job" @open="openJob" />
      <p v-if="!filteredJobs.length" class="empty">No jobs in this status yet.</p>
    </section>

    <RouterLink to="/hirer/post-job" class="fab">+ Post a New Job</RouterLink>
  </main>
</template>

<style scoped>
.dashboard { padding-bottom: 90px; }
.top { padding: 16px 16px 0; }
.top h1 { font-size: 20px; margin: 0 0 8px; }
.tabs { display: flex; gap: 8px; overflow-x: auto; padding: 8px 16px 16px; }
.tabs button {
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  background: white;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
}
.tabs button.active { background: #fbbf24; color: #78350f; border-color: #fbbf24; font-weight: 600; }
.list { display: flex; flex-direction: column; gap: 10px; padding: 0 16px; }
.empty { color: #888; text-align: center; padding: 32px 0; }
.fab {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  max-width: 448px;
  margin: 0 auto;
  display: block;
  text-align: center;
  padding: 16px;
  background: #16a34a;
  color: white;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
</style>