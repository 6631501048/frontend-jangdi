<script setup>
import { computed, onMounted, ref } from "vue";
import api from "../../services/api";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();

const loading = ref(true);
const savingProfile = ref(false);
const savingAddress = ref(false);

const errorMsg = ref("");
const successMsg = ref("");

/* =====================================================
   HIRER NAVBAR / DRAWER
===================================================== */

const drawerOpen = ref(false);

const drawerItems = [
  { label: "Home", to: "/hirer" },
  { label: "My Job", to: "/hirer/my-jobs" },
  { label: "Payment", to: "/hirer/payment" },
];

function switchRole() {
  drawerOpen.value = false;

  // TODO:
  // เรียก API สำหรับเปลี่ยน role
  alert("TODO: สลับบทบาทเป็นผู้รับจ้าง");
}

function goItem(item) {
  drawerOpen.value = false;

  if (!item.to) {
    alert(`TODO: หน้า "${item.label}" ยังไม่ได้พัฒนา`);
  }
}

function logout() {
  auth.logout();
  drawerOpen.value = false;
}

/* =====================================================
   PROFILE IMAGE
===================================================== */

const avatarInput = ref(null);
const avatarPreview = ref(null);
const uploadingAvatar = ref(false);

function pickAvatar() {
  avatarInput.value?.click();
}

async function onAvatarChange(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  // แสดง preview ก่อน
  const reader = new FileReader();

  reader.onload = () => {
    avatarPreview.value = reader.result;
  };

  reader.readAsDataURL(file);

  const formData = new FormData();

  formData.append("avatar", file);

  uploadingAvatar.value = true;
  errorMsg.value = "";

  try {
    const { data } = await api.post(
      "/users/me/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    avatarPreview.value = resolveUploadUrl(
      data.avatarUrl
    );

    auth.updateUser({
      ...auth.user,
      avatarUrl: data.avatarUrl,
    });

    showSuccess("เปลี่ยนรูปโปรไฟล์สำเร็จ");
  } catch (err) {
    errorMsg.value =
      err.response?.data?.message ||
      "อัปโหลดรูปไม่สำเร็จ";
  } finally {
    uploadingAvatar.value = false;

    // reset input เพื่อให้เลือกไฟล์เดิมได้อีกครั้ง
    event.target.value = "";
  }
}

function resolveUploadUrl(pathOrUrl) {
  if (!pathOrUrl) return null;

  if (pathOrUrl.startsWith("http")) {
    return pathOrUrl;
  }

  const apiBase =
    import.meta.env.VITE_API_BASE_URL ||
    "/api";

  return (
    apiBase.replace(/\/api\/?$/, "") +
    pathOrUrl
  );
}

/* =====================================================
   PERSONAL INFORMATION
===================================================== */

const profile = ref({
  fullName: "",
  email: "",
  phoneNumber: "",
  line: "",
  facebook: "",
  instagram: "",

  bankAccount: {
    bankName: "",
    accountNumber: "",
    accountHolderName: "",
  },
});

const profileDraft = ref(null);

const isEditingProfile = ref(false);

function startEditProfile() {
  profileDraft.value = {
    fullName: profile.value.fullName,
    phoneNumber: profile.value.phoneNumber,
    line: profile.value.line,
    facebook: profile.value.facebook,
    instagram: profile.value.instagram,

    bankAccount: {
      bankName:
        profile.value.bankAccount.bankName,

      accountNumber:
        profile.value.bankAccount.accountNumber,

      accountHolderName:
        profile.value.bankAccount
          .accountHolderName,
    },
  };

  isEditingProfile.value = true;

  errorMsg.value = "";
  successMsg.value = "";
}

function cancelEditProfile() {
  isEditingProfile.value = false;
  profileDraft.value = null;
  errorMsg.value = "";
}

