<script setup>
// Admin "Home" — browse all job posts platform-wide, filterable by poster type and category.
// Read-only overview that complements the moderation queue in ManagePostsView (FR-ADMIN-02).
import { computed, ref } from "vue";

const search = ref("");
const activeAudience = ref("All"); // All | Hirer | Worker
const audiences = ["All", "Hirer", "Worker"];

const activeCategory = ref("All");
const categories = ["All", "Cleaning", "Delivery", "Tutoring & Education", "Moving", "Tech Help"];

// TODO: แทนที่ mock ด้วย GET /api/admin/jobs?audience=&category=&q= (ภาพรวมสำหรับ Admin)
const jobs = ref([
  {
    id: "J-1042",
    name: "Pitchaya R.",
    postedBy: "Hirer",
    time: "5m ago",
    category: "Cleaning",
    text: "Need help cleaning a 2-bedroom condo before the weekend, includes kitchen and bathroom.",
    tags: ["Urgent", "Today"],
  },
  {
    id: "J-1041",
    name: "Thanawit K.",
    postedBy: "Worker",
    time: "22m ago",
    category: "Tutoring & Education",
    text: "Offering calculus tutoring sessions for freshmen, available evenings this week.",
    tags: ["Remote"],
  },
  {
    id: "J-1040",
    name: "Natthapong S.",
    postedBy: "Hirer",
    time: "1h ago",
    category: "Delivery",
    text: "Pick up textbooks from the campus bookstore and deliver to the dorm before 6pm.",
    tags: ["Deadline"],
  },
  {
    id: "J-1039",
    name: "Manaswin T.",
    postedBy: "Hirer",
    time: "2h ago",
    category: "Moving",
    text: "Looking for two people to help move furniture to a new room on the 3rd floor.",
    tags: ["Today"],
  },
  {
    id: "J-1038",
    name: "Wichuda P.",
    postedBy: "Worker",
    time: "3h ago",
    category: "Tech Help",
    text: "Can help set up printers, Wi-Fi, or basic laptop troubleshooting for dorm residents.",
    tags: ["Remote"],
  },
  {
    id: "J-1037",
    name: "Chanidapa W.",
    postedBy: "Hirer",
    time: "5h ago",
    category: "Cleaning",
    text: "Need someone to organize and clean a shared study room before exam week.",
    tags: [],
  },
]);

const filteredJobs = computed(() =>
  jobs.value.filter((j) => {
    const matchesAudience = activeAudience.value === "All" || j.postedBy === activeAudience.value;
    const matchesCategory = activeCategory.value === "All" || j.category === activeCategory.value;
    const matchesSearch =
      !search.value.trim() ||
      j.name.toLowerCase().includes(search.value.toLowerCase()) ||
      j.text.toLowerCase().includes(search.value.toLowerCase());
    return matchesAudience && matchesCategory && matchesSearch;
  })
);

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
</script>

<template>
  <section class="browse">
    <div class="header-row">
      <p class="greeting">Hello, Admin</p>
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input v-model="search" type="text" placeholder="Search jobs or posters" />
      </div>
    </div>

    <nav class="tabs">
      <button
        v-for="a in audiences"
        :key="a"
        :class="{ active: activeAudience === a }"
        @click="activeAudience = a"
      >
        <span v-if="a === 'Hirer'">🧑‍💼 </span><span v-else-if="a === 'Worker'">🧑‍🔧 </span>{{ a }}
      </button>
    </nav>

    <div class="chip-row">
      <button
        v-for="c in categories"
        :key="c"
        class="chip"
        :class="{ active: activeCategory === c }"
        @click="activeCategory = c"
      >
        {{ c }}
      </button>
    </div>

    <ul class="job-list">
      <li v-for="j in filteredJobs" :key="j.id" class="job-card">
        <div class="avatar-circle">{{ initials(j.name) }}</div>
        <div class="job-body">
          <p class="job-name">{{ j.name }} <span class="job-time">· {{ j.time }}</span></p>
          <p class="job-text">{{ j.text }}</p>
          <div class="job-tags">
            <span class="tag category-tag">{{ j.category }}</span>
            <span v-for="t in j.tags" :key="t" class="tag">{{ t }}</span>
          </div>
        </div>
        <button class="details-btn">Details</button>
      </li>
      <li v-if="!filteredJobs.length" class="empty">No jobs match this filter.</li>
    </ul>
  </section>
</template>

<style scoped>
.browse { padding: 16px; }
.header-row { margin-bottom: 12px; }
.greeting { margin: 0 0 8px; font-weight: 700; }
.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 8px 14px;
}
.search-box input { border: none; outline: none; flex: 1; font-size: 14px; background: transparent; }
.search-icon { opacity: 0.6; }

.tabs { display: flex; gap: 8px; margin-bottom: 10px; }
.tabs button {
  flex: 1;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-weight: 600;
  color: var(--color-text-muted);
}
.tabs button.active {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  border-color: var(--color-primary);
}

.chip-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 10px; }
.chip {
  white-space: nowrap;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 13px;
  color: var(--color-text-muted);
}
.chip.active { background: var(--color-primary); color: #3a2a05; border-color: var(--color-primary); font-weight: 600; }

.job-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.job-card {
  display: flex;
  gap: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 12px;
  align-items: flex-start;
}
.avatar-circle {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
.job-body { flex: 1; min-width: 0; }
.job-name { margin: 0; font-weight: 700; font-size: 14px; }
.job-time { color: var(--color-text-muted); font-weight: 400; font-size: 12px; }
.job-text { margin: 4px 0 8px; font-size: 13px; color: var(--color-text); opacity: 0.85; }
.job-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--color-bg);
  color: var(--color-text-muted);
}
.category-tag { background: var(--color-primary-light); color: var(--color-primary-dark); }

.details-btn {
  align-self: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.empty { text-align: center; color: var(--color-text-muted); padding: 24px 0; }
</style>