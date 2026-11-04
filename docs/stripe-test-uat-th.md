# ข้อ 5 — Stripe test กับบัญชีโครงการ

วันที่เริ่มเตรียม: 5 พฤศจิกายน 2569

## สถานะ

เพิ่มการตรวจ readiness ที่ `GET /api/payments/stripe/status` (ต้อง login) และสคริปต์ตรวจค่าโดยไม่แสดง secret เพิ่มการป้องกันผลคืนเงินผิดรายการ/ผิดยอด/ผิดสกุลเงิน/โหมด live ตรวจ refund เดิมเมื่อทำซ้ำ และป้องกันผลที่มาช้าทับสถานะคืนสำเร็จ

หน้าชำระเงินแสดงความพร้อม แยกข้อความกลับจาก Checkout สำเร็จ/ยกเลิก และบอกสถานะคืนเงิน pending/failed โดยไม่อ้างว่าคืนเงินสำเร็จก่อน Stripe ยืนยัน

**ยังไม่ผ่าน UAT บัญชีโครงการ:** ตอนตรวจเริ่มงานยังไม่มี test key และ webhook secret ใน backend/.env ผล automated tests ใช้ Stripe/MongoDB จำลอง แม้ชุด HTTP จะเรียก Express routing, JWT/role middleware และตรวจลายเซ็น raw webhook จริง ก็ยังไม่แทนการทดสอบบัญชีโครงการ

ผลตรวจในรอบนี้: backend ผ่าน 115 ข้อ, frontend ผ่าน 20 ข้อ และ frontend production build ผ่าน ตรวจ config ครั้งท้ายยังไม่พบทั้งสองค่า จึงยังไม่ได้ส่งคำขอออนไลน์ถึง Stripe และยังไม่มี Checkout/Refund ID ของบัญชีโครงการ

## 1. ตั้งค่าบนเครื่องที่รัน backend

ใช้บัญชี sandbox/test ของโครงการ ค่า key กับ webhook ต้องเป็นบัญชี/สภาพแวดล้อมเดียวกัน ไม่ต้องตั้ง publishable key เพราะหน้ารับข้อมูลบัตรเป็น Stripe-hosted Checkout

แก้ `backend/.env` ด้วยตัวเอง ห้ามใส่ค่า secret ใน frontend, Git หรือส่งในแชท:

```dotenv
CLIENT_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_ค่าจริงจากบัญชีทดสอบ
STRIPE_WEBHOOK_SECRET=whsec_ค่าจริงของตัวรับwebhook
```

หากทดสอบคนละเครื่อง `CLIENT_URL` ต้องเป็น URL frontend ที่ browser ผู้ทดสอบเข้าได้ ไม่ใช้ localhost ของอีกเครื่อง

สำหรับ local development เปิด PowerShell อีกหน้าต่าง:

```powershell
stripe login
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,refund.created,refund.updated,refund.failed --forward-to localhost:4000/api/payments/stripe/webhook
```

นำ `whsec_...` ที่ listener ให้มาใส่ backend/.env แล้ว restart backend เปิด listener ค้างไว้ระหว่างทดสอบ หากเริ่ม listener ใหม่แล้วค่า secret เปลี่ยนต้องอัปเดตและ restart อีกครั้ง ไม่ใช้ secret ของ Dashboard endpoint แทน CLI listener

สำหรับ server ที่มี URL สาธารณะ ใช้ test webhook endpoint `https://<backend-host>/api/payments/stripe/webhook` พร้อม event ชุดเดียวกันและ secret ของ endpoint นั้น โดย raw body ต้องถึง backend ไม่ถูกแปลงก่อนตรวจลายเซ็น

## 2. ตรวจค่าก่อนทดสอบ

จากโฟลเดอร์ frontend:

```powershell
node scripts/check-stripe-test.cjs
node scripts/check-stripe-test.cjs --online
```