async function saveProfile() {
  if (!profileDraft.value) return;

  savingProfile.value = true;

  errorMsg.value = "";
  successMsg.value = "";

  try {
    const { data } = await api.patch(
      `/users/${auth.user._id}`,
      {
        fullName:
          profileDraft.value.fullName,

        phone:
          profileDraft.value.phoneNumber,

        lineId:
          profileDraft.value.line,

        facebook:
          profileDraft.value.facebook,

        instagram:
          profileDraft.value.instagram,

        bankAccount: {
          bankName:
            profileDraft.value.bankAccount
              .bankName,

          accountNumber:
            profileDraft.value.bankAccount
              .accountNumber,

          accountHolderName:
            profileDraft.value.bankAccount
              .accountHolderName,
        },
      }
    );

    auth.updateUser(data.user);

    applyUserToProfile(data.user);

    isEditingProfile.value = false;
    profileDraft.value = null;

    showSuccess(
      "บันทึกข้อมูลโปรไฟล์สำเร็จ"
    );
  } catch (err) {
    errorMsg.value =
      err.response?.data?.message ||
      "บันทึกโปรไฟล์ไม่สำเร็จ";
  } finally {
    savingProfile.value = false;
  }
}

/* =====================================================
   CHANGE PASSWORD
===================================================== */

const showPasswordModal = ref(false);

const passwordForm = ref({
  current: "",
  next: "",
  confirm: "",
});

function openPasswordModal() {
  passwordForm.value = {
    current: "",
    next: "",
    confirm: "",
  };

  errorMsg.value = "";

  showPasswordModal.value = true;
}

function closePasswordModal() {
  showPasswordModal.value = false;
}

async function submitPasswordChange() {
  errorMsg.value = "";

  if (!passwordForm.value.current) {
    errorMsg.value =
      "กรุณากรอกรหัสผ่านปัจจุบัน";

    return;
  }

  if (!passwordForm.value.next) {
    errorMsg.value =
      "กรุณากรอกรหัสผ่านใหม่";

    return;
  }

  if (
    passwordForm.value.next !==
    passwordForm.value.confirm
  ) {
    errorMsg.value =
      "รหัสผ่านใหม่และการยืนยันไม่ตรงกัน";

    return;
  }

  try {
    await api.patch(
      "/auth/password",
      {
        current:
          passwordForm.value.current,

        next:
          passwordForm.value.next,
      }
    );

    showPasswordModal.value = false;

    passwordForm.value = {
      current: "",
      next: "",
      confirm: "",
    };

    showSuccess(
      "เปลี่ยนรหัสผ่านสำเร็จ"
    );
  } catch (err) {
    errorMsg.value =
      err.response?.data?.message ||
      "เปลี่ยนรหัสผ่านไม่สำเร็จ";
  }
}

/* =====================================================
   ADDRESS
===================================================== */

const address = ref({
  fullName: "",
  address: "",
  phoneNumber: "",
});

const addressDraft = ref(null);

const isEditingAddress = ref(false);

function startEditAddress() {
  addressDraft.value = {
    fullName: address.value.fullName,
    address: address.value.address,
    phoneNumber: address.value.phoneNumber,
  };

  isEditingAddress.value = true;

  errorMsg.value = "";
  successMsg.value = "";
}

function cancelEditAddress() {
  isEditingAddress.value = false;
  addressDraft.value = null;
}

async function saveAddress() {
  if (!addressDraft.value) return;

  savingAddress.value = true;

  errorMsg.value = "";
  successMsg.value = "";

  try {
    const { data } = await api.patch(
      `/users/${auth.user._id}`,
      {
        contactAddress: {
          name:
            addressDraft.value.fullName,

          address:
            addressDraft.value.address,

          phone:
            addressDraft.value.phoneNumber,
        },
      }
    );

    auth.updateUser(data.user);

    applyUserToProfile(data.user);

    isEditingAddress.value = false;
    addressDraft.value = null;

    showSuccess(
      "บันทึกที่อยู่สำเร็จ"
    );
  } catch (err) {
    errorMsg.value =
      err.response?.data?.message ||
      "บันทึกที่อยู่ไม่สำเร็จ";
  } finally {
    savingAddress.value = false;
  }
}

/* =====================================================
   RATINGS
   Worker → Rating Hirer
===================================================== */

const averageRating = ref(0);
const reviewCount = ref(0);
const reviews = ref([]);

const ratingStars = computed(() => {
  return Math.round(
    averageRating.value
  );
});

