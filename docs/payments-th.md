# การเงินและ Stripe โหมดทดสอบ

โค้ดรองรับสลิปจำลองที่ admin ตรวจรับและแนบสลิปจ่ายออกแล้ว รวมทั้ง Stripe Checkout สำหรับบัตรและ PromptPay ในโหมดทดสอบ ไม่เปิดใช้ live key และไม่มีการโอนเงินจริงให้ผู้รับจ้าง

เริ่มทดสอบโดยไม่ตั้งค่า Stripe ได้ตาม [คู่มือสลิปจำลอง](slip-demo-th.md) รายการใหม่ใช้โหมดสลิปจำลองเป็นค่าเริ่มต้น ส่วนขั้นตอนต่อไปนี้สำหรับผู้ที่เลือกทดสอบ Stripe

## ตั้งค่า backend

ต้องใช้ Node.js 18 ขึ้นไป และ MongoDB replica set ที่รองรับ transaction เช่นเดียวกับขั้นตอนยืนยันรับงานเดิม ตั้งค่าใน `backend/.env` (ห้ามใส่ secret key ใน frontend):

```dotenv
CLIENT_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_...
# ไม่บังคับสำหรับการตรวจสถานะจากหน้าชำระเงิน แต่จำเป็นสำหรับรับ webhook
STRIPE_WEBHOOK_SECRET=whsec_...
```

สร้าง test webhook endpoint `POST /api/payments/stripe/webhook` และรับ event:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `refund.created`
- `refund.updated`
- `refund.failed`

### ใช้งานโดยไม่เปิด stripe listen

เมื่อตั้งค่า test key แล้ว หน้าชำระเงินจะเรียก backend ตรวจ Checkout Session ปัจจุบันกับ Stripe โดยตรงตอนเปิดหน้าและทุก 8 วินาทีระหว่างรอผล รวมถึงตรวจผลคืนเงินที่อนุมัติแล้ว ไม่ต้องเปิด Stripe CLI หรือกำหนด webhook secret เพื่อใช้การตรวจสถานะนี้ หากปิดหน้าเว็บ การตรวจอัตโนมัติจากหน้านี้จะหยุด และเริ่มใหม่เมื่อเปิดหน้าอีกครั้ง

การตรวจสถานะใช้ `POST /api/payments/:jobId/stripe/sync` ต้องเข้าสู่ระบบเป็นผู้ว่าจ้างเจ้าของงาน Backend ใช้ session ที่บันทึกไว้ ตรวจโหมดทดสอบ เลขอ้างอิง ยอด THB และสถานะ paid จาก Stripe ก่อนอัปเดตแบบป้องกันซ้ำ ไม่รับยอดหรือ session จาก browser

หากต้องการอัปเดตแม้ปิดหน้าเว็บ ให้ตั้ง webhook ถาวรครั้งเดียว:

1. นำ backend ไปไว้บนเซิร์ฟเวอร์ที่มี URL HTTPS สาธารณะและทำงานต่อเนื่อง
2. ใน Stripe Workbench → Webhooks ของ sandbox เดียวกับ test key สร้าง endpoint แบบ Snapshot ที่ `https://<backend-domain>/api/payments/stripe/webhook` และเลือก events ตามรายการด้านบน
3. นำ signing secret ของ endpoint นี้ใส่ `STRIPE_WEBHOOK_SECRET` บนเซิร์ฟเวอร์ แล้ว restart backend ค่า secret นี้เป็นคนละตัวกับ listener ของ CLI
4. ตั้ง `CLIENT_URL` เป็น URL ของ frontend แล้วทดสอบชำระและคืนเงินใน sandbox ตรวจว่า webhook ตอบ 2xx และสถานะในแอปตรงกัน

Webhook ถาวรไม่ต้องเปิด `stripe listen` และยังยืนยันผลได้เมื่อไม่มีผู้ใช้เปิดหน้าชำระเงิน ทั้งนี้ยังไม่ได้สร้าง endpoint สาธารณะหรือตั้งค่า Stripe Dashboard ให้จากการแก้โค้ดชุดนี้

สำหรับผู้พัฒนาที่ต้องการทดสอบ webhook บน localhost ยังเลือกใช้ Stripe CLI ได้:

```sh
stripe listen --forward-to localhost:4000/api/payments/stripe/webhook
```

