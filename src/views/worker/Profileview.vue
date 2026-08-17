<script setup>
// FR-PROF-01: ดู/แก้ไขโปรไฟล์ (รูป ชื่อ เบอร์โทร LINE Facebook Instagram รหัสผ่าน)
// FR-PROF-02: ดู/แก้ไขที่อยู่สำหรับติดต่อ/จัดส่ง (ชื่อ ที่อยู่ เบอร์โทร)
// FR-PROF-03: แสดงคะแนนความน่าเชื่อถือปัจจุบันของผู้ใช้
// FR-REV-04: แสดงประวัติรีวิว เรียงล่าสุดก่อน
import { computed, onMounted, ref } from "vue";
import api from "../../services/api";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
const loading = ref(true);
const errorMsg = ref("");

/* ---------- รูปโปรไฟล์ ---------- */
const avatarInput = ref(null);
const avatarPreview = ref(null);
const uploadingAvatar = ref(false);

function pickAvatar() {
  avatarInput.value?.click();
}
async function onAvatarChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  // แสดง preview ทันทีระหว่างอัปโหลด
  const reader = new FileReader();
  reader.onload = () => (avatarPreview.value = reader.result);
  reader.readAsDataURL(file);

  const formData = new FormData();
  formData.append("avatar", file);

  uploadingAvatar.value = true;
  try {
    const { data } = await api.post("/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    avatarPreview.value = resolveUploadUrl(data.avatarUrl);
    auth.updateUser({ ...auth.user, avatarUrl: data.avatarUrl });
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "อัปโหลดรูปไม่สำเร็จ";
  } finally {
    uploadingAvatar.value = false;
  }
}

// avatarUrl จาก backend เป็น path สัมพัทธ์ (เช่น /uploads/avatars/...) ต้องต่อกับ base URL ของ API
function resolveUploadUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
  return apiBase.replace(/\/api\/?$/, "") + pathOrUrl;
}