async function loadReviews() {
  try {
    const { data } = await api.get(
      `/users/${auth.user._id}/reviews`
    );

    averageRating.value =
      data.averageRating || 0;

    reviewCount.value =
      data.reviewCount || 0;

    reviews.value = (
      data.reviews || []
    ).map((review) => ({
      id: review._id,

      reviewer:
        review.fromUser?.fullName ||
        "ผู้รับจ้าง",

      rating:
        review.rating || 0,

      comment:
        review.comment ||
        "ไม่มีความคิดเห็น",

      date: review.createdAt
        ? new Date(review.createdAt)
        : null,
    }));
  } catch (err) {
    console.error(
      "Load hirer reviews error:",
      err
    );

    // ไม่ให้ Rating ทำให้หน้า Profile พัง
    averageRating.value = 0;
    reviewCount.value = 0;
    reviews.value = [];
  }
}

/* =====================================================
   LOAD USER
===================================================== */

function applyUserToProfile(user) {
  profile.value = {
    fullName:
      user.fullName || "",

    email:
      user.email || "",

    phoneNumber:
      user.phone || "",

    line:
      user.lineId || "",

    facebook:
      user.facebook || "",

    instagram:
      user.instagram || "",

    bankAccount: {
      bankName:
        user.bankAccount?.bankName ||
        "",

      accountNumber:
        user.bankAccount?.accountNumber ||
        "",

      accountHolderName:
        user.bankAccount
          ?.accountHolderName ||
        "",
    },
  };

  address.value = {
    fullName:
      user.contactAddress?.name ||
      user.fullName ||
      "",

    address:
      user.contactAddress?.address ||
      "",

    phoneNumber:
      user.contactAddress?.phone ||
      user.phone ||
      "",
  };

  if (user.avatarUrl) {
    avatarPreview.value =
      resolveUploadUrl(
        user.avatarUrl
      );
  }
}

/* =====================================================
   UTIL
===================================================== */

function showSuccess(message) {
  successMsg.value = message;

  setTimeout(() => {
    successMsg.value = "";
  }, 3000);
}

