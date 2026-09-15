<script setup>
import { ref, computed, onMounted } from "vue";
import api from "../../services/api";

const loading = ref(true);
const actionLoading = ref(null);
const errorMessage = ref("");
const search = ref("");

const jobs = ref([]);

const filteredJobs = computed(() => {
  const q = search.value.trim().toLowerCase();

  if (!q) return jobs.value;

  return jobs.value.filter((job) => {
    const title = String(job.title || "").toLowerCase();
    const description = String(job.description || "").toLowerCase();
    const hirer = String(job.hirer?.fullName || "").toLowerCase();
    const email = String(job.hirer?.email || "").toLowerCase();

    return (
      title.includes(q) ||
      description.includes(q) ||
      hirer.includes(q) ||
      email.includes(q)
    );
  });
});

function initials(name) {
  return String(name || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

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

async function loadJobs() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data } = await api.get("/admin/jobs/pending");
    jobs.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(error);
    errorMessage.value =
      error.response?.data?.message ||
      "ไม่สามารถโหลดประกาศงานที่รอตรวจสอบได้";
  } finally {
    loading.value = false;
  }
}

async function approve(job) {
  if (actionLoading.value) return;

  actionLoading.value = job._id;

  try {
    await api.post(`/admin/jobs/${job._id}/approve`);
    jobs.value = jobs.value.filter((item) => item._id !== job._id);
  } catch (error) {
    alert(
      error.response?.data?.message ||
        "ไม่สามารถอนุมัติประกาศงานได้"
    );
  } finally {
    actionLoading.value = null;
  }
}

async function reject(job) {
  if (actionLoading.value) return;

  const reason = window.prompt(
    `เหตุผลที่ปฏิเสธ "${job.title}"`,
    ""
  );

  if (reason === null) return;

  actionLoading.value = job._id;

  try {
    await api.post(`/admin/jobs/${job._id}/reject`, {
      reason,
    });

    jobs.value = jobs.value.filter((item) => item._id !== job._id);
  } catch (error) {
    alert(
      error.response?.data?.message ||
        "ไม่สามารถปฏิเสธประกาศงานได้"
    );
  } finally {
    actionLoading.value = null;
  }
}

onMounted(loadJobs);
</script>

<template>
  <section class="browse">
    <div class="header-row">
      <div>
        <p class="greeting">Hello, Admin</p>
        <p class="subtitle">
          Job posts waiting for Admin review
        </p>
      </div>

      <button
        class="refresh-btn"
        :disabled="loading"
        @click="loadJobs"
      >
        {{ loading ? "Loading..." : "Refresh" }}
      </button>
    </div>

    <div class="search-box">
      <span>🔍</span>
      <input
        v-model="search"
        type="text"
        placeholder="Search jobs or posters"
      />
    </div>

    <div v-if="errorMessage" class="error-box">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="empty">
      กำลังโหลดประกาศงาน...
    </div>

    <ul v-else class="job-list">
      <li
        v-for="job in filteredJobs"
        :key="job._id"
        class="job-card"
      >
        <div class="avatar-circle">
          {{ initials(job.hirer?.fullName) }}
        </div>

        <div class="job-body">
          <p class="job-name">
            {{ job.hirer?.fullName || "Unknown User" }}
          </p>

          <p class="job-title">
            {{ job.title || "Untitled Job" }}
          </p>

          <p class="job-text">
            {{ job.description || "-" }}
          </p>

          <div class="job-info">
            <span>{{ job.category || "-" }}</span>
            <span>{{ money(job.price) }}</span>
            <span>{{ formatDate(job.createdAt) }}</span>
          </div>

          <p class="email">
            {{ job.hirer?.email || "-" }}
          </p>

          <div class="action-row">
            <button
              class="action-btn approve"
              :disabled="actionLoading === job._id"
              @click="approve(job)"
            >
              {{
                actionLoading === job._id
                  ? "Processing..."
                  : "Approve"
              }}
            </button>

            <button
              class="action-btn reject"
              :disabled="actionLoading === job._id"
              @click="reject(job)"
            >
              Reject
            </button>
          </div>
        </div>
      </li>

      <li v-if="!filteredJobs.length" class="empty">
        ไม่มีประกาศงานที่รอตรวจสอบ
      </li>
    </ul>
  </section>
</template>

<style scoped>
.browse {
  padding: 16px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.greeting {
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
  gap: 7px;
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

.error-box {
  padding: 12px;
  border-radius: 8px;
  background: var(--color-red-bg);
  color: var(--color-red);
  margin-bottom: 12px;
  font-size: 13px;
}

.job-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.job-card {
  display: flex;
  gap: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 12px;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.job-body {
  flex: 1;
  min-width: 0;
}

.job-name {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.job-title {
  margin: 4px 0;
  font-size: 14px;
  font-weight: 700;
}

.job-text {
  margin: 0 0 8px;
  font-size: 13px;
  opacity: 0.85;
}

.job-info {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.job-info span,
.email {
  font-size: 11px;
  color: var(--color-text-muted);
}

.email {
  margin: 5px 0 0;
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

.empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 24px 0;
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