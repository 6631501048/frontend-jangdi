<script setup>
// FR-PROF-01: ดู/แก้ไขโปรไฟล์ (รูป ชื่อ เบอร์โทร LINE Facebook Instagram รหัสผ่าน)
// FR-PROF-02: ดู/แก้ไขที่อยู่สำหรับติดต่อ/จัดส่ง (ชื่อ ที่อยู่ เบอร์โทร)
// FR-PROF-03: แสดงคะแนนความน่าเชื่อถือปัจจุบันของผู้ใช้
// FR-REV-04: แสดงประวัติรีวิว เรียงล่าสุดก่อน
//
// สมาชิกใช้ /profile; ผู้ดูแลใช้ /admin/profile ภายใน AdminLayout และแสดงเฉพาะข้อมูลบัญชี
import { computed, onMounted, ref } from "vue";
import api from "../services/api";
import { resolveBackendAssetUrl } from "../services/backendAssets";
import { useAuthStore } from "../stores/auth";
import UserAvatar from "../components/UserAvatar.vue";
import AppTopBar from "../components/AppTopBar.vue";
import AppRoleDrawer from "../components/AppRoleDrawer.vue";
import { useDialogFocus } from "../composables/useDialogFocus";
import { passwordValidationMessage } from '../services/passwordRecovery';

const auth = useAuthStore();
const isAdmin = computed(() => !!auth.user?.isAdmin);
const loading = ref(true);
const profileLoaded = ref(false);
const drawerOpen = ref(false);
const errorMsg = ref("");

/* ---------- รูปโปรไฟล์ ---------- */
const avatarInput = ref(null);
const avatarPreview = ref(null);
const avatarImageFailed = ref(false);
const uploadingAvatar = ref(false);

function pickAvatar() {
  avatarInput.value?.click();
}
async function onAvatarChange(e) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file || uploadingAvatar.value) return;
  errorMsg.value = "";
  if (!file.type.startsWith("image/")) {
    errorMsg.value = "กรุณาเลือกไฟล์รูปภาพ";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    errorMsg.value = "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 5 MB";
    return;
  }
  // Keep the saved avatar visible until the server confirms the upload.
  const formData = new FormData();
  formData.append("avatar", file);

  uploadingAvatar.value = true;
  try {
    const { data } = await api.post("/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    avatarPreview.value = resolveUploadUrl(data.avatarUrl);
    avatarImageFailed.value = false;
    auth.updateUser({ ...auth.user, avatarUrl: data.avatarUrl });
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "อัปโหลดรูปไม่สำเร็จ";
  } finally {
    uploadingAvatar.value = false;
  }
}

// avatarUrl จาก backend เป็น path สัมพัทธ์ (เช่น /uploads/avatars/...) ต้องต่อกับ base URL ของ API
function resolveUploadUrl(pathOrUrl) {
  return resolveBackendAssetUrl(pathOrUrl);
}

/* ---------- ข้อมูลส่วนตัว ---------- */
const profile = ref({
  fullName: "",
  email: "",
  studentId: "",
  shortDescription: "",
  bankAccount: { bankName: "", accountNumber: "", accountHolderName: "" },
  phoneNumber: "",
  line: "",
  facebook: "",
  instagram: "",
});
const isEditingProfile = ref(false);
let profileDraft = null;

function startEditProfile() {
  profileDraft = { ...profile.value, bankAccount: { ...profile.value.bankAccount } };
  isEditingProfile.value = true;
}
async function saveProfile() {
  errorMsg.value = '';
  try {
    const changes = {
      fullName: profileDraft.fullName,
      phone: profileDraft.phoneNumber,
    };
    if (!isAdmin.value) Object.assign(changes, {
      lineId: profileDraft.line,
      facebook: profileDraft.facebook,
      instagram: profileDraft.instagram,
      bankAccount: profileDraft.bankAccount,
      shortDescription: profileDraft.shortDescription,
    });
    const { data } = await api.patch(`/users/${auth.user._id}`, changes);
    auth.updateUser(data.user);
    applyUserToProfile(data.user);
    isEditingProfile.value = false;
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "บันทึกโปรไฟล์ไม่สำเร็จ";
  }
}
function cancelEditProfile() {
  isEditingProfile.value = false;
}

