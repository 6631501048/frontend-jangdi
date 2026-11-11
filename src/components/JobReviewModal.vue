<script setup>
import { computed, onMounted, ref } from "vue";
import api from "../services/api";

const props = defineProps({ role: { type: String, required: true }, jobId: { type: String, required: true } });
const emit = defineEmits(["close", "reviewed"]);
const isHirer = computed(() => props.role === "hirer");
const loading = ref(true), submitting = ref(false), error = ref("");
const personName = ref("");
const reviewAlreadySubmitted = ref(false);
const canReview = ref(false);
const rating = ref(0), comment = ref(""), selectedTags = ref([]);
const tags = computed(() => isHirer.value
  ? ["ตรงต่อเวลา", "รวดเร็วและมีประสิทธิภาพ", "เป็นมิตร", "สื่อสารดี", "น่าเชื่อถือ", "สุภาพ"]
  : ["คำแนะนำชัดเจน", "เป็นมิตร", "สื่อสารดี", "ให้ความร่วมมือ", "น่าเชื่อถือ", "สุภาพ"]);

function toggleTag(tag) {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter(item => item !== tag)
    : [...selectedTags.value, tag];
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [{ data: job }, { data: status }] = await Promise.all([
      api.get(`/jobs/${props.jobId}`),
      api.get(`/jobs/${props.jobId}/review-status`),
    ]);
    reviewAlreadySubmitted.value = !!status.reviewed;
    canReview.value = !!status.eligible && !status.reviewed;
    if (isHirer.value) {
      const workerId = job.selectedWorker?._id || job.selectedWorker;
      if (!workerId) throw new Error("ไม่พบผู้รับจ้างของงานนี้");
      const { data: worker } = await api.get(`/users/${workerId}`);
      personName.value = worker.fullName || "ผู้รับจ้าง";
    } else {
      personName.value = job.hirer?.fullName || "ผู้ว่าจ้าง";
    }
  } catch (err) {
    error.value = err.response?.data?.message || err.message || "โหลดข้อมูลรีวิวไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!canReview.value || submitting.value || rating.value < 1) return;
  submitting.value = true;
  error.value = "";
  try {
    await api.post(`/jobs/${props.jobId}/review`, {
      rating: rating.value,
      tags: selectedTags.value,
      comment: comment.value.trim(),
    });
    emit("reviewed");
    emit("close");
  } catch (err) {
    if (err.response?.status === 409) {
      emit("reviewed");
      emit("close");
    } else error.value = err.response?.data?.message || "ส่งรีวิวไม่สำเร็จ กรุณาลองอีกครั้ง";
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <button class="close" type="button" aria-label="ปิด" @click="emit('close')">×</button>
      <h2 id="review-title">{{ isHirer ? 'รีวิวผู้รับจ้าง' : 'รีวิวผู้ว่าจ้าง' }}</h2>
      <p v-if="loading" class="message" role="status">กำลังโหลดข้อมูล…</p>
      <template v-else-if="reviewAlreadySubmitted">
        <p class="message" role="status">รีวิวงานนี้เรียบร้อยแล้ว</p>
        <button class="action" type="button" @click="emit('close')">ปิด</button>
      </template>
      <template v-else-if="canReview">
        <p class="person">{{ personName }}</p>
        <div class="stars" aria-label="คะแนนรีวิว">
          <button v-for="n in 5" :key="n" type="button" :class="{ selected: n <= rating }" :aria-label="`ให้ ${n} ดาว`" @click="rating = n">★</button>
        </div>
        <div class="tags">
          <button v-for="tag in tags" :key="tag" type="button" :class="{ selected: selectedTags.includes(tag) }" @click="toggleTag(tag)">{{ tag }}</button>
        </div>
        <textarea v-model="comment" rows="3" placeholder="เขียนความคิดเห็นเพิ่มเติม (ไม่บังคับ)"></textarea>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button class="action" type="button" :disabled="rating < 1 || submitting" @click="submit">{{ submitting ? 'กำลังส่งรีวิว…' : 'ส่งรีวิว' }}</button>
      </template>
      <template v-else>
        <p class="message" role="alert">{{ error || 'ยังไม่สามารถรีวิวงานนี้ได้' }}</p>
        <button class="action" type="button" @click="emit('close')">ปิด</button>
      </template>
    </section>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 16px; background: rgb(15 23 42 / 55%); }
.dialog { position: relative; width: min(100%, 440px); max-height: min(90vh, 720px); overflow-y: auto; padding: 24px; border-radius: 16px; background: #fff; box-shadow: 0 20px 60px rgb(0 0 0 / 25%); }
h2 { margin: 0 36px 8px 0; font-size: 18px; text-align: center; }
.close { position: absolute; top: 10px; right: 12px; width: 36px; height: 36px; border: 0; border-radius: 50%; background: #f3f4f6; font-size: 24px; cursor: pointer; }
.person,.message { margin: 8px 0 12px; color: #555; text-align: center; }
.stars { display: flex; justify-content: center; gap: 4px; margin: 8px 0 16px; }
.stars button { border: 0; background: transparent; color: #d1d5db; font-size: 34px; cursor: pointer; }
.stars button.selected { color: #ffc93c; }
.tags { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 14px; }
.tags button { padding: 8px 12px; border: 1px solid #ddd; border-radius: 999px; background: #fff; cursor: pointer; }
.tags button.selected { border-color: #ffc93c; background: #fff8df; }
textarea { display: block; width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #ddd; border-radius: 10px; resize: vertical; font: inherit; }
.action { display: block; min-width: 160px; min-height: 44px; margin: 16px auto 0; padding: 0 20px; border: 0; border-radius: 10px; background: #ffc93c; color: #111; font: inherit; font-weight: 700; cursor: pointer; }
.action:disabled { opacity: .55; cursor: default; }
.error { color: #b42318; text-align: center; }
</style>
