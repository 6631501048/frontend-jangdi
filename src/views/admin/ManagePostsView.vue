<script setup>
import { ref, computed, onMounted } from "vue";
import api from "../../services/api";

const posts = ref([]);
const loading = ref(true);
const actionLoading = ref(null);
const errorMessage = ref("");
const search = ref("");

const filteredPosts = computed(() => {
  const q = search.value.trim().toLowerCase();

  if (!q) return posts.value;

  return posts.value.filter((post) => {
    return [
      post.title,
      post.description,
      post.hirer?.fullName,
      post.hirer?.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
});

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function money(value) {
  return `฿${Number(value || 0).toLocaleString("en-US")}`;
}

async function loadPosts() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get("/admin/jobs/pending");
    posts.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(error);

    errorMessage.value =
      error.response?.data?.message ||
      "ไม่สามารถโหลดประกาศที่รอตรวจสอบได้";
  } finally {
    loading.value = false;
  }
}

async function approve(post) {
  if (actionLoading.value) return;

  actionLoading.value = post._id;

  try {
    await api.post(`/admin/jobs/${post._id}/approve`);

    posts.value = posts.value.filter(
      (item) => item._id !== post._id
    );
  } catch (error) {
    alert(
      error.response?.data?.message ||
        "ไม่สามารถอนุมัติประกาศได้"
    );
  } finally {
    actionLoading.value = null;
  }
}

async function reject(post) {
  if (actionLoading.value) return;

  const reason = window.prompt(
    `เหตุผลที่ปฏิเสธ "${post.title}"`,
    ""
  );

  if (reason === null) return;

  actionLoading.value = post._id;

  try {
    await api.post(`/admin/jobs/${post._id}/reject`, {
      reason,
    });

    posts.value = posts.value.filter(
      (item) => item._id !== post._id
    );
  } catch (error) {
    alert(
      error.response?.data?.message ||
        "ไม่สามารถปฏิเสธประกาศได้"
    );
  } finally {
    actionLoading.value = null;
  }
}

onMounted(loadPosts);
</script>

<template>
  <section class="posts">
    <div class="header-row">
      <div>
        <p class="section-title">Manage Posts</p>
        <p class="subtitle">
          ประกาศงานที่รอ Admin ตรวจสอบ
        </p>
      </div>

      <button
        class="refresh-btn"
        :disabled="loading"
        @click="loadPosts"
      >
        {{ loading ? "Loading..." : "Refresh" }}
      </button>
    </div>

    <div class="search-box">
      <span>🔍</span>

      <input
        v-model="search"
        type="text"
        placeholder="Search posts"
      />
    </div>

    <div v-if="errorMessage" class="error-box">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="empty">
      กำลังโหลดประกาศ...
    </div>

    <ul v-else class="post-list">
      <li
        v-for="post in filteredPosts"
        :key="post._id"
        class="post-card"
      >
        <div class="post-top">
          <div>
            <p class="post-title">
              {{ post.title }}
            </p>

            <p class="post-meta">
              {{ post.hirer?.fullName || "Unknown User" }}
              ·
              {{ formatDate(post.createdAt) }}
            </p>
          </div>

          <span class="status-badge">
            Pending
          </span>
        </div>

        <p class="post-text">
          {{ post.description || "-" }}
        </p>

        <div class="post-info">
          <span>
            Category: {{ post.category || "-" }}
          </span>

          <span>
            Price: {{ money(post.price) }}
          </span>
        </div>

        <div class="action-row">
          <button
            class="action-btn approve"
            :disabled="actionLoading === post._id"
            @click="approve(post)"
          >
            Approve
          </button>

          <button
            class="action-btn reject"
            :disabled="actionLoading === post._id"
            @click="reject(post)"
          >
            Reject
          </button>
        </div>
      </li>

      <li v-if="!filteredPosts.length" class="empty">
        ไม่มีประกาศที่รอตรวจสอบ
      </li>
    </ul>
  </section>
</template>

<style scoped>
.posts {
  padding: 16px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.section-title {
  margin: 0;
  font-weight: 700;
}

.subtitle {
  margin: 3px 0 0;
  color: var(--color-text-muted);
  font-size: 12px;
}

.refresh-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 8px;
  padding: 8px 12px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 8px 14px;
  margin-bottom: 12px;
}

.search-box input {
  border: none;
  outline: none;
  flex: 1;
  background: transparent;
}

.post-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.post-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
}

.post-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.post-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.post-meta {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--color-text-muted);
}

.post-text {
  margin: 10px 0;
  font-size: 13px;
}

.post-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--color-text-muted);
}

.status-badge {
  height: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  font-size: 11px;
  font-weight: 700;
}

.action-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.action-btn {
  flex: 1;
  min-height: 40px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

.action-btn:disabled {
  opacity: 0.6;
}

.approve {
  background: var(--color-primary);
  color: #3a2a05;
}

.reject {
  background: var(--color-red-bg);
  color: var(--color-red);
}

.error-box {
  padding: 12px;
  background: var(--color-red-bg);
  color: var(--color-red);
  border-radius: 8px;
}

.empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 24px;
}

@media (max-width: 600px) {
  .header-row {
    flex-direction: column;
  }

  .refresh-btn {
    width: 100%;
  }
}
</style>