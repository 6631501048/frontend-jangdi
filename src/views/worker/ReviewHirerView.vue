<script setup>
// SRS 3.5.15 / FR-REV-01–02: หลังงานเสร็จสิ้น ผู้รับจ้างให้คะแนน + รีวิวผู้ว่าจ้าง
// ระบบรีวิวสองทาง (reciprocal) ช่วยรักษาความรับผิดชอบของทั้งสองฝั่งบนแพลตฟอร์ม
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

/* ---------- ข้อมูลผู้ว่าจ้างที่จะรีวิว ----------
   TODO: แทนที่ mock นี้ด้วย GET /api/jobs/{route.params.id} (ดึงชื่อ/รูป Hirer ของงานนี้) */
const hirer = ref({
  jobId: route.params.id,
  name: "Thanawit",
  avatarUrl: null,
});

/* ---------- ฟอร์มรีวิว ---------- */
const rating = ref(0);
const hoverRating = ref(0);
const displayRating = computed(() => hoverRating.value || rating.value);

const tagOptions = [
  "Flexible",
  "Clear instructions",
  "Detail-Oriented",
  "Friendly",
  "Communicates Well",
  "Reliable",
  "Polite",
];
const selectedTags = ref([]);
function toggleTag(tag) {
  const i = selectedTags.value.indexOf(tag);
  if (i === -1) selectedTags.value.push(tag);
  else selectedTags.value.splice(i, 1);
}

const comment = ref("");
const submitting = ref(false);
const canSubmit = computed(() => rating.value > 0 && !submitting.value);

function submitReview() {
  if (!canSubmit.value) return;
  // TODO FR-REV-01/02: POST /api/jobs/{hirer.jobId}/review
  //   { targetRole: "hirer", rating, tags: selectedTags, comment }
  // → backend บันทึกลง FEEDBACK และอัปเดต credibility_score ของ Hirer
  submitting.value = true;
  setTimeout(() => {
    submitting.value = false;
    router.push("/worker/jobs");
  }, 300);
}

function goBack() {
  router.back();
}
</script>

<template>
  <div class="page">
    <header class="topbar">
      <button class="icon-btn" aria-label="ย้อนกลับ" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="title">Review</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>

    <main class="content">
      <div class="card">
        <div class="profile-block">
          <span class="avatar" aria-hidden="true">
            <img v-if="hirer.avatarUrl" :src="hirer.avatarUrl" alt="" />
            <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
          </span>
          <p class="hirer-name">{{ hirer.name }}</p>
          <p class="hirer-role">Hirer</p>
        </div>

        <div class="stars-block">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            class="star-btn"
            :aria-label="`ให้คะแนน ${n} ดาว`"
            @click="rating = n"
            @mouseenter="hoverRating = n"
            @mouseleave="hoverRating = 0"
          >
            <svg viewBox="0 0 24 24" :class="{ filled: n <= displayRating }">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        </div>

        <p class="prompt">How was your experience with the hirer?</p>

        <div class="tags-block">
          <button
            v-for="tag in tagOptions"
            :key="tag"
            type="button"
            class="tag-chip"
            :class="{ active: selectedTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>

        <textarea
          v-model="comment"
          class="comment-input"
          rows="3"
          placeholder="Send feedback to the Hirer"
        ></textarea>

        <button class="btn-primary" :disabled="!canSubmit" @click="submitReview">
          {{ submitting ? "Submitting..." : "Review" }}
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; background: #f0f0f0; }
svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

/* ---------- Top bar (sub-page) ---------- */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; background: #fff; position: sticky; top: 0; z-index: 10;
  border-bottom: 1px solid #eee;
}
.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border: none; background: transparent;
  border-radius: 50%; color: #111; cursor: pointer;
}
.title { margin: 0; font-size: 15px; font-weight: 700; color: #111; }
.spacer { width: 40px; }

.content { padding: 16px; }
.card { background: #fff; border-radius: 12px; padding: 24px 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); display: flex; flex-direction: column; align-items: center; }

/* ---------- โปรไฟล์ผู้ว่าจ้าง ---------- */
.profile-block { display: flex; flex-direction: column; align-items: center; margin-bottom: 16px; }
.avatar {
  width: 72px; height: 72px; border-radius: 50%; border: 1px solid #ddd;
  display: flex; align-items: center; justify-content: center; color: #555; overflow: hidden; background: #fafafa;
}
.avatar svg { width: 34px; height: 34px; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.hirer-name { margin: 10px 0 0; font-size: 16px; font-weight: 700; color: #111; }
.hirer-role { margin: 2px 0 0; font-size: 11px; color: #999; }

/* ---------- ดาว ---------- */
.stars-block { display: flex; gap: 4px; margin-bottom: 10px; }
.star-btn { border: none; background: transparent; padding: 2px; cursor: pointer; }
.star-btn svg { width: 30px; height: 30px; fill: none; stroke: #ddd; stroke-width: 1.5; transition: fill 0.1s, stroke 0.1s; }
.star-btn svg.filled { fill: #ffc93c; stroke: #ffc93c; }

.prompt { margin: 0 0 16px; font-size: 13px; color: #555; text-align: center; }

/* ---------- Tag ---------- */
.tags-block { width: 100%; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 16px; }
.tag-chip {
  border: 1px solid #ddd; border-radius: 999px; background: #fff; color: #555;
  font-size: 12px; padding: 7px 14px; cursor: pointer; white-space: nowrap;
}
.tag-chip.active { border-color: #ffc93c; background: #fff8e1; color: #8a6d00; font-weight: 700; }

/* ---------- คอมเมนต์ ---------- */
.comment-input {
  width: 100%; border: 1px solid #ddd; border-radius: 10px; padding: 10px 12px;
  font-size: 13px; color: #111; resize: vertical; font-family: inherit; margin-bottom: 20px;
}
.comment-input::placeholder { color: #aaa; }

/* ---------- ปุ่มหลัก ---------- */
.btn-primary {
  width: 100%; min-height: 46px; border: none; border-radius: 10px;
  background: #ffc93c; color: #111; font-size: 14px; font-weight: 700; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
