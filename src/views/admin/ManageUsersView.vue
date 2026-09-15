<script setup>
import { computed, onMounted, ref } from "vue";
import api from "../../services/api";

const search = ref("");
const activeRole = ref("All");
const roles = ["All", "Hirer", "Worker"];

const users = ref([]);
const loading = ref(true);
const actionLoading = ref(null);
const errorMessage = ref("");
const selectedUser = ref(null);

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase();

  return users.value.filter((user) => {
    const role =
      user.currentRole === "hirer"
        ? "Hirer"
        : user.currentRole === "worker"
        ? "Worker"
        : String(user.currentRole || "");

    const matchesRole =
      activeRole.value === "All" ||
      role === activeRole.value;

    const text = [
      user.fullName,
      user.email,
      user.studentId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesRole && (!q || text.includes(q));
  });
});

function roleLabel(role) {
  if (role === "hirer") return "Hirer";
  if (role === "worker") return "Worker";
  return role || "-";
}

function statusLabel(status) {
  if (status === "active") return "Active";
  if (status === "warned") return "Warned";
  if (status === "suspended") return "Suspended";
  return status || "-";
}

function statusClass(status) {
  if (status === "active") return "green";
  if (status === "warned") return "yellow";
  return "red";
}

async function loadUsers() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const params = {};

    if (activeRole.value !== "All") {
      params.role =
        activeRole.value === "Hirer"
          ? "hirer"
          : "worker";
    }

    if (search.value.trim()) {
      params.search = search.value.trim();
    }

    const { data } = await api.get("/admin/users", {
      params,
    });

    users.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(error);

    errorMessage.value =
      error.response?.data?.message ||
      "ไม่สามารถโหลดรายชื่อผู้ใช้ได้";
  } finally {
    loading.value = false;
  }
}

function selectUser(user) {
  selectedUser.value = user;
}

async function statusAction(action) {
  if (!selectedUser.value || actionLoading.value) return;

  const messages = {
    suspend: "ต้องการระงับบัญชีผู้ใช้นี้หรือไม่?",
    warn: "ต้องการแจ้งเตือนผู้ใช้นี้หรือไม่?",
    clear: "ต้องการคืนสถานะบัญชีเป็น Active หรือไม่?",
  };

  if (!window.confirm(messages[action])) return;

  actionLoading.value = selectedUser.value._id;

  try {
    const { data } = await api.post(
      `/admin/users/${selectedUser.value._id}/suspend`,
      { action }
    );

    const updatedUser = data.user;

    users.value = users.value.map((user) =>
      user._id === updatedUser._id
        ? updatedUser
        : user
    );

    selectedUser.value = updatedUser;
  } catch (error) {
    alert(
      error.response?.data?.message ||
        "ไม่สามารถเปลี่ยนสถานะบัญชีได้"
    );
  } finally {
    actionLoading.value = null;
  }
}

onMounted(loadUsers);
</script>

<template>
  <section class="users">
    <div class="header-row">
      <p class="section-title">User Management</p>

      <button
        class="refresh-btn"
        :disabled="loading"
        @click="loadUsers"
      >
        {{ loading ? "Loading..." : "Refresh" }}
      </button>
    </div>

    <div class="search-box">
      <span>🔍</span>
      <input
        v-model="search"
        type="text"
        placeholder="Search users"
        @keyup.enter="loadUsers"
      />
    </div>

    <nav class="tabs">
      <button
        v-for="role in roles"
        :key="role"
        :class="{ active: activeRole === role }"
        @click="
          activeRole = role;
          loadUsers();
        "
      >
        {{ role }}
      </button>
    </nav>

    <div v-if="errorMessage" class="error-box">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="empty">
      กำลังโหลดผู้ใช้...
    </div>

    <ul v-else class="user-list">
      <li
        v-for="user in filteredUsers"
        :key="user._id"
        class="user-row"
        :class="{
          selected: selectedUser?._id === user._id,
        }"
        @click="selectUser(user)"
      >
        <div class="avatar-circle">👤</div>

        <div class="user-body">
          <p class="user-name">
            {{ user.fullName || "Unknown User" }}
          </p>

          <p class="user-meta">
            {{ user.studentId || "-" }}
            ·
            {{ roleLabel(user.currentRole) }}
          </p>

          <p class="user-email">
            {{ user.email || "-" }}
          </p>
        </div>

        <span
          class="status-badge"
          :class="statusClass(user.accountStatus)"
        >
          {{ statusLabel(user.accountStatus) }}
        </span>
      </li>

      <li v-if="!filteredUsers.length" class="empty">
        No users match this filter.
      </li>
    </ul>

    <div v-if="selectedUser" class="card action-card">
      <p class="card-title">
        Manage Account
      </p>

      <p class="selected-name">
        {{ selectedUser.fullName }}
      </p>

      <p class="selected-meta">
        {{ selectedUser.email }}
      </p>

      <div class="action-row">
        <button
          class="action-btn suspend"
          :disabled="actionLoading"
          @click="statusAction('suspend')"
        >
          Suspend
        </button>

        <button
          class="action-btn warn"
          :disabled="actionLoading"
          @click="statusAction('warn')"
        >
          Warning
        </button>

        <button
          class="action-btn clear"
          :disabled="actionLoading"
          @click="statusAction('clear')"
        >
          Clear
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.users {
  padding: 16px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.section-title {
  margin: 0 0 8px;
  font-weight: 700;
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

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tabs button {
  flex: 1;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-weight: 600;
}

.tabs button.active {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  border-color: var(--color-primary);
}

.user-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  cursor: pointer;
}

.user-row.selected {
  border-color: var(--color-primary);
}

.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-body {
  flex: 1;
  min-width: 0;
}

.user-name {
  margin: 0;
  font-weight: 600;
  font-size: 14px;
}

.user-meta,
.user-email {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--color-text-muted);
}

.status-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 999px;
  color: white;
}

.status-badge.green {
  background: var(--color-green);
}

.status-badge.yellow {
  background: var(--color-primary);
  color: #3a2a05;
}

.status-badge.red {
  background: var(--color-red);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px;
}

.card-title {
  margin: 0 0 6px;
  font-weight: 700;
}

.selected-name {
  margin: 0;
  font-weight: 700;
}

.selected-meta {
  margin: 3px 0 12px;
  color: var(--color-text-muted);
  font-size: 12px;
}

.action-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  min-height: 42px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

.action-btn:disabled {
  opacity: 0.6;
}

.suspend {
  background: var(--color-red-bg);
  color: var(--color-red);
}

.warn {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
}

.clear {
  background: var(--color-bg);
}

.error-box {
  padding: 12px;
  background: var(--color-red-bg);
  color: var(--color-red);
  border-radius: 8px;
  margin-bottom: 12px;
}

.empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 20px;
}
</style>