คำสั่งแรกตรวจการมีค่าตั้งต้น คำสั่งที่สองอ่าน `/v1/balance` จาก Stripe เพื่อตรวจ key และโหมด test โดยไม่สร้างรายการชำระเงิน ไม่แสดงยอดหรือ secret ค่า `webhookConfigured: true` ตรวจเพียงว่ามีค่า ยังไม่ยืนยันว่า webhook ส่งถึงและลายเซ็นตรง ต้องพิสูจน์ด้วยการชำระจริงในโหมดทดสอบ

เปิดหน้าชำระเงินใหม่หลัง restart หาก backend ตอบ readiness เป็น false ปุ่ม Stripe จะยังไม่เปิดให้ใช้ ปุ่มสลิปจำลองยังใช้ flow เดิมได้กับรายการที่ยังไม่เลือก Stripe

## 3. เตรียมข้อมูล

- บัญชี hirer เจ้าของงาน, worker ที่ถูกเลือก, hirer อีกคนที่ไม่เกี่ยวข้อง และ admin
- งานใหม่สถานะ assigned พร้อม Payment pending แยกงานสำหรับสำเร็จ/ยกเลิก/ล้มเหลว/คืนเงิน อย่าแก้สถานะใน DB เพื่อข้ามขั้นตอน
- เลือก worker ให้เรียบร้อย แล้ว hirer เปิดหน้าชำระเงิน → ทางเลือก Stripe โหมดทดสอบ
- ตรวจยอดจาก Payment ที่บันทึก: ค่าจ้าง + ค่าบริการ ไม่เปลี่ยนรายการเก่าตามค่า fee ใหม่ ตัวอย่างค่าจ้าง 100 ค่าบริการ 5% รวม 105 บาท worker มีค่าจ้าง 100 บาท
- ทดสอบอัตรา 5% และ 10% ด้วยรายการใหม่ตาม config ที่ทีมใช้ รวมกรณีทศนิยมและรายการที่มีค่าเพิ่มเติมตามประเภทงาน

