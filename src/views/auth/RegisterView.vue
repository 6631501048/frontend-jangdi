<script setup>
// FR-AUTH-05, FR-PROF-01/02: กรอกโปรไฟล์ให้ครบหลัง login ครั้งแรก
import { ref } from "vue";
import { useRouter } from "vue-router";
import api from "../../services/api";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
const router = useRouter();

const fullName = ref(auth.user?.fullName || "");
const phone = ref(auth.user?.phone || "");
const lineId = ref(auth.user?.lineId || "");
const error = ref("");
const loading = ref(false);
const locationStatus = ref(""); // ข้อความสถานะการขอพิกัด

let lat = null;
let lng = null;

function requestLocation() {
  if (!navigator.geolocation) {
    locationStatus.value = "เบราว์เซอร์นี้ไม่รองรับการขอตำแหน่ง";
    return;
  }
  locationStatus.value = "กำลังขอตำแหน่ง...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      locationStatus.value = "ได้รับตำแหน่งแล้ว (ใช้สำหรับแจ้งเตือนงานใกล้เคียง)";
    },
    () => {
      locationStatus.value = "ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง — ยังสมัครได้ปกติ แต่จะไม่ได้รับแจ้งเตือนงานใกล้เคียงจนกว่าจะตั้งค่าตำแหน่งในหน้าโปรไฟล์";
    }
  );
}

async function handleSubmit() {
  error.value = "";
  if (!fullName.value || !phone.value) {
    error.value = "กรุณากรอกชื่อ-นามสกุล และเบอร์โทรศัพท์";
    return;
  }

  loading.value = true;
  try {
    const { data } = await api.patch(`/users/${auth.user._id}`, {
      fullName: fullName.value,
      phone: phone.value,
      lineId: lineId.value,
      ...(lat != null && lng != null ? { lat, lng } : {}),
    });
    auth.updateUser(data.user);

    if (data.user.isAdmin) {
      router.push({ name: "admin-dashboard" });
    } else {
      router.push(data.user.currentRole === "worker" ? { name: "worker-dashboard" } : { name: "hirer-dashboard" });
    }
  } catch (e) {
    error.value = e.response?.data?.message || "บันทึกโปรไฟล์ไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="register-page">
    <h1>กรอกข้อมูลโปรไฟล์</h1>
    <p class="subtitle">กรอกให้ครบก่อนเริ่มใช้งาน JangDi</p>

    <form @submit.prevent="handleSubmit">
      <input v-model="fullName" placeholder="ชื่อ-นามสกุล" required />
      <input v-model="phone" placeholder="เบอร์โทรศัพท์" required />
      <input v-model="lineId" placeholder="LINE ID (ไม่บังคับ)" />

      <button type="button" class="secondary" @click="requestLocation">
        📍 อนุญาตให้เข้าถึงตำแหน่ง (สำหรับแจ้งเตือนงานใกล้เคียง)
      </button>
      <p v-if="locationStatus" class="location-status">{{ locationStatus }}</p>

      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit" :disabled="loading">{{ loading ? "กำลังบันทึก..." : "บันทึกและเริ่มใช้งาน" }}</button>
    </form>
  </main>
</template>

<style scoped>
.register-page { padding: 24px 16px; }
.subtitle { color: #666; margin-bottom: 24px; }
form { display: flex; flex-direction: column; gap: 12px; }
input, button { padding: 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 16px; min-height: 44px; }
button { background: #2563eb; color: white; border: none; cursor: pointer; }
button.secondary { background: white; color: #2563eb; border: 1px solid #2563eb; }
button:disabled { opacity: 0.6; cursor: not-allowed; }
.location-status { font-size: 13px; color: #666; }
.error { color: #dc2626; font-size: 14px; }
</style>