/* ---------- เปลี่ยนรหัสผ่าน ---------- */
const showPasswordModal = ref(false);
const passwordPanel = ref(null);
const { onKeydown: passwordKeydown } = useDialogFocus(() => showPasswordModal.value, passwordPanel, closePasswordModal);
const passwordForm = ref({ current: "", next: "", confirm: "" });
const savingPassword = ref(false);
const passwordError = ref(''), passwordSuccess = ref('');
function openPasswordModal() {
  passwordError.value = ''; passwordSuccess.value = '';
  passwordForm.value = { current: '', next: '', confirm: '' };
  showPasswordModal.value = true;
}
function closePasswordModal() { if (!savingPassword.value) showPasswordModal.value = false; }
async function submitPasswordChange() {
  if (savingPassword.value) return;
  passwordError.value = '';
  const validation = passwordValidationMessage(passwordForm.value.next, passwordForm.value.confirm);
  if (validation) { passwordError.value = validation; return; }
  if (!passwordForm.value.current) { passwordError.value = 'กรุณากรอกรหัสผ่านปัจจุบัน'; return; }
  savingPassword.value = true;
  try {
    const { data } = await api.patch("/auth/password", {
      current: passwordForm.value.current,
      next: passwordForm.value.next,
    }, { keepSessionOnUnauthorized: true });
    if (data.token) auth.setSession(data.token, auth.user);
    passwordSuccess.value = 'เปลี่ยนรหัสผ่านสำเร็จ';
    showPasswordModal.value = false;
    passwordForm.value = { current: "", next: "", confirm: "" };
  } catch (err) {
    passwordError.value = err.response?.data?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ";
  } finally { savingPassword.value = false; }
}

/* ---------- ที่อยู่ ---------- */
const address = ref({ fullName: "", address: "", phoneNumber: "" });
const isEditingAddress = ref(false);
let addressDraft = null;

function startEditAddress() {
  addressDraft = { ...address.value };
  isEditingAddress.value = true;
}
async function saveAddress() {
  errorMsg.value = '';
  try {
    const { data } = await api.patch(`/users/${auth.user._id}`, {
      contactAddress: {
        name: addressDraft.fullName,
        address: addressDraft.address,
        phone: addressDraft.phoneNumber,
      },
    });
    auth.updateUser(data.user);
    applyUserToProfile(data.user);
    isEditingAddress.value = false;
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "บันทึกที่อยู่ไม่สำเร็จ";
  }
}
function cancelEditAddress() {
  isEditingAddress.value = false;
}

/* ---------- คะแนนความน่าเชื่อถือ / รีวิว ---------- */
const averageRating = ref(0);
const reviewCount = ref(0);
const reviews = ref([]);
const ratingStars = computed(() => Math.round(averageRating.value));

async function loadReviews() {
  const { data } = await api.get(`/users/${auth.user._id}/reviews`);
  averageRating.value = data.averageRating || 0;
  reviewCount.value = data.reviewCount || 0;
  reviews.value = data.reviews.map((r) => ({
    id: r._id,
    reviewer: r.fromUser?.fullName || "ผู้ใช้",
    rating: r.rating,
    comment: r.comment,
    date: new Date(r.createdAt),
  }));
}

/* ---------- ประวัติโพสต์ (FR-PROF-04) ---------- */
const myJobs = ref([]);
const myServicePosts = ref([]);
const postsError = ref("");

async function loadPosts() {
  postsError.value = "";
  try {
    const { data } = await api.get(`/users/${auth.user._id}/posts`);
    myJobs.value = data.jobs || [];
    myServicePosts.value = data.servicePosts || [];
  } catch (err) {
    postsError.value = err.response?.data?.message || "โหลดประวัติโพสต์ไม่สำเร็จ";
  }
}
function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "-";
}

/* ---------- โหลดข้อมูลตอนเปิดหน้า ---------- */
function applyUserToProfile(user) {
  profile.value = {
    fullName: user.fullName || "",
    email: user.email,
    studentId: user.studentId || "",
    shortDescription: user.shortDescription || "",
    bankAccount: user.bankAccount || { bankName: "", accountNumber: "", accountHolderName: "" },
    phoneNumber: user.phone || "",
    line: user.lineId || "",
    facebook: user.facebook || "",
    instagram: user.instagram || "",
  };
  address.value = {
    fullName: user.contactAddress?.name || user.fullName || "",
    address: user.contactAddress?.address || "",
    phoneNumber: user.contactAddress?.phone || user.phone || "",
  };
  avatarPreview.value = resolveUploadUrl(user.avatarUrl);
  avatarImageFailed.value = false;
}

