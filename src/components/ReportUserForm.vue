<script setup>
import { computed, ref } from "vue";
import { useAuthStore } from "../stores/auth";
import api from "../services/api";

const props = defineProps({
  reportedUser: { type: Object, default: null },
  jobId: { type: String, default: "" },
});

const auth = useAuthStore();
const open = ref(false);
const reason = ref("");
const description = ref("");
const submitting = ref(false);
const message = ref("");
const isSelf = computed(() => String(props.reportedUser?._id || props.reportedUser?.id || "") === String(auth.user?._id || auth.user?.id || ""));
const reasons = ["Harassment or abuse", "Fraud or scam", "Unsafe behavior", "Other"];

async function submitReport() {
  message.value = "";
  const reportedUserId = props.reportedUser?._id || props.reportedUser?.id;
  if (!reportedUserId || isSelf.value || !reason.value || description.value.trim().length < 10) return;
  submitting.value = true;
  try {
    await api.post("/reports", {
      reportedUserId,
      ...(props.jobId ? { jobId: props.jobId } : {}),
      reason: reason.value,
      description: description.value.trim(),
    });
    message.value = "ส่งรายงานให้ทีมดูแลแล้ว";
    reason.value = "";
    description.value = "";
    open.value = false;
  } catch (error) {
    message.value = error.response?.data?.message || "ส่งรายงานไม่สำเร็จ กรุณาลองอีกครั้ง";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div v-if="(reportedUser?._id || reportedUser?.id) && !isSelf" class="report-control">
    <button type="button" class="report-trigger" @click="open = !open">{{ open ? "ยกเลิก" : "รายงานผู้ใช้นี้" }}</button>
    <form v-if="open" class="report-form" @submit.prevent="submitReport">
      <label>เหตุผล
        <select v-model="reason" required>
          <option value="" disabled>เลือกเหตุผล</option>
          <option v-for="item in reasons" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label>รายละเอียด
        <textarea v-model="description" minlength="10" maxlength="2000" required rows="4" placeholder="อธิบายสิ่งที่เกิดขึ้น (10-2000 ตัวอักษร)" />
      </label>
      <button class="submit" type="submit" :disabled="submitting || !reason || description.trim().length < 10">{{ submitting ? "กำลังส่ง..." : "ส่งรายงาน" }}</button>
    </form>
    <p v-if="message" role="status" class="report-message">{{ message }}</p>
  </div>
</template>

<style scoped>
.report-control { margin: 14px 0; }
.report-trigger { border: 0; background: transparent; color: #b42318; text-decoration: underline; cursor: pointer; padding: 8px 0; }
.report-form { display: grid; gap: 12px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; }
label { display: grid; gap: 6px; font-size: 13px; font-weight: 600; }
select, textarea { width: 100%; border: 1px solid #d1d5db; border-radius: 7px; padding: 9px; font: inherit; }
.submit { min-height: 42px; border: 0; border-radius: 8px; background: #ffc629; font-weight: 700; cursor: pointer; }
.submit:disabled { opacity: .6; cursor: not-allowed; }
.report-message { font-size: 13px; }
</style>
