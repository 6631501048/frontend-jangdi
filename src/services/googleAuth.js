// FR-AUTH-03: Google Sign-In โดยใช้ Google Identity Services (GSI)
// จำกัดเฉพาะโดเมน @lamduan.mfu.ac.th ผ่าน hint "hd" — เป็นแค่ hint ฝั่ง client เท่านั้น
// backend ต้องตรวจสอบโดเมนซ้ำเสมอ (ดู isLamduanEmail ใน backend/src/utils/validators.js)
//
// หมายเหตุ: เดิมใช้ google.accounts.id.prompt() (One Tap) ซึ่งไม่เสถียร — Google จะไม่แสดงเมื่อ
// ผู้ใช้เคยกดปิด (cooldown), เบราว์เซอร์บล็อก third-party sign-in/FedCM, หรือเปิดหลายแท็บ
// ตอนนี้เปลี่ยนมาใช้ renderButton() (ปุ่มทางการของ Google เปิด popup เมื่อผู้ใช้คลิก) ซึ่งไม่ติด cooldown

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
    script.onerror = () => {
      scriptLoadingPromise = null; // ให้ลองโหลดใหม่ได้ถ้าเน็ตหลุดรอบแรก
      reject(new Error("โหลด Google Sign-In script ไม่สำเร็จ (เช็คอินเทอร์เน็ต)"));
    };
    document.head.appendChild(script);
  });
  return scriptLoadingPromise;
}

/**
 * วาดปุ่ม "Continue with Google" ของ Google ลงใน container
 * เมื่อผู้ใช้ล็อกอินสำเร็จจะเรียก onCredential(idToken) (ส่งต่อให้ POST /api/auth/google)
 * @param {HTMLElement} container
 * @param {(idToken: string) => void} onCredential
 * @param {(err: Error) => void} [onError]
 */
export async function renderGoogleButton(container, onCredential, onError) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("ยังไม่ได้ตั้งค่า VITE_GOOGLE_CLIENT_ID ใน .env — กรุณาใช้อีเมล/รหัสผ่านแทนไปก่อน");
  }

  await loadGsiScript();

  window.google.accounts.id.initialize({
    client_id: clientId,
    hd: "lamduan.mfu.ac.th", // hint ให้ Google เสนอเฉพาะบัญชีโดเมนนี้ก่อน
    ux_mode: "popup",
    auto_select: false,
    callback: (response) => {
      if (response?.credential) {
        onCredential(response.credential); // นี่คือ ID token (JWT)
      } else {
        onError?.(new Error("ไม่ได้รับข้อมูลยืนยันตัวตนจาก Google"));
      }
    },
  });

  container.innerHTML = "";
  window.google.accounts.id.renderButton(container, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    logo_alignment: "left",
    width: Math.min(400, Math.max(200, Math.floor(container.clientWidth) || 320)),
  });
}