async function loadProfile() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const { data: me } = await api.get("/auth/me");
    auth.updateUser(me);
    applyUserToProfile(me);
    profileLoaded.value = true;
    if (!isAdmin.value) {
      await loadReviews();
      await loadPosts();
    }
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}
onMounted(loadProfile);
</script>

<template>
  <div class="page jd-page" :class="{ 'admin-profile': isAdmin }">
    <!-- แถบด้านบน -->
    <AppTopBar v-if="!isAdmin" role-label="" :show-notifications="false" @menu="drawerOpen = true" />
    <AppRoleDrawer v-if="!isAdmin" v-model="drawerOpen" />

    <component :is="isAdmin ? 'section' : 'main'" class="content">
      <h1 class="page-title">{{ isAdmin ? 'โปรไฟล์ผู้ดูแลระบบ' : 'จัดการโปรไฟล์' }}</h1>
      <p v-if="passwordSuccess" class="password-success profile-state" role="status">{{ passwordSuccess }}</p>
      <p v-if="loading" class="profile-state" role="status">กำลังโหลดข้อมูลโปรไฟล์…</p>
      <p v-if="errorMsg" class="profile-state profile-error" role="alert">{{ errorMsg }} <button v-if="!loading && !isEditingProfile && !isEditingAddress" type="button" class="btn-outline" @click="loadProfile">ลองอีกครั้ง</button></p>

      <!-- รูปโปรไฟล์ -->
      <div class="avatar-section">
        <button class="avatar-large" :disabled="loading || !profileLoaded || uploadingAvatar" @click="pickAvatar" aria-label="เปลี่ยนรูปโปรไฟล์">
          <img v-if="avatarPreview && !avatarImageFailed" :src="avatarPreview" alt="" @error="avatarImageFailed = true" />
          <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
        </button>
        <input ref="avatarInput" type="file" accept="image/*" class="hidden-input" @change="onAvatarChange" />
        <button class="link-btn" :disabled="loading || !profileLoaded || uploadingAvatar" @click="pickAvatar">{{ uploadingAvatar ? 'กำลังอัปโหลด…' : 'เปลี่ยนรูปโปรไฟล์' }}</button>
      </div>

      <!-- ข้อมูลส่วนตัว -->
      <section class="card">
        <h2 class="section-title">ข้อมูลส่วนตัว</h2>
        <div class="field-grid">
          <div class="field">
  <span class="field-label">ชื่อ–นามสกุล</span>
  <input aria-label="ชื่อ–นามสกุล" v-if="isEditingProfile" v-model="profileDraft.fullName" />
  <span v-else class="field-value">{{ profile.fullName }}</span>
</div>

<div v-if="!isAdmin" class="field">
  <span class="field-label">รหัสนักศึกษา</span>
  <span class="field-value">{{ profile.studentId || "-" }}</span>
</div>

<div v-if="!isAdmin" class="field">
  <span class="field-label">แนะนำตัว</span>
  <textarea aria-label="แนะนำตัว"
    v-if="isEditingProfile"
    v-model="profileDraft.shortDescription"
    maxlength="300"
    rows="2"
    placeholder="แนะนำตัวสั้น ๆ"
  ></textarea>
  <span v-else class="field-value">
    {{ profile.shortDescription || "-" }}
  </span>
</div>

<div class="field">
  <span class="field-label">เบอร์โทรศัพท์</span>
  <input aria-label="เบอร์โทรศัพท์" v-if="isEditingProfile" v-model="profileDraft.phoneNumber" />
  <span v-else class="field-value">{{ profile.phoneNumber }}</span>
