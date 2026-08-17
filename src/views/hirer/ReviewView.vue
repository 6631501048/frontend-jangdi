<script setup>
// FR-REV-01: Hirer ให้คะแนน (1-5) และรีวิว Worker หลังงานเสร็จ
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHirerJobsStore } from "../../stores/hirerJobs";
import AppHeader from "../../components/AppHeader.vue";

const route = useRoute();
const router = useRouter();
const store = useHirerJobsStore();

const job = computed(() => store.byId(route.params.id));

const rating = ref(4);
const comment = ref("");
const tagOptions = ["On time", "Fast & Efficient", "Item as Described", "Friendly", "Communicated Well", "Reliable", "Polite"];
const selectedTags = ref([]);

function toggleTag(tag) {
  const i = selectedTags.value.indexOf(tag);
  if (i === -1) selectedTags.value.push(tag);
  else selectedTags.value.splice(i, 1);
}

function submit() {
  store.submitReview(job.value.id, {
    rating: rating.value,
    tags: selectedTags.value,
    comment: comment.value,
  });
  router.push({ name: "hirer-dashboard" });
}
</script>

<template>
  <main v-if="job" class="review">
    <AppHeader title="Review" />

    <section class="content">
      <div class="avatar">👤</div>
      <div class="name">{{ job.selectedWorker?.name }}</div>
      <div class="role">Worker</div>

      <div class="stars">
        <button
          v-for="n in 5"
          :key="n"
          class="star"
          :class="{ filled: n <= rating }"
          @click="rating = n"
          :aria-label="`${n} star`"
        >★</button>
      </div>

      <p class="question">How was your experience with the worker?</p>

      <div class="tags">
        <button
          v-for="tag in tagOptions"
          :key="tag"
          class="tag"
          :class="{ active: selectedTags.includes(tag) }"
          @click="toggleTag(tag)"
        >{{ tag }}</button>
      </div>

      <textarea v-model="comment" rows="3" placeholder="Additional feedback (optional)"></textarea>

      <button class="btn primary" @click="submit">Review</button>
    </section>
  </main>
</template>

<style scoped>
.review { padding-bottom: 32px; }
.content { padding: 20px 16px; text-align: center; }
.avatar {
  width: 72px; height: 72px; border-radius: 50%; background: #f3f4f6; margin: 0 auto 8px;
  display: flex; align-items: center; justify-content: center; font-size: 30px;
}
.name { font-weight: 700; font-size: 16px; }
.role { color: #888; font-size: 12px; margin-bottom: 12px; }
.stars { display: flex; justify-content: center; gap: 6px; margin: 10px 0; }
.star { font-size: 30px; background: none; border: none; color: #e5e7eb; cursor: pointer; min-width: 44px; min-height: 44px; }
.star.filled { color: #fbbf24; }
.question { font-size: 13px; color: #555; margin: 8px 0 12px; }
.tags { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 16px; }
.tag {
  padding: 8px 14px; border-radius: 20px; border: 1px solid #e5e7eb; background: white;
  font-size: 12px; cursor: pointer; min-height: 40px;
}
.tag.active { background: #fef3c7; border-color: #fbbf24; color: #92400e; font-weight: 600; }
textarea {
  width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb;
  font-family: inherit; resize: vertical; margin-bottom: 20px;
}
.btn { width: 100%; min-height: 44px; border-radius: 10px; font-weight: 600; font-size: 14px; border: none; cursor: pointer; }
.btn.primary { background: #fbbf24; color: #78350f; }
</style>