ใช้ webhook signing secret ที่คำสั่งนี้ให้มา แล้ว restart backend หลังเปลี่ยน `.env`

## พฤติกรรม

- ผู้ว่าจ้างเลือกผู้รับจ้าง แล้วเลือก Stripe ทดสอบหรือระบบจำลองเดิมในหน้าชำระเงิน
- Stripe ยืนยันชำระผ่าน webhook ที่ตรวจลายเซ็น หรือการตรวจ session จาก backend กับ Stripe โดยตรง ทั้งสองทางตรวจยอดและป้องกันอัปเดตซ้ำ URL กลับมาจาก Checkout ไม่ยืนยันการชำระเงิน
- หลังเปิด Checkout ผู้ว่าจ้างแนบสลิปหรือภาพหลักฐานเพิ่มเติมได้ที่หน้าชำระเงิน (JPEG, PNG, WebP ไม่เกิน 2 MB) ผ่าน `POST /api/payments/:jobId/stripe/slip` รูปเก็บเป็นข้อมูลส่วนตัวและเปิดดูได้เฉพาะเจ้าของรายการกับผู้ดูแล การแนบหรือเปลี่ยนรูปไม่เปลี่ยนโหมดหรือสถานะการเงิน และผู้ดูแลใช้รูปนี้อนุมัติข้าม Stripe ไม่ได้
- ในโหมดสลิปจำลอง ยืนยันงานแล้วเป็น `payout_pending` และจะเป็น `released` หลัง admin แนบสลิปจ่ายจำลอง ส่วนรายการ Stripe/ระบบจำลองเดิมยังไม่ใช่หลักฐานจ่ายผ่านธนาคาร
- ขอคืนเงินได้หลังชำระและก่อนยืนยันรับงาน พร้อมเหตุผลและภาพไม่เกิน 3 ภาพ ภาพละ 2 MB รูปเก็บเป็นข้อมูลส่วนตัวในฐานข้อมูล
- ระบบพักทั้งงานและรายการชำระด้วย transaction ผู้ดูแลต้องระบุเหตุผลเมื่ออนุมัติหรือปฏิเสธ
- ปฏิเสธแล้วคืนงานสู่สถานะก่อนยื่นคำขอ อนุมัติแล้วคืนเต็มจำนวนรวมค่าบริการ ไม่หักค่า gateway จากผู้ว่าจ้าง ในโหมดสลิปจำลองต้องรอ admin แนบสลิปคืนก่อนบันทึกคืนสำเร็จ
- Stripe คืนเงินเป็น `pending` จะยังแสดงรอดำเนินการ เมื่อได้รับผล `succeeded` จึงยืนยันคืนเงินและยกเลิกงาน กดซ้ำใช้ idempotency key เดิม
- หลักฐานการขอคืนเงินเปิดผ่าน API ที่ตรวจสิทธิ์เท่านั้น

## รายงาน

ช่วงเดือนและวันที่ใช้เขตเวลาไทย รวมวันสิ้นสุดทั้งวัน ยอดสะสมไม่เปลี่ยนตามตัวกรอง ส่วนยอดรายช่วงและรายการชำระแสดงช่วงเวลาที่ใช้ชัดเจน

รายงานผู้ดูแลแสดงยอดรับรวม ค่าธรรมเนียม gateway ค่าจ้างที่ยืนยัน คืนเงิน ค่าบริการแพลตฟอร์ม และยอดคงเหลือ ยอดคงเหลือรวมเงินพักและไม่ใช่กำไรสุทธิ หาก Stripe ยังไม่มี balance transaction ระบบจะแสดงค่าธรรมเนียมว่า “รอยืนยัน” โดยไม่แทนด้วยศูนย์

ยังต้องทดสอบ Checkout → webhook → ยืนยันรับงาน / ขอคืนเงินกับบัญชี Stripe test ของโครงการก่อนใช้งาน การทดสอบอัตโนมัติใช้ข้อมูลจำลองและไม่ได้เชื่อมบัญชี Stripe จริง ดูขั้นตอนและตารางตรวจรับใน [Stripe test กับบัญชีโครงการ](stripe-test-uat-th.md)

อ้างอิง: [Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create), [webhook](https://docs.stripe.com/events/manage-webhook-endpoints), [refunds](https://docs.stripe.com/api/refunds/create)