</div>
          <div class="field">
            <span class="field-label">อีเมล</span>
            <span class="field-value muted">{{ profile.email }}</span>
          </div>
          <div v-if="!isAdmin" class="field">
            <span class="field-label">Line</span>
            <input aria-label="Line" v-if="isEditingProfile" v-model="profileDraft.line" />
            <span v-else class="field-value">{{ profile.line }}</span>
          </div>
          <div class="field">
            <span class="field-label">รหัสผ่าน</span>
            <span class="field-value">••••••••</span>
          </div>
          <div v-if="!isAdmin" class="field">
            <span class="field-label">Facebook</span>
            <input aria-label="Facebook" v-if="isEditingProfile" v-model="profileDraft.facebook" />
            <span v-else class="field-value">{{ profile.facebook }}</span>
          </div>
          <div v-if="!isAdmin" class="field">
            <span class="field-label">บัญชีธนาคาร</span>
            <template v-if="isEditingProfile">
              <input aria-label="ชื่อธนาคาร" v-model="profileDraft.bankAccount.bankName" placeholder="ชื่อธนาคาร" />
              <input aria-label="เลขบัญชีธนาคาร" v-model="profileDraft.bankAccount.accountNumber" placeholder="เลขบัญชี" inputmode="numeric" />
              <input aria-label="ชื่อเจ้าของบัญชี" v-model="profileDraft.bankAccount.accountHolderName" placeholder="ชื่อบัญชี" />
            </template>
            <span v-else class="field-value">
              {{ profile.bankAccount.bankName || "-" }}
              {{ profile.bankAccount.accountNumber ? `(${profile.bankAccount.accountNumber})` : "" }}
            </span>
          </div>
          <div v-if="!isAdmin" class="field">
            <span class="field-label">Instagram</span>
            <input aria-label="Instagram" v-if="isEditingProfile" v-model="profileDraft.instagram" />
            <span v-else class="field-value">{{ profile.instagram }}</span>
          </div>
        </div>

        <div class="card-actions">
          <template v-if="isEditingProfile">
            <button class="btn-outline" @click="cancelEditProfile">ยกเลิก</button>
            <button class="btn-gold" @click="saveProfile">บันทึก</button>
          </template>
          <template v-else>
            <button class="btn-gold" :disabled="loading || !profileLoaded" @click="openPasswordModal">เปลี่ยนรหัสผ่าน</button>
            <button class="btn-gold" :disabled="loading || !profileLoaded" @click="startEditProfile">แก้ไขข้อมูลส่วนตัว</button>
          </template>
        </div>
      </section>

      <!-- ที่อยู่ -->
      <section v-if="!isAdmin" class="card">
        <h2 class="section-title">ข้อมูลที่อยู่</h2>
        <div class="field-stack">
          <div class="field">
            <span class="field-label">ชื่อ–นามสกุล</span>
            <input aria-label="ชื่อ–นามสกุล" v-if="isEditingAddress" v-model="addressDraft.fullName" />
            <span v-else class="field-value">{{ address.fullName }}</span>
          </div>
          <div class="field">
            <span class="field-label">ที่อยู่</span>
            <textarea aria-label="ที่อยู่" v-if="isEditingAddress" v-model="addressDraft.address" rows="2"></textarea>
            <span v-else class="field-value muted">{{ address.address || "-" }}</span>
          </div>
          <div class="field">
            <span class="field-label">เบอร์โทรศัพท์</span>
            <input aria-label="เบอร์โทรศัพท์" v-if="isEditingAddress" v-model="addressDraft.phoneNumber" />
            <span v-else class="field-value">{{ address.phoneNumber }}</span>
          </div>
        </div>
        <div class="card-actions">
          <template v-if="isEditingAddress">
            <button class="btn-outline" @click="cancelEditAddress">ยกเลิก</button>
            <button class="btn-gold" @click="saveAddress">บันทึก</button>
          </template>
          <button v-else class="btn-gold" :disabled="loading || !profileLoaded" @click="startEditAddress">แก้ไขที่อยู่</button>
        </div>
      </section>

      <!-- คะแนนความน่าเชื่อถือ / รีวิว -->
      <section v-if="!isAdmin" class="card">
        <h2 class="section-title">คะแนนและรีวิว</h2>
        <div class="rating-summary">
          <span class="rating-score">{{ averageRating }}</span>
          <span class="stars">
            <span v-for="n in 5" :key="n" :class="{ filled: n <= ratingStars }">★</span>
          </span>
          <span class="rating-count">จาก {{ reviewCount }} รีวิว</span>
        </div>
        <ul class="review-list">
          <li v-for="r in reviews.slice(0, 3)" :key="r.id" class="review-item">
            <div class="review-head">
              <span class="reviewer">{{ r.reviewer }}</span>
              <span class="stars small">
                <span v-for="n in 5" :key="n" :class="{ filled: n <= r.rating }">★</span>
              </span>
            </div>
            <p class="review-comment">{{ r.comment }}</p>
          </li>
        </ul>
        <RouterLink to="/profile/ratings" class="show-more-btn">ดูรีวิวทั้งหมด</RouterLink>
      </section>

      <!-- ประวัติโพสต์ (FR-PROF-04) -->
      <section v-if="!isAdmin" class="card">
        <h2 class="section-title">ประวัติประกาศ</h2>
        <p v-if="postsError" class="posts-empty">{{ postsError }}</p>
        <template v-else>
          <h3 class="posts-subtitle role-band hirer-band">งานที่ประกาศ (Hirer)</h3>
          <p v-if="!myJobs.length" class="posts-empty">ยังไม่มีประวัติการประกาศงาน</p>
          <ul v-else class="post-list">
            <li v-for="j in myJobs.slice(0, 3)" :key="j._id" class="post-item">
              <div class="post-head">
                <span class="post-title">{{ j.title }}</span>
              </div>
              <div class="post-meta">{{ j.category }} · {{ j.price }} บาท · {{ formatDate(j.createdAt) }}</div>
              <div v-if="j.status === 'rejected' && j.rejectionReason" class="post-reason">{{ j.rejectionReason }}</div>
            </li>
          </ul>

          <h3 class="posts-subtitle role-band worker-band">บริการที่เสนอ (Worker)</h3>
          <p v-if="!myServicePosts.length" class="posts-empty">ยังไม่มีประวัติการเสนอบริการ</p>
          <ul v-else class="post-list">
            <li v-for="sp in myServicePosts.slice(0, 3)" :key="sp._id" class="post-item">
              <div class="post-head">
                <span class="post-title">{{ sp.title }}</span>
              </div>
              <div class="post-meta">{{ sp.category }} · {{ sp.fee }} บาท · {{ formatDate(sp.createdAt) }}</div>
            </li>
          </ul>
          <RouterLink to="/profile/history" class="show-more-btn">ดูประวัติทั้งหมด</RouterLink>
        </template>
      </section>
    </component>

    <!-- Modal เปลี่ยนรหัสผ่าน -->
    <Transition name="fade">
      <div v-if="showPasswordModal" class="modal-backdrop" @click.self="closePasswordModal">
        <div ref="passwordPanel" class="modal" role="dialog" aria-modal="true" aria-labelledby="password-title" tabindex="-1" @keydown="passwordKeydown">
          <h3 id="password-title">เปลี่ยนรหัสผ่าน</h3>
          <form @submit.prevent="submitPasswordChange" :aria-busy="savingPassword">
          <label>รหัสผ่านปัจจุบัน</label>
          <input aria-label="รหัสผ่านปัจจุบัน" v-model="passwordForm.current" type="password" autocomplete="current-password" :disabled="savingPassword" />
          <label>รหัสผ่านใหม่</label>
          <input aria-label="รหัสผ่านใหม่" v-model="passwordForm.next" type="password" autocomplete="new-password" :disabled="savingPassword" />
          <label>ยืนยันรหัสผ่านใหม่</label>
          <input aria-label="ยืนยันรหัสผ่านใหม่" v-model="passwordForm.confirm" type="password" autocomplete="new-password" :disabled="savingPassword" />
          <p v-if="passwordError" class="password-error" role="alert">{{ passwordError }}</p>
          <RouterLink class="password-recovery-link" :to="{ name: 'forgot-password' }">ลืมรหัสผ่าน / ยังไม่ได้ตั้งรหัสผ่าน?</RouterLink>
          <div class="modal-actions">
            <button type="button" class="btn-outline" :disabled="savingPassword" @click="closePasswordModal">ยกเลิก</button>
            <button type="submit" class="btn-gold" :disabled="savingPassword">{{ savingPassword ? 'กำลังบันทึก…' : 'บันทึก' }}</button>
          </div>
          </form>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.password-error { color:var(--jd-danger); font-size:.875rem; overflow-wrap:anywhere; }