ใช้เฉพาะบัตรทดสอบใน Stripe Checkout: สำเร็จ `4242 4242 4242 4242`, ถูกปฏิเสธทั่วไป `4000 0000 0000 0002` กรอกวันหมดอายุอนาคตและ CVC ทดสอบตาม [เอกสาร Stripe Testing](https://docs.stripe.com/testing) ห้ามใช้ข้อมูลบัตรจริง

## 4. ตารางตรวจรับบัญชีโครงการ

สถานะทุกแถวเริ่มเป็น “รอทดสอบ” ให้บันทึกผลจริงหลังดำเนินการ

| ID | ขั้นตอน | ผลที่ต้องได้ | ผลจริง |
| --- | --- | --- | --- |
| ST-01 | ชำระด้วยบัตรสำเร็จ | Checkout THB ยอดตรง server, webhook ตอบ 2xx, Payment held, เริ่มงานได้ | รอทดสอบ |
| ST-02 | กลับ/ยกเลิก Checkout ก่อนจ่าย | pending, ไม่เพิ่มยอดรับ, ไม่ให้เริ่มงาน เปิด Stripe ซ้ำได้ | รอทดสอบ |
| ST-03 | ใช้บัตรถูกปฏิเสธ แล้วลองใหม่ | Stripe แสดงปฏิเสธ, DB ยัง pending; บัตรสำเร็จจึง held | รอทดสอบ |
| ST-04 | ปิด listener แล้วชำระสำเร็จ | URL success อย่างเดียวไม่เปลี่ยนเป็น held; ส่ง event เดิมซ้ำหลังเปิด listener แล้วจึงยืนยัน | รอทดสอบ |
| ST-05 | ส่ง event สำเร็จเดิมซ้ำ | heldAt/ยอดรับไม่เพิ่มซ้ำ ไม่ย้อนสถานะงาน/เงินที่เดินต่อแล้ว | รอทดสอบ |
| ST-06 | hirer ขอคืน → admin ปฏิเสธ | กลับ held และสถานะงานก่อนขอคืน ไม่เรียก Stripe refund | รอทดสอบ |
| ST-07 | อีกงานขอคืน → admin อนุมัติ | คืนเต็มยอดรวมค่าบริการ; pending ยัง disputed, succeeded จึง refunded และงาน cancelled | รอทดสอบ |
| ST-08 | กดอนุมัติคืนซ้ำ/ส่ง refund event เดิมซ้ำ | มี refund เดียว ไม่คืนซ้ำ ไม่ย้อนจาก succeeded เป็น pending | รอทดสอบ |
| ST-09 | ยังไม่ login/worker/ผู้ว่าจ้างอื่นเรียก checkout | 401/403 ตามกรณี ไม่สร้าง Checkout ไม่เปลี่ยน mode/สถานะ | รอทดสอบ |
| ST-10 | เปลี่ยน payment/job ID เพื่อดูหรือขอคืนของผู้อื่น | ไม่เห็นข้อมูลและทำรายการไม่ได้; ผู้ใช้ทั่วไปเรียก admin refund ไม่ผ่าน | รอทดสอบ |
| ST-11 | ตรวจรายงาน hirer/worker/admin หลังชำระและคืน | ยอดรับ 105, คืน 105 ตามตัวอย่าง; fee gateway แยกจากค่าบริการ; worker ไม่ได้รับโอนเข้าธนาคาร | รอทดสอบ |
| ST-12 | ทำงาน → ส่งหลักฐาน → hirer ยืนยัน ในงานที่ไม่ขอคืน | งาน completed, รายงานอัปเดตตามกติกา; Stripe test ไม่ใช่สลิปจ่ายค่าจ้างจริง | รอทดสอบ |

ส่ง event เดิมด้วย Dashboard Resend ไปยัง endpoint ที่ตั้งไว้ หรือ Stripe CLI `stripe events resend <evt_id> --webhook-endpoint=<we_id>` สำหรับ endpoint ที่ลงทะเบียน ไม่ใช้คำสั่งนี้กับ CLI listener ที่ไม่มี webhook endpoint ID หากทดสอบ local ให้ดูแนวทาง event forwarding/retry ของ CLI และรหัส event จากการชำระของระบบจริง

`stripe trigger checkout.session.completed` สร้างข้อมูลตัวอย่างที่ไม่ได้ผูกกับ Job/Payment ในแอป จึงไม่ใช้เป็นหลักฐานผ่าน ST-01 ใช้ Checkout ที่สร้างจากหน้า JangDi เท่านั้น

## 5. ตรวจยอดและข้อจำกัด

เทียบ Payment ID, Checkout Session ID, PaymentIntent ID, Refund ID และยอดกับ Stripe Dashboard test เก็บในบันทึกทดสอบที่ทีมเข้าถึงได้ โดยไม่บันทึก secret, token หรือข้อมูลบัตร

ค่า gateway ใช้ข้อมูล balance transaction ถ้ายังไม่มีจะแสดง “รอยืนยัน” หากกรณี ST-11 ยังไม่ทราบค่า gateway ต้องติดตามและตรวจยอดอีกครั้ง ไม่ใช้ศูนย์แทนค่าที่ไม่ทราบ การ reconcile ค่าธรรมเนียมที่มาภายหลังยังไม่ได้มี job อัตโนมัติในรอบนี้

ระบบรองรับคืนเต็มจำนวนตาม flow ในแอป การคืนบางส่วน/คืนจาก Dashboard โดยข้ามการอนุมัติ และการกู้คืน refund ที่ failed/canceled ยังต้องให้ผู้ดูแลตรวจสอบ ไม่สร้าง refund ใหม่อัตโนมัติ การออกแบบการโอนเงินจริงให้ worker อยู่นอกการทดสอบนี้

อ้างอิงพฤติกรรม provider: [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment.md?ui=full-page), [Refunds](https://docs.stripe.com/refunds), [Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
