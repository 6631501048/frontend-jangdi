# การเงินและ Stripe โหมดทดสอบ

โค้ดรองรับ Stripe Checkout สำหรับบัตรในโหมดทดสอบ และระบบจำลองเดิม ไม่เปิดใช้ live key และไม่มีระบบโอนเงินจริงให้ผู้รับจ้าง

## ตั้งค่า backend

ต้องใช้ Node.js 18 ขึ้นไป และ MongoDB replica set ที่รองรับ transaction เช่นเดียวกับขั้นตอนยืนยันรับงานเดิม ตั้งค่าใน `backend/.env` (ห้ามใส่ secret key ใน frontend):

```dotenv
CLIENT_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

สร้าง test webhook endpoint `POST /api/payments/stripe/webhook` และรับ event:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `refund.created`
- `refund.updated`

สำหรับ local development ใช้ Stripe CLI:

```sh
stripe listen --forward-to localhost:4000/api/payments/stripe/webhook
```

ใช้ webhook signing secret ที่คำสั่งนี้ให้มา แล้ว restart backend หลังเปลี่ยน `.env`

## พฤติกรรม

- ผู้ว่าจ้างเลือกผู้รับจ้าง แล้วเลือก Stripe ทดสอบหรือระบบจำลองเดิมในหน้าชำระเงิน
- Stripe ยืนยันชำระผ่าน webhook ที่ตรวจลายเซ็นและยอดเงินแล้วเท่านั้น URL กลับมาจาก Checkout ไม่ยืนยันการชำระเงิน
- สถานะ `released` หมายถึงผู้ว่าจ้างยืนยันรับงานและระบบบันทึกค่าจ้าง ไม่ใช่การโอนธนาคารให้ผู้รับจ้าง
- ขอคืนเงินได้หลังชำระและก่อนยืนยันรับงาน พร้อมเหตุผลและภาพไม่เกิน 3 ภาพ ภาพละ 2 MB รูปเก็บเป็นข้อมูลส่วนตัวในฐานข้อมูล
- ระบบพักทั้งงานและรายการชำระด้วย transaction ผู้ดูแลต้องระบุเหตุผลเมื่ออนุมัติหรือปฏิเสธ
- ปฏิเสธแล้วคืนงานสู่สถานะก่อนยื่นคำขอ อนุมัติแล้วคืนเต็มจำนวนรวมค่าบริการ ไม่หักค่า gateway จากผู้ว่าจ้าง
- Stripe คืนเงินเป็น `pending` จะยังแสดงรอดำเนินการ เมื่อได้รับผล `succeeded` จึงยืนยันคืนเงินและยกเลิกงาน กดซ้ำใช้ idempotency key เดิม
- หลักฐานการขอคืนเงินเปิดผ่าน API ที่ตรวจสิทธิ์เท่านั้น

## รายงาน

ช่วงเดือนและวันที่ใช้เขตเวลาไทย รวมวันสิ้นสุดทั้งวัน ยอดสะสมไม่เปลี่ยนตามตัวกรอง ส่วนยอดรายช่วงและรายการชำระแสดงช่วงเวลาที่ใช้ชัดเจน

รายงานผู้ดูแลแสดงยอดรับรวม ค่าธรรมเนียม gateway ค่าจ้างที่ยืนยัน คืนเงิน ค่าบริการแพลตฟอร์ม และยอดคงเหลือ ยอดคงเหลือรวมเงินพักและไม่ใช่กำไรสุทธิ หาก Stripe ยังไม่มี balance transaction ระบบจะแสดงค่าธรรมเนียมว่า “รอยืนยัน” โดยไม่แทนด้วยศูนย์

ยังต้องทดสอบ Checkout → webhook → ยืนยันรับงาน / ขอคืนเงินกับบัญชี Stripe test ของโครงการก่อนใช้งาน การทดสอบอัตโนมัติใช้ข้อมูลจำลองและไม่ได้เชื่อมบัญชี Stripe จริง

อ้างอิง: [Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create), [webhook](https://docs.stripe.com/events/manage-webhook-endpoints), [refunds](https://docs.stripe.com/api/refunds/create)
