<script setup>
// FR-MATCH-06: แจ้ง Hirer ว่าเลือกช่างสำเร็จ และงานเข้าสถานะ In Progress
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHirerJobsStore } from "../../stores/hirerJobs";
import AppHeader from "../../components/AppHeader.vue";

const route = useRoute();
const router = useRouter();
const store = useHirerJobsStore();

const job = computed(() => store.byId(route.params.id));

function goToMyJobs() {
  router.push({ name: "hirer-dashboard" });
}
</script>

<template>
  <main v-if="job" class="confirmed">
    <AppHeader title="Job Confirm" />

    <section class="content">
      <div class="check">✓</div>
      <p class="label">You have Selected</p>
      <h2 class="worker-name">{{ job.selectedWorker?.name }}</h2>

      <div class="card">
        <div class="row"><span>Job Details</span></div>
        <div class="row"><strong>{{ job.title }}</strong><span class="price">{{ job.price }} Baht</span></div>
        <div class="row muted"><span>Duration: {{ job.scheduledLabel }}</span></div>
        <div class="row"><span>Total Payment</span><strong>{{ job.total }} Baht</strong></div>
      </div>

      <button class="btn primary" @click="goToMyJobs">Go to My Jobs</button>
    </section>
  </main>
</template>

<style scoped>
.confirmed { padding-bottom: 32px; }
.content { padding: 24px 16px; text-align: center; }
.check {
  width: 64px; height: 64px; border-radius: 50%; background: #16a34a; color: white;
  font-size: 32px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
}
.label { color: #888; font-size: 13px; margin: 0; }
.worker-name { font-size: 22px; margin: 4px 0 24px; }
.card { text-align: left; border: 1px solid #eee; border-radius: 12px; padding: 14px; margin-bottom: 24px; }
.row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.row.muted { color: #888; }
.price { font-weight: 700; }
.btn { width: 100%; min-height: 44px; border-radius: 10px; font-weight: 600; font-size: 14px; border: none; cursor: pointer; }
.btn.primary { background: #fbbf24; color: #78350f; }
</style>