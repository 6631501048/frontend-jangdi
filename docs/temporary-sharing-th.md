# เปิดลิงก์ชั่วคราวให้ทดสอบ JangDi

ผู้ทดสอบใช้เพียงเว็บเบราว์เซอร์ ไม่ต้องมีโค้ดหรือติดตั้ง Node.js

## เปิดลิงก์

รันจากโฟลเดอร์ frontend:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-share.ps1
```

ตัวเปิดลิงก์จะ build หน้าเว็บโดยให้ API อยู่ใต้ `/api` แล้วเปิด backend ทดสอบแยกที่พอร์ต 4001 และ gateway ที่พอร์ต 5180 โดยไม่เปลี่ยน backend/.env และไม่หยุดตัวพัฒนาที่พอร์ต 4000/5173 ทั้งสองพอร์ตสำหรับแชร์ต้องว่างก่อนเริ่ม

ดูสถานะและ URL:

```powershell
Get-Content .password-recovery/share/session.json -Raw | ConvertFrom-Json | Select-Object status,url,error
```

ตัวเปิดลิงก์ตรวจ public health เป็นระยะ หาก status เป็น degraded ให้ปิดแล้วเปิดใหม่ และตั้งค่า Google origin สำหรับ URL ใหม่ด้วย

เมื่อ status เป็น ready ให้ส่ง URL ในช่อง url ให้ผู้ทดสอบ ไฟล์สถานะและ log อยู่ใน .password-recovery/share ซึ่งถูก gitignore ไว้แล้ว

- ต้องเปิดเครื่องและเชื่อมต่ออินเทอร์เน็ตตลอดเวลาที่ทดสอบ
- ใช้ฐานข้อมูลและไฟล์อัปโหลดชุดเดียวกับ backend เดิม การประกาศงาน สมัครงาน เปลี่ยนข้อมูล หรือรีเซ็ตรหัสผ่านจึงมีผลกับข้อมูลชุดนั้นจริง
- โค้ดฝั่ง frontend ที่แก้หลังเปิดลิงก์จะยังไม่เปลี่ยนในเว็บแชร์จนกว่าจะหยุดและเปิดใหม่
- เปิดใหม่จะได้ URL ใหม่ ลิงก์ในอีเมลและ Stripe Checkout ที่สร้างก่อนเปลี่ยน URL ยังอ้างถึงลิงก์เก่า
- ใช้อีเมล/รหัสผ่านที่มีอยู่ หรือสมัครด้วยอีเมลโดเมนที่แอปอนุญาต ไม่ต้องแจกบัญชีแอดมินให้ผู้ทดสอบทั่วไป

## Google Login

เพิ่ม URL ปัจจุบันทั้ง `https://...trycloudflare.com` (ไม่ใส่ path หรือ `/login`) ใน Google Cloud Console > Google Auth platform > Clients > เลือก OAuth client ที่แอปใช้อยู่ > Authorized JavaScript origins > Save

ยังไม่ได้แก้การตั้งค่านี้ในบัญชี Google Cloud ของเจ้าของโปรเจกต์ให้ จึงต้องตั้งค่าก่อนทดสอบ Google Login จากโดเมนใหม่ เมื่อเปลี่ยน URL ต้องเพิ่ม origin ใหม่ด้วย

เอกสาร Google: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

หาก Google Maps key จำกัด HTTP referrers ต้องอนุญาตโดเมนนี้สำหรับการทดสอบแผนที่ด้วย ไม่ควรลบข้อจำกัดทั้งหมด

## Stripe

การเปิดลิงก์ไม่ได้สร้างหรือเปลี่ยน Stripe webhook endpoint ในบัญชี Stripe ใช้การตั้งค่าโหมดทดสอบเดิม และตั้งปลายทาง webhook เป็น URL ปัจจุบันตามต้องการก่อนทดสอบ webhook จาก Stripe (หรือคง Stripe CLI ที่ forward ไป backend เดิมซึ่งใช้ฐานข้อมูลเดียวกัน)

หน้าชำระเงินที่สร้างโดย backend ทดสอบจะใช้ public URL สำหรับ success/cancel return ปลายทาง `/api/payments/stripe/webhook` รองรับ raw request bytes และ signature เดิม

## ปิดลิงก์

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\stop-share.ps1
```

สคริปต์หยุดเฉพาะโปรเซสที่เปิดสำหรับ session นี้ โดยตรวจชื่อและเวลาเริ่มโปรเซสก่อน ไม่หยุด backend/frontend ที่คุณรันไว้เอง

## การตรวจที่ทำแล้ว

- Build แบบแชร์สำเร็จ; frontend tests 107 รายการผ่าน
- Gateway test ตรวจ SPA routes, API authorization headers, raw webhook bytes และการไม่เปิด source/.env
- ตรวจผ่าน URL ภายนอก: หน้า login/profile, health, feed และรูปโปรไฟล์ตอบ 200; ข้อมูลบัญชี/งานส่วนตัว/notifications ตอบ 401 เมื่อไม่ล็อกอิน; source/.env ตอบ 404; รูปหลักฐานส่วนตัวตอบ 403
- Chrome เปิดหน้าล็อกอินที่ 390 และ 1440 px ได้ ไม่มี overflow หรือ runtime exception และไม่มี asset URL ชี้ localhost
- WebSocket upgrade ผ่าน tunnel และปฏิเสธ session ไม่ถูกต้อง; backend ทดสอบใช้ auth middleware เดียวกับ HTTP และเข้าห้องแจ้งเตือนจาก account ID ที่ยืนยันแล้วเท่านั้น
- ไม่ได้ใช้บัญชีจริงทดสอบล็อกอิน ส่งอีเมล หรือสร้างรายการจ่ายเงิน

เอกสาร Cloudflare Quick Tunnel: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

## รีโหลด backend โดยคง URL

หลังแก้โค้ด backend ให้ใช้คำสั่งนี้กับ share session รุ่นที่รองรับ control endpoint:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\reload-share-backend.ps1
```

สคริปต์จะรอ backend เชื่อมฐานข้อมูลสำเร็จ โดยไม่หยุด Cloudflare จึงไม่ต้องเปลี่ยน Google origin ถ้า Tunnel เดิมยังใช้ได้ ห้าม commit หรือส่ง session/control token ให้ผู้ทดสอบ