function formatDate(date) {
  if (!date) return "";

  return new Intl.DateTimeFormat(
    "th-TH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ).format(date);
}

/* =====================================================
   ON MOUNT
===================================================== */

onMounted(async () => {
  try {
    const { data: me } =
      await api.get("/auth/me");

    auth.updateUser(me);

    applyUserToProfile(me);

    await loadReviews();
  } catch (err) {
    errorMsg.value =
      err.response?.data?.message ||
      "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="page">

    <!-- =================================================
         TOP BAR
    ================================================== -->

    <header class="topbar">

  <!-- Hamburger -->
  <button
    class="icon-btn"
    aria-label="เปิดเมนู"
    @click="drawerOpen = true"
  >
    <svg viewBox="0 0 24 24">
      <path
        d="M3 6h18M3 12h18M3 18h18"
      />
    </svg>
  </button>


  <!-- Logo -->
  <div class="brand">

    <span class="brand-icon">
      👥
    </span>

    <span class="brand-name">
      JangDi
    </span>

  </div>

<!-- =================================================
     HIRER NAVBAR DRAWER
================================================= -->

<!-- พื้นหลังมืด -->
<Transition name="fade">

  <div
    v-if="drawerOpen"
    class="backdrop"
    @click="drawerOpen = false"
  ></div>

</Transition>


<!-- เมนูด้านซ้าย -->
<Transition name="slide">

  <nav
    v-if="drawerOpen"
    class="drawer"
  >

    <!-- Logo ใน Drawer -->

    <div class="drawer-brand">

      <span class="brand-icon">
        👥
      </span>

      <span class="brand-name">
        JangDi
      </span>

    </div>


    <!-- เมนูที่มีหน้า -->

    <RouterLink
      v-for="item in drawerItems.filter(
        (i) => i.to
      )"
      :key="item.label"
      :to="item.to"
      class="drawer-link"
      @click="
        drawerOpen = false
      "
    >
      {{ item.label }}
    </RouterLink>


    <!-- เมนูที่ยังไม่มีหน้า -->

    <button
      v-for="item in drawerItems.filter(
        (i) => !i.to
      )"
      :key="item.label"
      class="drawer-link"
      @click="goItem(item)"
    >
      {{ item.label }}
    </button>


    <!-- Switch Role -->

    <button
      class="drawer-link"
      @click="switchRole"
    >
      Switch role
    </button>


    <!-- Logout -->

    <button
      class="drawer-link logout"
      @click="logout"
    >
      Log out
    </button>

  </nav>

</Transition>


    </header>


    <!-- =================================================
         MAIN
    ================================================== -->

    <main class="content">

      <h1 class="page-title">
        Manage Profile
      </h1>


      <!-- Loading -->

      <div
        v-if="loading"
        class="loading"
      >
        กำลังโหลดข้อมูล...
      </div>


      <template v-else>

        <!-- =================================================
             MESSAGE
        ================================================== -->

        <div
          v-if="errorMsg"
          class="message error"
        >
          {{ errorMsg }}
        </div>

        <div
          v-if="successMsg"
          class="message success"
        >
          {{ successMsg }}
        </div>


        <!-- =================================================
             PROFILE IMAGE
        ================================================== -->

        <div class="avatar-section">

          <button
            class="avatar-large"
            @click="pickAvatar"
            aria-label="เปลี่ยนรูปโปรไฟล์"
          >

            <img
              v-if="avatarPreview"
              :src="avatarPreview"
              alt="Profile"
            />

            <svg
              v-else
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="8"
                r="4"
              />

              <path
                d="M4 20c0-4 4-6 8-6s8 2 8 6"
              />
            </svg>

          </button>

          <input
            ref="avatarInput"
            type="file"
            accept="image/*"
            class="hidden-input"
            @change="onAvatarChange"
          />

          <button
            class="link-btn"
            @click="pickAvatar"
          >
            {{
              uploadingAvatar
                ? "Uploading..."
                : "Change Profile"
            }}
          </button>

        </div>


        <!-- =================================================
             PERSONAL INFORMATION
        ================================================== -->

        <section class="card">

          <h2 class="section-title">
            Personal Information
          </h2>


          <div class="field-grid">

            <!-- Full Name -->

            <div class="field">

              <span class="field-label">
                Full Name
              </span>

              <input
                v-if="isEditingProfile"
                v-model="
                  profileDraft.fullName
                "
                type="text"
              />

              <span
                v-else
                class="field-value"
              >
                {{
                  profile.fullName || "-"
                }}
              </span>

            </div>


            <!-- Phone Number -->

            <div class="field">

              <span class="field-label">
                Phone Number
              </span>

              <input
                v-if="isEditingProfile"
                v-model="
                  profileDraft.phoneNumber
                "
                type="tel"
              />

              <span
                v-else
                class="field-value"
              >
                {{
                  profile.phoneNumber || "-"
                }}
              </span>

            </div>


            <!-- Email -->

            <div class="field">

              <span class="field-label">
                Email
              </span>

              <span
                class="field-value muted"
              >
                {{
                  profile.email || "-"
                }}
              </span>

            </div>


            <!-- LINE -->

            <div class="field">

              <span class="field-label">
                Line
              </span>

              <input
                v-if="isEditingProfile"
                v-model="
                  profileDraft.line
                "
                type="text"
                placeholder="@LineID"
              />

              <span
                v-else
                class="field-value"
              >
                {{
                  profile.line || "-"
                }}
              </span>

            </div>


            <!-- Password -->

            <div class="field">

              <span class="field-label">
                Password
              </span>

              <span class="field-value">
                ••••••••
              </span>

            </div>


            <!-- Facebook -->

            <div class="field">

              <span class="field-label">
                Facebook
              </span>

              <input
                v-if="isEditingProfile"
                v-model="
                  profileDraft.facebook
                "
                type="text"
              />

              <span
                v-else
                class="field-value"
              >
                {{
                  profile.facebook || "-"
                }}
              </span>

            </div>


            <!-- Bank Account -->

            <div class="field">

              <span class="field-label">
                Bank account
              </span>


              <template
                v-if="isEditingProfile"
              >

                <input
                  v-model="
                    profileDraft
                      .bankAccount
                      .bankName
                  "
                  type="text"
                  placeholder="ชื่อธนาคาร"
                />

                <input
                  v-model="
                    profileDraft
                      .bankAccount
                      .accountNumber
                  "
                  type="text"
                  placeholder="เลขบัญชี"
                />

                <input
                  v-model="
                    profileDraft
                      .bankAccount
                      .accountHolderName
                  "
                  type="text"
                  placeholder="ชื่อบัญชี"
                />

              </template>


              <span
                v-else
                class="field-value"
              >

                {{
                  profile.bankAccount
                    .bankName || "-"
                }}

                <br />

                {{
                  profile.bankAccount
                    .accountNumber || "-"
                }}

              </span>

            </div>


            <!-- Instagram -->

            <div class="field">

              <span class="field-label">
                Instagram
              </span>

              <input
                v-if="isEditingProfile"
                v-model="
                  profileDraft.instagram
                "
                type="text"
              />

              <span
                v-else
                class="field-value"
              >
                {{
                  profile.instagram || "-"
                }}
              </span>

            </div>

          </div>


          <!-- Buttons -->

          <div class="card-actions">

            <template
              v-if="isEditingProfile"
            >

              <button
                class="btn-outline"
                @click="
                  cancelEditProfile
                "
              >
                ยกเลิก
              </button>

              <button
                class="btn-gold"
                @click="saveProfile"
                :disabled="savingProfile"
              >
                {{
                  savingProfile
                    ? "Saving..."
                    : "บันทึก"
                }}
              </button>

            </template>


            <template v-else>

              <button
                class="btn-gold"
                @click="
                  openPasswordModal
                "
              >
                Change Password
              </button>

              <button
                class="btn-gold"
                @click="
                  startEditProfile
                "
              >
                Edit Profile
              </button>

            </template>

          </div>

        </section>


        <!-- =================================================
             ADDRESS INFORMATION
        ================================================== -->

        <section class="card">

          <h2 class="section-title">
            Address Information
          </h2>


          <div class="field-stack">

            <!-- Full Name -->

            <div class="field">

              <span class="field-label">
                Full Name
              </span>

              <input
                v-if="isEditingAddress"
                v-model="
                  addressDraft.fullName
                "
                type="text"
              />

              <span
                v-else
                class="field-value"
              >
                {{
                  address.fullName || "-"
                }}
              </span>

            </div>


            <!-- Address -->

            <div class="field">

              <span class="field-label">
                Address
              </span>

              <textarea
                v-if="isEditingAddress"
                v-model="
                  addressDraft.address
                "
                rows="3"
                placeholder="กรอกที่อยู่"
              ></textarea>

              <span
                v-else
                class="field-value muted"
              >
                {{
                  address.address || "-"
                }}
              </span>

            </div>


            <!-- Phone -->

            <div class="field">

              <span class="field-label">
                Phone Number
              </span>

              <input
                v-if="isEditingAddress"
                v-model="
                  addressDraft.phoneNumber
                "
                type="tel"
              />

              <span
                v-else
                class="field-value"
              >
                {{
                  address.phoneNumber || "-"
                }}
              </span>

            </div>

          </div>


          <div class="card-actions">

            <template
              v-if="isEditingAddress"
            >

              <button
                class="btn-outline"
                @click="
                  cancelEditAddress
                "
              >
                ยกเลิก
              </button>

              <button
                class="btn-gold"
                @click="saveAddress"
                :disabled="savingAddress"
              >
                {{
                  savingAddress
                    ? "Saving..."
                    : "บันทึก"
                }}
              </button>

            </template>


            <button
              v-else
              class="btn-gold"
              @click="
                startEditAddress
              "
            >
              Edit Address
            </button>

          </div>

        </section>


        <!-- =================================================
             RATINGS
        ================================================== -->

        <section class="card">

          <h2 class="section-title">
            Ratings
          </h2>


          <div class="rating-summary">

            <span class="rating-score">
              {{
                averageRating.toFixed(1)
              }}
            </span>

            <span class="stars">

              <span
                v-for="n in 5"
                :key="n"
                :class="{
                  filled:
                    n <= ratingStars
                }"
              >
                ★
              </span>

            </span>

            <span class="rating-count">
              จาก {{ reviewCount }} รีวิว
            </span>

          </div>


          <!-- ยังไม่มีรีวิว -->

          <div
            v-if="reviews.length === 0"
            class="no-review"
          >
            ยังไม่มีรีวิว
          </div>


          <!-- รายการรีวิว -->

          <ul
            v-else
            class="review-list"
          >

            <li
              v-for="review in reviews"
              :key="review.id"
              class="review-item"
            >

              <div class="review-head">

                <span class="reviewer">
                  {{ review.reviewer }}
                </span>

                <span class="stars small">

                  <span
                    v-for="n in 5"
                    :key="n"
                    :class="{
                      filled:
                        n <= review.rating
                    }"
                  >
                    ★
                  </span>

                </span>

              </div>

              <p class="review-comment">
                {{ review.comment }}
              </p>

              <span
                v-if="review.date"
                class="review-date"
              >
                {{ formatDate(review.date) }}
              </span>

            </li>

          </ul>

        </section>

      </template>

    </main>


    <!-- =================================================
         CHANGE PASSWORD MODAL
    ================================================== -->

    <Transition name="fade">

      <div
        v-if="showPasswordModal"
        class="modal-backdrop"
        @click.self="
          closePasswordModal
        "
      >

        <div class="modal">

          <h3>
            Change Password
          </h3>


          <label>
            รหัสผ่านปัจจุบัน
          </label>

          <input
            v-model="
              passwordForm.current
            "
            type="password"
          />


          <label>
            รหัสผ่านใหม่
          </label>

          <input
            v-model="
              passwordForm.next
            "
            type="password"
          />


          <label>
            ยืนยันรหัสผ่านใหม่
          </label>

          <input
            v-model="
              passwordForm.confirm
            "
            type="password"
          />


          <div
            v-if="errorMsg"
            class="modal-error"
          >
            {{ errorMsg }}
          </div>


          <div class="modal-actions">

            <button
              class="btn-outline"
              @click="
                closePasswordModal
              "
            >
              ยกเลิก
            </button>

            <button
              class="btn-gold"
              @click="
                submitPasswordChange
              "
            >
              บันทึก
            </button>

          </div>

        </div>

      </div>

    </Transition>


    <!-- =================================================
         BOTTOM NAV
    ================================================== -->

    <footer class="bottom-nav">

      <button class="nav-item">

        <svg viewBox="0 0 24 24">
          <circle
            cx="11"
            cy="11"
            r="7"
          />

          <path
            d="M20 20l-3.5-3.5"
          />
        </svg>

        <span>
          ถาม
        </span>

      </button>


      <RouterLink
        to="/hirer"
        class="nav-item"
      >

        <svg viewBox="0 0 24 24">
          <path
            d="M3 11l9-7 9 7"
          />

          <path
            d="M5 10v10h14V10"
          />
        </svg>

        <span>
          หน้าแรก
        </span>

      </RouterLink>


      <button class="nav-item">

        <svg viewBox="0 0 24 24">
          <path
            d="M6 8a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6"
          />

          <path
            d="M10 21a2 2 0 004 0"
          />
        </svg>

        <span class="badge">
          4
        </span>

      </button>

    </footer>

  </div>
