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
const bankName = ref(auth.user?.bankAccount?.bankName || "");
const accountNumber = ref(auth.user?.bankAccount?.accountNumber || "");
const accountHolderName = ref(auth.user?.bankAccount?.accountHolderName || "");
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
  if (loading.value) return;
  error.value = "";
  if (!fullName.value.trim() || !phone.value.trim()) {
    error.value = "กรุณากรอกชื่อ-นามสกุล และเบอร์โทรศัพท์";
    return;
  }
  if (!bankName.value.trim() || !accountNumber.value.trim() || !accountHolderName.value.trim()) {
    error.value = "กรุณากรอกชื่อธนาคาร เลขบัญชี และชื่อเจ้าของบัญชีให้ครบ สามารถใช้ข้อมูลสมมติสำหรับการทดสอบได้";
    return;
  }

  loading.value = true;
  try {
    const { data } = await api.patch(`/users/${auth.user._id}`, {
      fullName: fullName.value.trim(),
      phone: phone.value.trim(),
      lineId: lineId.value.trim(),
      bankAccount: { bankName: bankName.value.trim(), accountNumber: accountNumber.value.trim(), accountHolderName: accountHolderName.value.trim() },
      ...(lat != null && lng != null ? { lat, lng } : {}),
    });
    auth.updateUser(data.user);

    if (data.user.isAdmin) {
      router.replace({ name: "admin-dashboard" });
    } else {
      router.replace(data.user.currentRole === "worker" ? { name: "worker-dashboard" } : { name: "hirer-dashboard" });
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
      <fieldset class="bank-fields" aria-describedby="bank-test-note">
        <legend>บัญชีธนาคารสำหรับรับเงิน</legend>
        <p id="bank-test-note" class="bank-test-note">ขณะนี้เป็นระบบทดสอบ สามารถกรอกข้อมูลบัญชีสมมติได้ เช่น เลขบัญชี 0000000000 ไม่จำเป็นต้องใช้บัญชีจริง</p>
        <label>ชื่อธนาคาร<input v-model="bankName" name="bankName" placeholder="เช่น ธนาคารทดสอบ" aria-describedby="bank-test-note" required /></label>
        <label>เลขบัญชี<input v-model="accountNumber" name="accountNumber" inputmode="numeric" placeholder="เช่น 0000000000" aria-describedby="bank-test-note" required /></label>
        <label>ชื่อเจ้าของบัญชี<input v-model="accountHolderName" name="accountHolderName" placeholder="ชื่อสำหรับบัญชีทดสอบ" aria-describedby="bank-test-note" required /></label>
      </fieldset>

      <button type="button" class="secondary" @click="requestLocation">
        📍 อนุญาตให้เข้าถึงตำแหน่ง (สำหรับแจ้งเตือนงานใกล้เคียง)
      </button>
      <p v-if="locationStatus" class="location-status">{{ locationStatus }}</p>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="loading">{{ loading ? "กำลังบันทึก..." : "บันทึกและเริ่มใช้งาน" }}</button>
    </form>
  </AuthShell>
</template>
<style scoped>
.bank-fields{display:grid;gap:16px;min-width:0;margin:0;padding:16px;border:1px solid var(--jd-line);border-radius:14px;background:var(--jd-canvas)}.bank-fields legend{padding:0 6px;font-size:.9375rem;font-weight:600;color:var(--jd-ink)}.bank-test-note{margin:0;color:var(--jd-muted);font-size:.8125rem;line-height:1.8;overflow-wrap:anywhere}
</style>
