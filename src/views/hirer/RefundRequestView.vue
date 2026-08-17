<script setup>
// FR-JOB-07, FR-PAY-06: Hirer ยกเลิกงาน/ขอคืนเงิน escrow ที่ถือไว้ (ไปเข้าคิว Admin ตาม FR-PAY-07)
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHirerJobsStore } from "../../stores/hirerJobs";
import AppHeader from "../../components/AppHeader.vue";

const route = useRoute();
const router = useRouter();
const store = useHirerJobsStore();

const job = computed(() => store.byId(route.params.id));
const reason = ref("");

function cancel() {
  router.back();
}
function submit() {
  store.submitRefundRequest(job.value.id, reason.value);
  router.push({ name: "hirer-dashboard" });
}
</script>

<template>
  <main v-if="job" class="refund">
    <AppHeader title="Request Refund" />

    <section class="content">
      <div class="job-card">
        <div class="title">{{ job.title }}</div>
        <div class="sub">{{ job.description }}</div>
        <div class="row"><span>Refund Fee</span><span>0 Baht</span></div>
        <div class="row"><span>Total</span><strong>{{ job.total }} Baht</strong></div>
      </div>

      <div class="flow">
        <div class="node active">
          <div class="icon">💳</div>
          <div class="node-label">Payment<br /><small>Held in escrow</small></div>
        </div>
        <span class="arrow">→</span>
        <div class="node">
          <div class="icon">↩️</div>
          <div class="node-label">Refund<br /><small>To Hirer</small></div>
        </div>
      </div>

      <label class="field-label">Reason</label>
      <textarea v-model="reason" rows="4" placeholder="Describe the issue..."></textarea>

      <div class="actions">
        <button class="btn danger" @click="submit">Submit Refund</button>
        <button class="btn outline" @click="cancel">Cancel</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.refund { padding-bottom: 32px; }
.content { padding: 16px; }
.job-card { border: 1px solid #eee; border-radius: 12px; padding: 14px; margin-bottom: 20px; }
.title { font-weight: 700; font-size: 14px; }
.sub { font-size: 12px; color: #888; margin: 2px 0 10px; }
.row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-top: 1px solid #f5f5f5; }
.flow { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 12px 0 24px; }
.node {
  border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 16px; text-align: center;
  min-width: 100px; font-size: 11px; color: #888;
}
.node.active { border-color: #fbbf24; background: #fffbeb; color: #92400e; }
.icon { font-size: 20px; margin-bottom: 4px; }
.node-label small { color: inherit; }
.arrow { font-size: 18px; color: #aaa; }
.field-label { display: block; font-size: 13px; color: #555; margin-bottom: 6px; }
textarea {
  width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb;
  font-family: inherit; resize: vertical; margin-bottom: 20px;
}
.actions { display: flex; flex-direction: column; gap: 10px; }
.btn { min-height: 44px; border-radius: 10px; font-weight: 600; font-size: 14px; border: none; cursor: pointer; }
.btn.danger { background: #ef4444; color: white; }
.btn.outline { background: white; color: #555; border: 1px solid #e5e7eb; }
</style>