</template>


<style scoped>

.page {
  position: relative;

  min-height: 100vh;

  padding-bottom: 76px;

  background: #f0f0f0;
}

svg {
  width: 20px;
  height: 20px;

  fill: none;

  stroke: currentColor;

  stroke-width: 2;

  stroke-linecap: round;

  stroke-linejoin: round;
}


/* =====================================================
   TOP BAR
===================================================== */

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #fff;

  position: sticky;
  top: 0;
  z-index: 10;

  border-bottom: 1px solid #eee;
}



.icon-btn,
.avatar-btn {
  display: flex;

  align-items: center;

  justify-content: center;

  width: 40px;

  height: 40px;

  border: none;

  background: transparent;

  border-radius: 50%;

  color: #111;

  cursor: pointer;
}

.avatar-btn {
  border: 1px solid #111;

  overflow: hidden;

  text-decoration: none;
}

.avatar-btn img {
  width: 100%;
  height: 100%;

  object-fit: cover;
}

.brand {
  display: flex;

  align-items: center;

  gap: 6px;

  font-weight: 700;

  font-size: 18px;

  position: absolute;

  left: 50%;

  transform: translateX(-50%);
}

.brand-icon {
  font-size: 18px;
}

/* =====================================================
   HIRER DRAWER / NAVBAR
===================================================== */