/* ---------- ข้อมูลส่วนตัว ---------- */
const profile = ref({
  fullName: "",
  email: "",
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
  try {
    const { data } = await api.patch(`/users/${auth.user._id}`, {
      fullName: profileDraft.fullName,
      phone: profileDraft.phoneNumber,
      lineId: profileDraft.line,
      facebook: profileDraft.facebook,
      instagram: profileDraft.instagram,
      bankAccount: profileDraft.bankAccount,
    });
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
const passwordForm = ref({ current: "", next: "", confirm: "" });
async function submitPasswordChange() {
  if (!passwordForm.value.next || passwordForm.value.next !== passwordForm.value.confirm) {
    alert("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน");
    return;
  }
  try {
    await api.patch("/auth/password", {
      current: passwordForm.value.current,
      next: passwordForm.value.next,
    });
    alert("เปลี่ยนรหัสผ่านสำเร็จ");
    showPasswordModal.value = false;
    passwordForm.value = { current: "", next: "", confirm: "" };
  } catch (err) {
    alert(err.response?.data?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
  }
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

/* ---------- โหลดข้อมูลตอนเปิดหน้า ---------- */
function applyUserToProfile(user) {
  profile.value = {
    fullName: user.fullName || "",
    email: user.email,
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
  if (user.avatarUrl) avatarPreview.value = resolveUploadUrl(user.avatarUrl);
}

onMounted(async () => {
  try {
    const { data: me } = await api.get("/auth/me");
    auth.updateUser(me);
    applyUserToProfile(me);
    await loadReviews();
  } catch (err) {
    errorMsg.value = err.response?.data?.message || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="page">
    <!-- แถบด้านบน -->
    <header class="topbar">
      <button class="icon-btn" aria-label="เปิดเมนู">
        <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </button>
      <div class="brand">
        <span class="brand-icon">👥</span>
        <span class="brand-name">JangDi</span>
      </div>
      <RouterLink to="/worker/profile" class="avatar-btn" aria-label="โปรไฟล์ของฉัน">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
      </RouterLink>
    </header>

    <main class="content">
      <h1 class="page-title">Manage Profile</h1>

      <!-- รูปโปรไฟล์ -->
      <div class="avatar-section">
        <button class="avatar-large" @click="pickAvatar" aria-label="เปลี่ยนรูปโปรไฟล์">
          <img v-if="avatarPreview" :src="avatarPreview" alt="" />
          <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
        </button>
        <input ref="avatarInput" type="file" accept="image/*" class="hidden-input" @change="onAvatarChange" />
        <button class="link-btn" @click="pickAvatar">Change Profile</button>
      </div>

      <!-- ข้อมูลส่วนตัว -->
      <section class="card">
        <h2 class="section-title">Personal Information</h2>
        <div class="field-grid">
          <div class="field">
            <span class="field-label">Full Name</span>
            <input v-if="isEditingProfile" v-model="profileDraft.fullName" />
            <span v-else class="field-value">{{ profile.fullName }}</span>
          </div>
          <div class="field">
            <span class="field-label">Phone Number</span>
            <input v-if="isEditingProfile" v-model="profileDraft.phoneNumber" />
            <span v-else class="field-value">{{ profile.phoneNumber }}</span>
          </div>
          <div class="field">
            <span class="field-label">Email</span>
            <span class="field-value muted">{{ profile.email }}</span>
          </div>
          <div class="field">
            <span class="field-label">Line</span>
            <input v-if="isEditingProfile" v-model="profileDraft.line" />
            <span v-else class="field-value">{{ profile.line }}</span>
          </div>
          <div class="field">
            <span class="field-label">Password</span>
            <span class="field-value">••••••••</span>
          </div>
          <div class="field">
            <span class="field-label">Facebook</span>
            <input v-if="isEditingProfile" v-model="profileDraft.facebook" />
            <span v-else class="field-value">{{ profile.facebook }}</span>
          </div>
          <div class="field">
            <span class="field-label">Bank account</span>
            <template v-if="isEditingProfile">
              <input v-model="profileDraft.bankAccount.bankName" placeholder="ชื่อธนาคาร" />
              <input v-model="profileDraft.bankAccount.accountNumber" placeholder="เลขบัญชี" />
              <input v-model="profileDraft.bankAccount.accountHolderName" placeholder="ชื่อบัญชี" />
            </template>
            <span v-else class="field-value">
              {{ profile.bankAccount.bankName || "-" }}
              {{ profile.bankAccount.accountNumber ? `(${profile.bankAccount.accountNumber})` : "" }}
            </span>
          </div>
          <div class="field">
            <span class="field-label">Instagram</span>
            <input v-if="isEditingProfile" v-model="profileDraft.instagram" />
            <span v-else class="field-value">{{ profile.instagram }}</span>
          </div>
        </div>

        <div class="card-actions">
          <template v-if="isEditingProfile">
            <button class="btn-outline" @click="cancelEditProfile">ยกเลิก</button>
            <button class="btn-gold" @click="saveProfile">บันทึก</button>
          </template>
          <template v-else>
            <button class="btn-gold" @click="showPasswordModal = true">Change Password</button>
            <button class="btn-gold" @click="startEditProfile">Edit Profile</button>
          </template>
        </div>
      </section>

      <!-- ที่อยู่ -->
      <section class="card">
        <h2 class="section-title">Address Information</h2>
        <div class="field-stack">
          <div class="field">
            <span class="field-label">Full Name</span>
            <input v-if="isEditingAddress" v-model="addressDraft.fullName" />
            <span v-else class="field-value">{{ address.fullName }}</span>
          </div>
          <div class="field">
            <span class="field-label">Address</span>
            <textarea v-if="isEditingAddress" v-model="addressDraft.address" rows="2"></textarea>
            <span v-else class="field-value muted">{{ address.address || "-" }}</span>
          </div>
          <div class="field">
            <span class="field-label">Phone Number</span>
            <input v-if="isEditingAddress" v-model="addressDraft.phoneNumber" />
            <span v-else class="field-value">{{ address.phoneNumber }}</span>
          </div>
        </div>
        <div class="card-actions">
          <template v-if="isEditingAddress">
            <button class="btn-outline" @click="cancelEditAddress">ยกเลิก</button>
            <button class="btn-gold" @click="saveAddress">บันทึก</button>
          </template>
          <button v-else class="btn-gold" @click="startEditAddress">Edit Address</button>
        </div>
      </section>

      <!-- คะแนนความน่าเชื่อถือ / รีวิว -->
      <section class="card">
        <h2 class="section-title">Ratings</h2>
        <div class="rating-summary">
          <span class="rating-score">{{ averageRating }}</span>
          <span class="stars">
            <span v-for="n in 5" :key="n" :class="{ filled: n <= ratingStars }">★</span>
          </span>
          <span class="rating-count">จาก {{ reviewCount }} รีวิว</span>
        </div>
        <ul class="review-list">
          <li v-for="r in reviews" :key="r.id" class="review-item">
            <div class="review-head">
              <span class="reviewer">{{ r.reviewer }}</span>
              <span class="stars small">
                <span v-for="n in 5" :key="n" :class="{ filled: n <= r.rating }">★</span>
              </span>
            </div>
            <p class="review-comment">{{ r.comment }}</p>
          </li>
        </ul>
      </section>
    </main>

    <!-- Modal เปลี่ยนรหัสผ่าน -->
    <Transition name="fade">
      <div v-if="showPasswordModal" class="modal-backdrop" @click.self="showPasswordModal = false">
        <div class="modal">
          <h3>Change Password</h3>
          <label>รหัสผ่านปัจจุบัน</label>
          <input v-model="passwordForm.current" type="password" />
          <label>รหัสผ่านใหม่</label>
          <input v-model="passwordForm.next" type="password" />
          <label>ยืนยันรหัสผ่านใหม่</label>
          <input v-model="passwordForm.confirm" type="password" />
          <div class="modal-actions">
            <button class="btn-outline" @click="showPasswordModal = false">ยกเลิก</button>
            <button class="btn-gold" @click="submitPasswordChange">บันทึก</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- แถบล่าง -->
    <footer class="bottom-nav">
      <button class="nav-item">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span>ถาม</span>
      </button>
      <RouterLink to="/worker" class="nav-item">
        <svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>
        <span>หน้าแรก</span>
      </RouterLink>
      <button class="nav-item">
        <svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 21a2 2 0 004 0" /></svg>
        <span class="badge">4</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
.page { position: relative; min-height: 100vh; padding-bottom: 76px; background: #f0f0f0; }
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; background: #fff; position: sticky; top: 0; z-index: 10;
  border-bottom: 1px solid #eee;
}
.icon-btn, .avatar-btn {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border: none; background: transparent;
  border-radius: 50%; color: #111; cursor: pointer;
}
.avatar-btn { border: 1px solid #111; }
.brand { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 18px; }
.brand-icon { font-size: 18px; }

.content { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.page-title { margin: 0; font-size: 17px; font-weight: 700; color: #111; }

.avatar-section { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px 0 4px; }
.avatar-large {
  width: 96px; height: 96px; border-radius: 50%; border: 3px solid #111;
  background: #fff; display: flex; align-items: center; justify-content: center;
  color: #111; cursor: pointer; overflow: hidden; padding: 0;
}
.avatar-large svg { width: 56px; height: 56px; }
.avatar-large img { width: 100%; height: 100%; object-fit: cover; }
.hidden-input { display: none; }
.link-btn { border: none; background: transparent; color: #333; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: underline; }

.card { background: #fff; border-radius: 12px; padding: 14px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); }
.section-title { margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #111; }

.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
.field-stack { display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.field-label { font-size: 11px; color: #999; }
.field-value { font-size: 13px; color: #111; font-weight: 600; word-break: break-word; }
.field-value.muted { color: #999; font-weight: 400; }
.field input, .field textarea {
  border: 1px solid #ddd; border-radius: 6px; padding: 6px 8px;
  font-size: 13px; min-height: 36px; font-family: inherit;
}

.card-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid #eee; }
.btn-gold, .btn-outline {
  min-height: 38px; padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.btn-gold { background: #ffc93c; border: none; color: #111; }
.btn-outline { background: #fff; border: 1px solid #ccc; color: #333; }

.rating-summary { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.rating-score { font-size: 20px; font-weight: 800; color: #111; }
.stars { color: #ddd; letter-spacing: 1px; }
.stars .filled { color: #ffc93c; }
.stars.small { font-size: 12px; }
.rating-count { font-size: 12px; color: #999; }
.review-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.review-item { padding-top: 10px; border-top: 1px solid #f2f2f2; }
.review-item:first-child { padding-top: 0; border-top: none; }
.review-head { display: flex; align-items: center; justify-content: space-between; }
.reviewer { font-size: 13px; font-weight: 700; color: #111; }
.review-comment { margin: 4px 0 0; font-size: 12px; color: #555; }

.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 30; padding: 20px;
}
.modal { background: #fff; border-radius: 12px; padding: 18px; width: 100%; max-width: 340px; }
.modal h3 { margin: 0 0 12px; font-size: 16px; }
.modal label { display: block; margin-top: 10px; font-size: 12px; color: #666; }
.modal input { width: 100%; min-height: 40px; border: 1px solid #ccc; border-radius: 8px; padding: 8px 10px; margin-top: 4px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.bottom-nav {
  position: fixed; left: 0; right: 0; bottom: 0; max-width: 480px; margin: 0 auto;
  display: flex; justify-content: space-around; align-items: center;
  background: #fff; border-top: 1px solid #eee; padding: 6px 0; z-index: 6;
}
.nav-item {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px;
  min-height: 44px; min-width: 44px; border: none; background: transparent;
  color: #333; font-size: 11px; text-decoration: none; cursor: pointer;
}
.badge {
  position: absolute; top: -2px; right: 8px; background: #e11d48; color: #fff;
  font-size: 10px; font-weight: 700; min-width: 16px; height: 16px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; padding: 0 3px;
}
</style>