.profile-state.password-success { color:var(--jd-success); background:var(--jd-success-soft); }
.password-recovery-link { display:inline-block; width:fit-content; max-width:100%; margin-top:12px; color:var(--jd-brand); font-size:.875rem; text-underline-offset:4px; }
.profile-state { padding:14px 16px; border-radius:12px; background:var(--jd-subtle); color:var(--jd-muted); font-size:.875rem; }
.profile-error { background:var(--jd-danger-soft); color:var(--jd-danger); overflow-wrap:anywhere; }
.profile-error button { margin:8px; }
.page { position: relative; min-height: 100vh; padding-bottom: 24px; background: var(--jd-canvas); }
.page.admin-profile { min-height:0; padding-bottom:0; }
.admin-profile .content { padding:0; }
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; background: var(--jd-surface); position: sticky; top: 0; z-index: 10;
  border-bottom: 1px solid var(--jd-line);
}
.icon-btn, .avatar-btn {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border: none; background: transparent;
  border-radius: 50%; color: var(--jd-ink); cursor: pointer;
}
.avatar-btn { border: 1px solid var(--jd-ink); }
.brand { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 1.125rem; }
.brand-icon { font-size: 1.125rem; }

.content { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.page-title { margin: 0; font-size: 1.0625rem; font-weight: 700; color: var(--jd-ink); }

.avatar-section { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px 0 4px; }
.avatar-large {
  width: 96px; height: 96px; border-radius: 50%; border: 3px solid var(--jd-ink);
  background: var(--jd-surface); display: flex; align-items: center; justify-content: center;
  color: var(--jd-ink); cursor: pointer; overflow: hidden; padding: 0;
}
.avatar-large svg { width: 56px; height: 56px; }
.avatar-large img { width: 100%; height: 100%; object-fit: cover; }
.hidden-input { display: none; }
.link-btn { border: none; background: transparent; color: var(--jd-ink); font-size: 0.875rem; font-weight: 600; cursor: pointer; text-decoration: underline; }

.card { background: var(--jd-surface); border-radius: 12px; padding: 14px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }
.section-title { margin: 0 0 12px; font-size: 0.875rem; font-weight: 700; color: var(--jd-ink); }

.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
.field-stack { display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.field-label { font-size: 0.875rem; color: var(--jd-muted); }
.field-value { font-size: 0.875rem; color: var(--jd-ink); font-weight: 600; word-break: break-word; }
.field-value.muted { color: var(--jd-muted); font-weight: 400; }
.field input, .field textarea {
  border: 1px solid var(--jd-input-border); border-radius: 6px; padding: 6px 8px;
  font-size: 0.875rem; min-height: 44px; font-family: inherit;
}

.card-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--jd-line); }
.btn-gold, .btn-outline {
  min-height: 44px; padding: 0 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 700; cursor: pointer;
}
.btn-gold { background: var(--jd-accent); border: none; color: var(--jd-ink); }
.btn-outline { background: var(--jd-surface); border: 1px solid var(--jd-input-border); color: var(--jd-ink); }

