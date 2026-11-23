# การเข้าสู่ระบบและตั้งรหัสผ่าน

อีเมลเดียวกันเป็นบัญชีเดียวกัน: password login และ Google login ค้นหา User ด้วยอีเมลที่ปรับเป็นตัวพิมพ์เล็กและตัดช่องว่างแล้ว การเชื่อม Google ต้องผ่านการตรวจ ID token ของ Google มี email_verified=true อยู่ในโดเมนที่อนุญาต และ Google ID ต้องตรงกับที่เคยเชื่อมไว้

บัญชีที่เริ่มจาก Google ไม่มีรหัสผ่านโดยอัตโนมัติ สามารถใช้ “ลืมรหัสผ่าน / ยังไม่ได้ตั้งรหัสผ่าน?” บนหน้า login หรือในหน้าต่างเปลี่ยนรหัสผ่านที่ profile เพื่อรับลิงก์ตั้งรหัสให้ User เดิม ไม่สร้างบัญชีเพิ่ม และ Google login ยังใช้ได้

## Flow

1. `/forgot-password` ส่ง `POST /api/auth/forgot-password` ด้วยอีเมลมหาวิทยาลัย
2. ระบบส่งลิงก์ `/reset-password#token=...` ไปอีเมล อายุ 30 นาที ใช้ได้ครั้งเดียว ลิงก์ใหม่แทนลิงก์เก่า
3. หน้า reset อ่าน token แล้วนำออกจาก address bar ไม่ส่ง secret ผ่าน URL ของ HTTP request
4. `POST /api/auth/reset-password` ใช้ token ตรวจ hash/expiry แล้วอัปเดตรหัสผ่านด้วย bcrypt และใช้ลิงก์แบบ atomic
5. กลับหน้า login เพื่อเข้าบัญชีเดิม ทุก session เดิมใช้ไม่ได้หลังเปลี่ยนรหัสผ่าน โดย authVersion อยู่ใน JWT บัญชีเดิมที่ยังไม่มี field นี้ถือเป็น 0 ไม่ต้อง migrate ข้อมูล

API ขอลิงก์ตอบข้อความเหมือนกันสำหรับบัญชีไม่พบ ถูกระงับ และอยู่ใน cooldown เพื่อไม่เปิดเผยบัญชี ส่งซ้ำได้ห่างกันอย่างน้อย 60 วินาที จำกัดตาม IP ที่ 5 ครั้ง/15 นาที และ reset 10 ครั้ง/15 นาที ตัวนับ IP ใช้ middleware เดิมใน process เดียว

ระบบเก็บเฉพาะ SHA-256 hash ของ token และไม่ส่ง token/hash กลับ API หรือ log ค่ารหัสผ่านรองรับอย่างน้อย 8 ตัวอักษรและไม่เกิน 72 ไบต์เพื่อไม่ให้ bcrypt ตัดรหัสเงียบ ๆ

## Gmail / Google Workspace

เพิ่ม/แก้ค่าต่อไปนี้ใน `backend/.env` ของเครื่องหรือระบบ deploy จริง โดยใช้บัญชีผู้ส่งของแอป:

```dotenv
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=YOUR_SENDER_EMAIL
EMAIL_PASS=YOUR_GOOGLE_APP_PASSWORD
EMAIL_FROM="JangDi <YOUR_SENDER_EMAIL>"
CLIENT_URL=http://localhost:5173
```

แทน placeholder ทั้งหมดด้วยค่าจริงในไฟล์ `.env` เท่านั้น ไม่ commit หรือส่งรหัสลับในแชต `EMAIL_FROM` ต้องเป็นผู้ส่งที่ใช้ได้กับบัญชีนี้ อย่าใช้ค่า noreply ตัวอย่างเดิม หาก deploy ให้ CLIENT_URL เป็น URL HTTPS ของ frontend จริง

