<script setup>
// FR-ADMIN-02: Allow Admin to approve or reject pending job posts, with an optional
// rejection reason. Posts land here after passing automated content filtering (FR-JOB-05).
import { computed, ref } from "vue";

const search = ref("");
const activeStatus = ref("Pending"); // Pending | Approved | Rejected
const statuses = ["Pending", "Approved", "Rejected"];

// TODO: แทนที่ mock ด้วย GET /api/admin/posts?status= (FR-ADMIN-02)
const posts = ref([
  {
    id: "P-501",
    title: "Buy lunch at canteen",
    author: "Korawan K.",
    time: "5 min ago",
    text: "Looking for someone to pick up and deliver lunch from the canteen to Building D.",
    status: "Pending",
  },
  {
    id: "P-500",
    title: "Queue for course registration",
    author: "Chanidapa W.",
    time: "18 min ago",
    text: "Need someone to queue online for subject registration before slots run out.",
    status: "Pending",
  },
  {
    id: "P-497",
    title: "Weekly dorm cleaning",
    author: "Ponlawat C.",
    time: "1 day ago",
    text: "Recurring cleaning job for a shared dorm room, twice a week.",
    status: "Approved",
  },
  {
    id: "P-492",
    title: "Sell used textbooks",
    author: "Areeya S.",
    time: "2 days ago",
    text: "This post was rejected for containing content outside the platform's scope.",
    status: "Rejected",
    rejectionReason: "Not a task/service post — resale listings are out of scope.",
  },
]);

const filteredPosts = computed(() =>
  posts.value.filter((p) => {
    const matchesStatus = p.status === activeStatus.value;
    const matchesSearch =
      !search.value.trim() ||
      p.title.toLowerCase().includes(search.value.toLowerCase()) ||
      p.author.toLowerCase().includes(search.value.toLowerCase());
    return matchesStatus && matchesSearch;
  })
);

function approve(post) {
  // TODO: PATCH /api/admin/posts/:id/approve (FR-ADMIN-02)
  post.status = "Approved";
}

function reject(post) {
  // TODO: PATCH /api/admin/posts/:id/reject { reason } (FR-ADMIN-02 — optional rejection reason)
  const reason = window.prompt(`Rejection reason for "${post.title}" (optional):`, "");
  post.status = "Rejected";
  post.rejectionReason = reason || "No reason provided";
}
</script>

<template>
  <section class="posts">
    <div class="header-row">
      <p class="section-title">Post</p>
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input v-model="search" type="text" placeholder="Search posts" />
      </div>
    </div>

    <nav class="tabs">
      <button
        v-for="s in statuses"
        :key="s"
        :class="{ active: activeStatus === s }"
        @click="activeStatus = s"
      >
        {{ s }}
      </button>
    </nav>

    <ul class="post-list">
      <li v-for="p in filteredPosts" :key="p.id" class="post-card">
        <p class="post-title">{{ p.title }}</p>
        <p class="post-meta">{{ p.author }} · {{ p.time }}</p>
        <p class="post-text">{{ p.text }}</p>

        <div v-if="p.status === 'Pending'" class="action-row">
          <button class="action-btn approve" @click="approve(p)">Approve</button>
          <button class="action-btn reject" @click="reject(p)">Reject</button>
        </div>
        <div v-else class="status-row">
          <span class="status-badge" :class="p.status === 'Approved' ? 'green' : 'red'">{{ p.status }}</span>
          <span v-if="p.rejectionReason" class="rejection-reason">{{ p.rejectionReason }}</span>
        </div>
      </li>
      <li v-if="!filteredPosts.length" class="empty">No {{ activeStatus.toLowerCase() }} posts.</li>
    </ul>
  </section>
</template>

<style scoped>
.posts { padding: 16px; }
.header-row { margin-bottom: 12px; }
.section-title { margin: 0 0 8px; font-weight: 700; }
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

.tabs { display: flex; gap: 8px; margin-bottom: 12px; }
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
  background: var(--color-primary);
  color: #3a2a05;
  border-color: var(--color-primary);
}

.post-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.post-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
}
.post-title { margin: 0; font-weight: 700; font-size: 14px; }
.post-meta { margin: 2px 0 8px; font-size: 12px; color: var(--color-text-muted); }
.post-text { margin: 0 0 12px; font-size: 13px; opacity: 0.85; }

.action-row { display: flex; gap: 10px; }
.action-btn {
  flex: 1;
  min-height: 40px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.action-btn.approve { background: var(--color-green-bg); color: var(--color-green); }
.action-btn.reject { background: var(--color-red-bg); color: var(--color-red); }

.status-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.status-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  color: white;
}
.status-badge.green { background: var(--color-green); }
.status-badge.red { background: var(--color-red); }
.rejection-reason { font-size: 12px; color: var(--color-text-muted); }

.empty { text-align: center; color: var(--color-text-muted); padding: 20px 0; }
</style>