.rating-summary { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.rating-score { font-size: 1.25rem; font-weight: 800; color: var(--jd-ink); }
.stars { color: var(--jd-input-border); letter-spacing: 1px; }
.stars .filled { color: var(--jd-warning); }
.stars.small { font-size: 0.875rem; }
.rating-count { font-size: 0.875rem; color: var(--jd-muted); }
.review-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.review-item { padding-top: 10px; border-top: 1px solid var(--jd-subtle); }
.review-item:first-child { padding-top: 0; border-top: none; }
.posts-subtitle { margin: 12px 0 6px; font-size: 0.875rem; font-weight: 600; }
.posts-subtitle:first-of-type { margin-top: 0; }
.role-band { padding: 9px 11px; border-radius: 8px; }
.hirer-band { background: var(--jd-accent-soft); color: #805500; border-left: 4px solid #f0b429; }
.worker-band { background: #eaf3ff; color: #245b91; border-left: 4px solid #5b9bd5; }
.posts-empty { margin: 0 0 8px; font-size: 0.875rem; color: var(--jd-muted); }
.post-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.post-item { padding-top: 10px; border-top: 1px solid var(--jd-subtle); }
.post-item:first-child { padding-top: 0; border-top: none; }
.post-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.post-title { font-size: 0.875rem; font-weight: 600; }
.post-meta { margin-top: 2px; font-size: 0.875rem; color: var(--jd-muted); }
.post-reason { margin-top: 4px; font-size: 0.875rem; color: #b91c1c; }
.review-head { display: flex; align-items: center; justify-content: space-between; }
.reviewer { font-size: 0.875rem; font-weight: 700; color: var(--jd-ink); }
.review-comment { margin: 4px 0 0; font-size: 0.875rem; color: var(--jd-muted); }
.show-more-btn { display: block; width: fit-content; margin: 12px auto 0; padding: 7px 12px; border: 1px solid var(--jd-line); border-radius: 8px; background: var(--jd-surface); color: var(--jd-warning); font-size: 0.875rem; font-weight: 700; text-align: center; cursor: pointer; }

.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 30; padding: 20px;
}
.modal { background: var(--jd-surface); border-radius: 12px; padding: 18px; width: 100%; max-width: 340px; }
.modal h3 { margin: 0 0 12px; font-size: 1rem; }
.modal label { display: block; margin-top: 10px; font-size: 0.875rem; color: var(--jd-muted); }
.modal input { width: 100%; min-height: 44px; border: 1px solid var(--jd-input-border); border-radius: 8px; padding: 8px 10px; margin-top: 4px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

</style>


