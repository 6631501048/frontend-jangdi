// FR-AUTH-03: Google Sign-In โดยใช้ Google Identity Services (GSI)
// จำกัดเฉพาะโดเมน @lamduan.mfu.ac.th ผ่าน hint "hd" — เป็นแค่ hint ฝั่ง client เท่านั้น
// backend ต้องตรวจสอบโดเมนซ้ำเสมอ (ดู isLamduanEmail ใน backend/src/utils/validators.js)

let scriptLoadingPromise = null;

function loadGsiScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("โหลด Google Sign-In script ไม่สำเร็จ (เช็คอินเทอร์เน็ต)"));
    document.head.appendChild(script);
  });
  return scriptLoadingPromise;
}

/**
 * เปิด Google Sign-In prompt แล้ว resolve เป็น ID token (ส่งต่อให้ POST /api/auth/google)
 * @returns {Promise<string>} idToken
 */
export async function signInWithGoogle() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("ยังไม่ได้ตั้งค่า VITE_GOOGLE_CLIENT_ID ใน .env — กรุณาใช้อีเมล/รหัสผ่านแทนไปก่อน");
  }

  await loadGsiScript();

  return new Promise((resolve, reject) => {
    window.google.accounts.id.initialize({
      client_id: clientId,
      hd: "lamduan.mfu.ac.th", // hint ให้ Google เสนอเฉพาะบัญชีโดเมนนี้ก่อน
      callback: (response) => {
        if (response?.credential) {
          resolve(response.credential); // นี่คือ ID token (JWT)
        } else {
          reject(new Error("ไม่ได้รับข้อมูลยืนยันตัวตนจาก Google"));
        }
      },
    });

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        reject(new Error("Google Sign-In ถูกปิดกั้นหรือถูกข้าม กรุณาอนุญาต pop-up แล้วลองใหม่"));
      }
    });
  });
}