.backdrop {
  position: fixed;

  inset: 0;

  background: rgba(0, 0, 0, 0.4);

  z-index: 20;
}


.drawer {
  position: fixed;

  top: 0;
  left: 0;
  bottom: 0;

  width: 78%;

  max-width: 300px;

  background: #fff;

  z-index: 21;

  padding: 16px;

  box-sizing: border-box;

  display: flex;

  flex-direction: column;

  box-shadow:
    2px 0 12px
    rgba(0, 0, 0, 0.15);
}


.drawer-brand {
  display: flex;

  align-items: center;

  gap: 8px;

  font-weight: 700;

  font-size: 18px;

  margin-bottom: 16px;

  padding-bottom: 14px;

  border-bottom: 1px solid #eee;
}


.drawer-link {
  display: block;

  width: 100%;

  text-align: left;

  padding: 12px 8px;

  min-height: 44px;

  box-sizing: border-box;

  border: none;

  background: transparent;

  border-bottom: 1px solid #f2f2f2;

  color: #111;

  text-decoration: none;

  font-size: 15px;

  cursor: pointer;
}


.drawer-link:hover {
  background: #fff8e6;
}


.drawer-link.logout {
  color: #d33;

  margin-top: auto;
}


/* =====================================================
   DRAWER ANIMATION
===================================================== */

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}


