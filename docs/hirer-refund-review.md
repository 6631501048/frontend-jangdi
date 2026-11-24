# ตรวจข้อสังเกตจากตารางทดสอบ Hirer

## เอารูปหลักฐานออก

แก้หน้า HirerRefundRequestView ให้เลือกรูปเพิ่มและเอาออกทีละภาพได้ พร้อมชื่อไฟล์และจำนวนที่เลือก เอารูปออกทั้งหมดแล้วเลือกรูปเดิมใหม่ได้ การเลือกไฟล์ผิดประเภท เกินขนาด หรือเกิน 3 ภาพจะเก็บรูปเดิมไว้ รูปที่เอาออกไม่ถูกใส่ใน FormData และ object URL ถูกคืนหน่วยความจำ

## หน้าต่างที่แสดง localhost

พบ window.confirm ในการส่งคำขอคืนเงิน ซึ่งเป็นหน้าต่างเบราว์เซอร์ที่แสดง origin ของเว็บ แก้เป็น DecisionDialog เดิมของโปรเจกต์ ยืนยัน/ยกเลิก/Escape ได้ภายในหน้าเดิม คง API `/payments/:jobId/refund-request` และตรวจว่าสถานะยัง held ก่อนส่งจริง

ข้อสังเกต “localhost ทั้งสอง” ยังรอผู้ใช้ยืนยันว่าหมายถึงหน้าต่างนี้หรือ URL ที่ถูกเปิด หากเป็น URL ที่พาออกไป localhost ต้องตรวจหน้า/URL ต้นทางเพิ่มเติม ไม่ได้เปลี่ยน Stripe redirect หรือ environment โดยเดาโดเมน

## คำขอบริการบน feed

ตรวจ controller กับฐานข้อมูลจริงแบบอ่านอย่างเดียว: งานที่ขึ้น feed 2 รายการ ไม่มี originServiceRequest ปะปน (0 รายการ) โค้ดสร้างงานจากคำขอบริการให้สถานะ assigned ซึ่งไม่ผ่านเงื่อนไข public feed ที่รับเฉพาะ waiting

หน้า hirer มีแถบ “คำขอใช้บริการของฉัน” เป็นทางลัดไป `/hirer/my-jobs?view=services` ตาม flow เดิม ข้อสังเกตในตารางยังรอแยกว่าหมายถึงแถบนี้ การ์ดในรายการ หรือปุ่มรับบริการ จึงยังไม่เปลี่ยนส่วนนี้

## ผลตรวจ

- Frontend 83 tests ผ่าน รวมใหม่ 6 กรณีสำหรับ evidence, confirmation, exact FormData, failure/retry, status race และ leaving page
- Production build ผ่าน
- [Browser checks](ui-review/hirer-refund/checks.json) ผ่าน 4 กลุ่ม รวมสองทางเข้าจากรายละเอียดงาน (assigned/awaiting_confirmation), การเอารูปออก/เลือกใหม่/validation, responsive/contrast/targets/Escape ที่ 320/390/768/1440px และ API failure/retry
- Browser intercept API ทั้งหมดและใช้บัญชี/รูปจำลอง ไม่มีการส่งคำขอคืนเงินจริงหรือเปลี่ยนรายการชำระเงินในฐานข้อมูล

ภาพ: [รูปหลักฐาน](ui-review/hirer-refund/evidence-390.png), [กล่องยืนยัน](ui-review/hirer-refund/confirmation-390.png)
