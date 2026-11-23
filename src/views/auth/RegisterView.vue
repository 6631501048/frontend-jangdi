<script setup>
import AuthShell from "../../components/AuthShell.vue";
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
  <AuthShell>
    <h1>กรอกข้อมูลโปรไฟล์</h1>
    <p class="subtitle">กรอกให้ครบก่อนเริ่มใช้งาน JangDi</p>

    <form @submit.prevent="handleSubmit">
      <label>ชื่อ–นามสกุล<input v-model="fullName" autocomplete="name" placeholder="ชื่อและนามสกุลของคุณ" required /></label>
      <label>เบอร์โทรศัพท์<input v-model="phone" type="tel" autocomplete="tel" placeholder="เบอร์ที่ติดต่อได้" required /></label>
      <label>LINE ID (ไม่บังคับ)<input v-model="lineId" placeholder="สำหรับติดต่อเรื่องงาน" /></label>

      <button type="button" class="secondary" @click="requestLocation">
        📍 อนุญาตให้เข้าถึงตำแหน่ง (สำหรับแจ้งเตือนงานใกล้เคียง)
      </button>
      <p v-if="locationStatus" class="location-status">{{ locationStatus }}</p>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="loading">{{ loading ? "กำลังบันทึก..." : "บันทึกและเริ่มใช้งาน" }}</button>
    </form>
  </AuthShell>
</template>