.slide-enter-active,
.slide-leave-active {
  transition: transform 0.2s;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}


/* =====================================================
   CONTENT
===================================================== */

.content {
  padding: 16px;

  display: flex;

  flex-direction: column;

  gap: 14px;
}

.page-title {
  margin: 0;

  font-size: 17px;

  font-weight: 700;

  color: #111;
}


/* =====================================================
   MESSAGE
===================================================== */

.message {
  padding: 9px 12px;

  border-radius: 7px;

  font-size: 12px;
}

.message.error {
  background: #ffe7e7;

  color: #b42318;
}

.message.success {
  background: #e8f7eb;

  color: #237a36;
}

.loading {
  text-align: center;

  padding: 30px;

  color: #777;

  font-size: 13px;
}


/* =====================================================
   PROFILE IMAGE
===================================================== */

.avatar-section {
  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 8px;

  padding: 10px 0 4px;
}

.avatar-large {
  width: 96px;

  height: 96px;

  border-radius: 50%;

  border: 3px solid #111;

  background: #fff;

  display: flex;

  align-items: center;

  justify-content: center;

  color: #111;

  cursor: pointer;

  overflow: hidden;

  padding: 0;
}

.avatar-large svg {
  width: 56px;

  height: 56px;
}

.avatar-large img {
  width: 100%;

  height: 100%;

  object-fit: cover;
}

.hidden-input {
  display: none;
}

.link-btn {
  border: none;

  background: transparent;

  color: #333;

  font-size: 13px;

  font-weight: 600;

  cursor: pointer;

  text-decoration: underline;
}


/* =====================================================
   CARD
===================================================== */

.card {
  background: #fff;

  border-radius: 12px;

  padding: 14px;

  box-shadow:
    0 1px 3px
    rgba(0, 0, 0, 0.06);
}

.section-title {
  margin: 0 0 12px;

  font-size: 14px;

  font-weight: 700;

  color: #111;
}


/* =====================================================
   FIELDS
===================================================== */

.field-grid {
  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 12px 16px;
}

.field-stack {
  display: flex;

  flex-direction: column;

  gap: 12px;
}

.field {
  display: flex;

  flex-direction: column;

  gap: 2px;

  min-width: 0;
}

.field-label {
  font-size: 11px;

  color: #999;
}

.field-value {
  font-size: 13px;

  color: #111;

  font-weight: 600;

  word-break: break-word;
}

.field-value.muted {
  color: #999;

  font-weight: 400;
}

.field input,
.field textarea {
  width: 100%;

  box-sizing: border-box;

  border: 1px solid #ddd;

  border-radius: 6px;

  padding: 6px 8px;

  font-size: 13px;

  min-height: 36px;

  font-family: inherit;

  outline: none;
}

.field textarea {
  resize: vertical;
}

.field input:focus,
.field textarea:focus {
  border-color: #ffc93c;
}


/* =====================================================
   BUTTONS
===================================================== */

.card-actions {
  display: flex;

  justify-content: flex-end;

  gap: 8px;

  margin-top: 14px;

  padding-top: 12px;

  border-top: 1px solid #eee;
}

