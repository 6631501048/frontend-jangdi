<script setup>
// FR-MATCH-04, FR-PAY-01/02: ยืนยันเลือกช่าง + วางเงินเข้า escrow (Pending -> Held)
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHirerJobsStore } from "../../stores/hirerJobs";
import AppHeader from "../../components/AppHeader.vue";

const route = useRoute();
const router = useRouter();
const store = useHirerJobsStore();

const job = computed(() => store.byId(route.params.id));
const worker = computed(() => job.value?.applicants.find((a) => a.id === route.params.workerId));

function cancel() {
  store.pendingSelection = null;
  router.back();
}
function confirmAndPay() {
  const updated = store.confirmSelectionAndPay(job.value.id);
  if (updated) {
    router.push({ name: "hirer-job-confirmed", params: { id: job.value.id } });
  }
}
</script>

<template>
  <main v-if="job && worker" class="confirm">
    <AppHeader title="Confirm Selection" />

    <section class="card">
      <p class="label">You Selected</p>
      <div class="worker">
        <div class="avatar">👤</div>
        <div>
          <div class="name">{{ worker.name }}</div>
          <div class="rating">⭐ {{ worker.rating }}</div>
        </div>
      </div>

      <h2 class="section-title">Payment Summary</h2>
      <dl class="rows">
        <div class="row"><dt>Service Fee</dt><dd>{{ job.serviceFee }} Baht</dd></div>
        <div class="row"><dt>Price</dt><dd>{{ job.price }} Baht</dd></div>
        <div class="row total"><dt>Total Payment</dt><dd>{{ job.total }} Baht</dd></div>
      </dl>

      <div class="actions">
        <button class="btn outline" @click="cancel">Cancel</button>
        <button class="btn primary" @click="confirmAndPay">Confirm &amp; Pay</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.confirm { padding-bottom: 32px; }
.card { padding: 16px; }
.label { font-size: 12px; color: #888; margin: 0 0 8px; }
.worker { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.name { font-weight: 700; font-size: 15px; }
.rating { font-size: 12px; color: #b45309; margin-top: 2px; }
.section-title { font-size: 14px; margin: 16px 0 4px; }
.rows { margin: 4px 0; }
.row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.row dt { color: #888; }
.row dd { margin: 0; font-weight: 600; }
.row.total dd { font-size: 16px; }
.actions { display: flex; gap: 10px; margin-top: 20px; }
.btn { flex: 1; min-height: 44px; border-radius: 10px; font-weight: 600; font-size: 14px; border: 1px solid #e5e7eb; cursor: pointer; }
.btn.outline { background: white; color: #555; }
.btn.primary { background: #fbbf24; color: #78350f; border: none; }
</style>