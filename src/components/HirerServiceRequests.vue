<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import api from '../services/api';
import { requestWorkflowLabel } from '../services/workflowStatus';

const requests = ref([]), loading = ref(true), error = ref(''), filter = ref('all');
const filters = [
  { value: 'all', label: 'ทั้งหมด' }, { value: 'pending', label: 'รอตอบรับ' },
  { value: 'accepted', label: 'รับคำขอแล้ว' }, { value: 'declined', label: 'ไม่ได้รับเลือก / ปฏิเสธ' },
];
const visible = computed(() => requests.value.filter(request => filter.value === 'all' || request.status === filter.value));
const jobId = request => request.resultingJob?._id || (typeof request.resultingJob === 'string' ? request.resultingJob : null);
const date = value => value ? new Date(value).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—';
let refreshTimer, inFlight = false, disposed = false;
async function load() {
  if (inFlight) return;
  inFlight = true;
  try {
    const { data } = await api.get('/service-posts/requests/my-as-hirer');
    if (!disposed) { requests.value = Array.isArray(data) ? data : []; error.value = ''; }
  } catch (err) {
    if (!disposed) error.value = err.response?.data?.message || 'โหลดประวัติคำขอไม่สำเร็จ';
  } finally { loading.value = false; inFlight = false; }
}
onMounted(() => { load(); refreshTimer = window.setInterval(load, 5000); });
onUnmounted(() => { disposed = true; window.clearInterval(refreshTimer); });
</script>

<template>
  <section class="requests" aria-label="คำขอใช้บริการของฉัน">
    <h2>คำขอใช้บริการของฉัน</h2>
    <nav class="request-filters" aria-label="กรองคำขอใช้บริการ">
      <button v-for="item in filters" :key="item.value" type="button" :class="{ active: filter === item.value }" @click="filter = item.value">{{ item.label }}</button>
    </nav>
    <p v-if="loading" role="status">กำลังโหลดคำขอ…</p>
    <p v-if="error" role="alert">{{ error }} <button type="button" @click="load">ลองใหม่</button></p>
    <article v-for="request in visible" :key="request._id" class="request-card">
      <h3>{{ request.servicePost?.title || 'บริการเดิม' }}</h3>
      <p class="state" :class="request.status" role="status">{{ requestWorkflowLabel(request) }}</p>
      <p class="details">{{ request.orderDetails || request.orderData?.requirements || '—' }}</p>
      <p class="date">ส่งคำขอ {{ date(request.createdAt) }}<span v-if="request.respondedAt"> · แจ้งผล {{ date(request.respondedAt) }}</span></p>
      <template v-if="request.status === 'accepted' && jobId(request)">
        <RouterLink v-if="['pending', 'slip_rejected', 'awaiting_verification'].includes(request.paymentStatus)" :to="{ name: 'hirer-mock-payment', params: { id: jobId(request) } }">ดูการชำระเงิน</RouterLink>
        <RouterLink :to="{ name: 'hirer-job-detail', params: { id: jobId(request) } }">ดูรายละเอียดงาน</RouterLink>
      </template>
    </article>
    <p v-if="!loading && !error && !visible.length">ยังไม่มีคำขอในหมวดนี้</p>
  </section>
</template>

<style scoped>
.requests h2{font-size:16px;margin:0 0 12px}.request-filters{display:flex;gap:6px;overflow-x:auto;padding-bottom:12px}.request-filters button{flex-shrink:0;min-height:38px;padding:7px 12px;border:1px solid #ddd;border-radius:20px;background:#fff;color:#444;cursor:pointer}.request-filters button.active{background:#ffc93c;border-color:#ffc93c;color:#111}.request-card{padding:16px;margin-bottom:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}.request-card h3{font-size:15px;margin:0 0 8px}.state{font-size:13px;font-weight:700;color:#886000}.state.declined{color:#b91c1c}.state.accepted{color:#166534}.details{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}.date{font-size:11px;color:#666}.request-card a{display:inline-block;margin:5px 16px 0 0;font-size:13px;color:#765500}
</style>