Google รองรับ SMTP ที่ `smtp.gmail.com:587` ผ่าน STARTTLS ([เอกสาร Google](https://developers.google.com/workspace/gmail/imap/imap-smtp)) และการใช้ App Password ต้องเปิด 2-Step Verification ก่อน ([ขั้นตอน Google](https://support.google.com/mail/answer/185833?hl=en)) บัญชี Workspace อาจถูกผู้ดูแลจำกัด App Password; หากไม่มีตัวเลือกนี้ให้สอบถามผู้ดูแลเกี่ยวกับวิธีส่งเมลที่องค์กรอนุญาต ([Workspace](https://knowledge.workspace.google.com/admin/sync/set-up-gmail-with-a-third-party-email-client))

รีสตาร์ท backend หลังแก้ค่า environment การไม่มี SMTP จะตอบ 503 และแสดงข้อความว่าระบบส่งเมลยังไม่พร้อม หากมีค่าครบแต่ส่งล้มเหลว server จะบันทึกคำเตือนและล้าง token ของคำขอนั้น โดยยังตอบข้อความกลางเพื่อไม่เปิดเผยว่าบัญชีมีอยู่หรือไม่ หน้ายืนยันคำขอจึงไม่ใช่หลักฐานว่าอีเมลส่งถึงแล้ว

## การตรวจสอบและขอบเขต

- ทดสอบ API ผ่าน HTTP กับ route/controller/middleware จริงและ bcrypt/JWT จริง ใช้ model ในหน่วยความจำและจำลอง Google token verification กับ mail transport ไม่แตะฐานข้อมูลหรือส่งเมลจริง
- ครอบคลุม password login ถูก/ผิด, normalize อีเมล, การเชื่อม Google กับบัญชีเดิม, Google-only ตั้งรหัส, ลิงก์ใหม่/หมดอายุ/ใช้ซ้ำ/ใช้พร้อมกัน, ระงับบัญชี, SMTP ไม่พร้อม, เปลี่ยนรหัสแล้ว session เก่าใช้ไม่ได้ และ rate limit
- Browser ใช้ Chrome profile แยกกับ API fixture ตรวจ login, ลืม/ตั้งรหัส, ข้อผิดพลาดและลองใหม่ รวม responsive/focus/contrast
- ยังไม่ได้ยืนยันการส่งถึง Gmail จริง หรือ OAuth handshake จริง และไม่ได้แก้รหัสบัญชีของผู้ใช้

ผล browser: [checks.json](ui-review/auth-recovery/checks.json) ภาพตัวอย่าง: [ขอลิงก์](ui-review/auth-recovery/forgot-password-390.png), [ตั้งรหัส](ui-review/auth-recovery/reset-password-390.png)

ผลรอบนี้: frontend 76 tests ผ่าน, auth API 12 tests ผ่าน, browser 6 กลุ่มรวม 12 หน้าจอที่ขนาดต่างกันผ่าน และ production build ผ่าน ตรวจ API ที่เปิดจริงบนพอร์ต 4000 หลัง restart แล้ว route ใหม่ตอบ validation 400 สำหรับอีเมลผิดโดเมน ไม่ใช่ 404

ชุด backend รวมผ่าน 175/184; 9 รายการที่ไม่ผ่านอยู่ใน payment-repair, selection-mock-flow, slip-finance, stripe-checkout และ stripe-http เกี่ยวกับค่าธรรมเนียม ทดสอบ 5 ไฟล์นี้ซ้ำโดยโหลด auth source ก่อนแก้ที่สำรองไว้ ได้ 9 รายการชื่อเดียวกันล้มเหลว จึงแยกเป็นปัญหาก่อนการแก้ auth ครั้งนี้ ไม่เปลี่ยนกฎค่าธรรมเนียมในงานนี้

ขณะตรวจยังไม่มี SMTP credentials จึงยังขอลิงก์ส่งจริงไม่ได้ ต้องตั้งค่า Gmail ตามด้านบนและ restart backend ก่อน การทดสอบที่ผ่านใช้ mail transport และ Google token แบบจำลองตามขอบเขตที่ระบุ

รันทดสอบ backend ด้วย `node --test tests/auth-recovery.test.js` จาก backend; frontend ใช้ `npm test` และ `npm run build`; browser ใช้ `HIRER_PREVIEW_URL` ชี้ dev server แล้วรัน `node scripts/check-auth-recovery.cjs`
