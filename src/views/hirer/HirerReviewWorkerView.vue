<script setup>
import UserAvatar from "../../components/UserAvatar.vue";
// FR-REV-01: Hirer rates and reviews the selected Worker after a job is complete.
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";
import AppHeader from "../../components/AppHeader.vue";

const route = useRoute();
const router = useRouter();
const job = ref(null);
const workerAvatarUrl = ref("");
const workerName = ref("Worker");
const loading = ref(true);
const submitting = ref(false);
const errorMsg = ref("");
const reviewStatus = ref(null);
const reviewed = computed(() => reviewStatus.value?.reviewed === true);

const rating = ref(4);
const comment = ref("");
const tagOptions = ["On time", "Fast & Efficient", "Item as Described", "Friendly", "Communicated Well", "Reliable", "Polite"];
const selectedTags = ref([]);

function toggleTag(tag) {
  const i = selectedTags.value.indexOf(tag);
  if (i === -1) selectedTags.value.push(tag);
  else selectedTags.value.splice(i, 1);
}
function goHome() { router.push("/hirer"); }

async function loadJob() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const { data } = await api.get(`/jobs/${route.params.id}`);
    if (data.status !== "completed") throw new Error("You can review this worker after the job is completed.");
    const workerId = data.selectedWorker?._id || data.selectedWorker;
    if (!workerId) throw new Error("No worker is assigned to this job.");
    const { data: worker } = await api.get(`/users/${workerId}`);
    const { data: review } = await api.get(`/jobs/${route.params.id}/review-status`);
    reviewStatus.value = review;
    job.value = data;
    workerAvatarUrl.value = worker.avatarUrl || "";
    workerName.value = worker.fullName || "Worker";
  } catch (err) {
    errorMsg.value = err.response?.data?.message || err.message || "Unable to load job details.";
  } finally {
    loading.value = false;
  }
}
onMounted(loadJob);

async function submit() {
  if (!job.value || reviewed.value || submitting.value || rating.value < 1 || rating.value > 5) return;
  submitting.value = true;
  errorMsg.value = "";
  try {
    await api.post(`/jobs/${job.value._id}/review`, {
      rating: rating.value,
      tags: selectedTags.value,
      comment: comment.value.trim(),
    });
    reviewStatus.value = { reviewed: true };
  } catch (err) {
    if (err.response?.status === 409) reviewStatus.value = { reviewed: true };
    errorMsg.value = err.response?.data?.message || "Unable to submit review.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main v-if="loading || !job" class="review jd-page">
    <AppHeader title="รีวิวผู้รับจ้าง" />
    <p v-if="loading" class="form-message">Loading job...</p>
    <p v-if="errorMsg" class="form-message error" role="alert">{{ errorMsg }}</p>
  </main>
  <main v-else-if="job" class="review jd-page">
    <AppHeader title="รีวิวผู้รับจ้าง" />

    <section class="content">
      <template v-if="reviewed">
        <p class="form-message" role="status">คุณรีวิว Worker สำหรับงานนี้แล้ว ไม่สามารถส่งซ้ำได้</p>
        <button type="button" class="btn home" @click="goHome">กลับหน้าโฮม</button>
      </template>
      <template v-else>
      <span class="avatar"><UserAvatar :src="workerAvatarUrl" :name="workerName" /></span>
      <div class="name">{{ workerName }}</div>
      <div class="role">ผู้รับจ้าง</div>

      <div class="stars">
        <button
          v-for="n in 5"
          :key="n"
          class="star"
          :class="{ filled: n <= rating }"
          @click="rating = n"
          :aria-label="`${n} ดาว`"
          :aria-pressed="n === rating"
        >★</button>
      </div>

      <p class="question">คุณรู้สึกอย่างไรกับการทำงานของผู้รับจ้าง?</p>

      <div class="tags">
        <button :aria-pressed="selectedTags.includes(tag)"
          v-for="tag in tagOptions"
          :key="tag"
          class="tag"
          :class="{ active: selectedTags.includes(tag) }"
          @click="toggleTag(tag)"
        >{{ tag }}</button>
      </div>

      <textarea aria-label="ความคิดเห็นเพิ่มเติม (ไม่บังคับ)" v-model="comment" rows="3" placeholder="ความคิดเห็นเพิ่มเติม (ไม่บังคับ)"></textarea>

      <p v-if="errorMsg" class="form-message error" role="alert">{{ errorMsg }}</p>
      <button class="btn primary" :disabled="submitting" @click="submit">{{ submitting ? "กำลังส่งรีวิว…" : "ส่งรีวิว" }}</button>
      </template>
    </section>
  </main>
</template>

<style scoped>
.review { padding-bottom: 32px; }
.content { padding: 20px 16px; text-align: center; }
.avatar {
  width: 72px; height: 72px; border-radius: 50%; background: var(--jd-subtle); margin: 0 auto 8px;
  display: flex; align-items: center; justify-content: center; font-size: 1.875rem;
}
.name { font-weight: 700; font-size: 1rem; }
.role { color: var(--jd-muted); font-size: 0.875rem; margin-bottom: 12px; }
.stars { display: flex; justify-content: center; gap: 6px; margin: 10px 0; }
.star { font-size: 1.875rem; background: none; border: none; color: var(--jd-line); cursor: pointer; min-width: 44px; min-height: 44px; }
.star.filled { color: var(--jd-warning); }
.question { font-size: 0.875rem; color: var(--jd-muted); margin: 8px 0 12px; }
.tags { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 16px; }
.tag {
  padding: 8px 14px; border-radius: 20px; border: 1px solid var(--jd-line); background: white;
  font-size: 0.875rem; cursor: pointer; min-height: 44px;
}
.tag.active { background: #fef3c7; border-color: var(--jd-warning); color: #92400e; font-weight: 600; }
textarea {
  width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--jd-line);
  font-family: inherit; resize: vertical; margin-bottom: 20px;
}
.btn { width: 100%; min-height: 44px; border-radius: 10px; font-weight: 600; font-size: 0.875rem; border: none; cursor: pointer; }
.btn.primary { background: var(--jd-accent); color: #78350f; }
.btn.home { display: block; width: auto; min-width: 180px; margin: 12px auto 0; padding: 0 24px; background: var(--jd-accent); color: var(--jd-ink); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.form-message { padding: 16px; text-align: center; color: var(--jd-muted); }
.form-message.error { color: #dc2626; }
</style>