.btn-gold,
.btn-outline {
  min-height: 38px;

  padding: 0 16px;

  border-radius: 8px;

  font-size: 13px;

  font-weight: 700;

  cursor: pointer;
}

.btn-gold {
  background: #ffc93c;

  border: none;

  color: #111;
}

.btn-gold:hover {
  background: #f4bd28;
}

.btn-gold:disabled {
  opacity: 0.6;

  cursor: not-allowed;
}

.btn-outline {
  background: #fff;

  border: 1px solid #ccc;

  color: #333;
}


/* =====================================================
   RATINGS
===================================================== */

.rating-summary {
  display: flex;

  align-items: center;

  gap: 8px;

  margin-bottom: 12px;
}

.rating-score {
  font-size: 20px;

  font-weight: 800;

  color: #111;
}

.stars {
  color: #ddd;

  letter-spacing: 1px;

  font-size: 18px;
}

.stars .filled {
  color: #ffc93c;
}

.stars.small {
  font-size: 12px;
}

.rating-count {
  font-size: 12px;

  color: #999;
}

.no-review {
  padding: 8px 0;

  font-size: 12px;

  color: #999;
}

.review-list {
  list-style: none;

  margin: 0;

  padding: 0;

  display: flex;

  flex-direction: column;

  gap: 10px;
}

.review-item {
  padding-top: 10px;

  border-top: 1px solid #f2f2f2;
}

.review-item:first-child {
  padding-top: 0;

  border-top: none;
}

.review-head {
  display: flex;

  align-items: center;

  justify-content: space-between;
}

.reviewer {
  font-size: 13px;

  font-weight: 700;

  color: #111;
}

.review-comment {
  margin: 4px 0 0;

  font-size: 12px;

  color: #555;

  line-height: 1.5;
}

.review-date {
  display: block;

  margin-top: 4px;

  font-size: 10px;

  color: #aaa;
}


/* =====================================================
   PASSWORD MODAL
===================================================== */

.modal-backdrop {
  position: fixed;

  inset: 0;

  background:
    rgba(0, 0, 0, 0.45);

  display: flex;

  align-items: center;

  justify-content: center;

  z-index: 30;

  padding: 20px;
}

.modal {
  background: #fff;

  border-radius: 12px;

  padding: 18px;

  width: 100%;

  max-width: 340px;

  box-sizing: border-box;
}

.modal h3 {
  margin: 0 0 12px;

  font-size: 16px;
}

.modal label {
  display: block;

  margin-top: 10px;

  font-size: 12px;

  color: #666;
}

.modal input {
  width: 100%;

  box-sizing: border-box;

  min-height: 40px;

  border: 1px solid #ccc;

  border-radius: 8px;

  padding: 8px 10px;

  margin-top: 4px;

  outline: none;
}

.modal input:focus {
  border-color: #ffc93c;
}

.modal-error {
  margin-top: 10px;

  font-size: 11px;

  color: #c62828;
}

.modal-actions {
  display: flex;

  justify-content: flex-end;

  gap: 8px;

  margin-top: 16px;
}


/* =====================================================
   TRANSITION
===================================================== */

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}


/* =====================================================
   BOTTOM NAV
===================================================== */

.bottom-nav {
  position: fixed;

  left: 0;

  right: 0;

  bottom: 0;

  max-width: 480px;

  margin: 0 auto;

  display: flex;

  justify-content: space-around;

  align-items: center;

  background: #fff;

  border-top: 1px solid #eee;

  padding: 6px 0;

  z-index: 6;
}

.nav-item {
  position: relative;

  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 2px;

  min-height: 44px;

  min-width: 44px;

  border: none;

  background: transparent;

  color: #333;

  font-size: 11px;

  text-decoration: none;

  cursor: pointer;
}

.badge {
  position: absolute;

  top: -2px;

  right: 8px;

  background: #e11d48;

  color: #fff;

  font-size: 10px;

  font-weight: 700;

  min-width: 16px;

  height: 16px;

  border-radius: 8px;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 0 3px;
}


/* =====================================================
   MOBILE
===================================================== */

@media (max-width: 400px) {

  .content {
    padding: 12px;
  }

  .field-grid {
    gap: 10px;
  }

  .btn-gold,
  .btn-outline {
    padding: 0 12px;
  }

}
</style>