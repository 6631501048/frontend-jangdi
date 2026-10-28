import api from "./api";

// Never load a private proof with <img src="/uploads/job-proofs/...">.
// The image endpoint requires the logged-in user's Bearer token.
export async function fetchCompletionProof(jobId) {
  const response = await api.get(`/jobs/${encodeURIComponent(jobId)}/completion-proof`, { responseType: "blob" });
  const blob = response.data;
  if (!(blob instanceof Blob) || !blob.size || !["image/jpeg", "image/png", "image/webp"].includes(blob.type)) {
    throw new Error("เซิร์ฟเวอร์ไม่ได้ส่งรูปหลักฐานที่ถูกต้องกลับมา");
  }
  return URL.createObjectURL(blob);
}

export async function proofRequestError(error) {
  if (!error?.response) return error?.message || "โหลดรูปไม่ได้ กรุณาตรวจสอบการเชื่อมต่อ";
  let message = error.response.data?.message;
  if (!message && error.response.data instanceof Blob) {
    try { message = JSON.parse(await error.response.data.text()).message; } catch { /* not a JSON error */ }
  }
  const status = error.response.status;
  if (status === 404) return message || "ไม่พบรูปหลักฐานบนเซิร์ฟเวอร์ กรุณาตรวจสอบที่เก็บไฟล์";
  if (status === 401) return "กรุณาเข้าสู่ระบบใหม่เพื่อดูรูปหลักฐาน";
  if (status === 403) return "บัญชีนี้ไม่มีสิทธิ์เปิดดูรูปหลักฐานของงานนี้";
  return message || `โหลดรูปไม่สำเร็จ (HTTP ${status})`;
}
