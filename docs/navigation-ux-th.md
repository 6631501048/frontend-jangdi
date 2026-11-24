# การแก้ Back / Forward และการเปลี่ยนหน้า

## ปัญหาและสิ่งที่แก้

- ปุ่มย้อนกลับเดิมพึ่งประวัติเบราว์เซอร์อย่างเดียว เมื่อเปิดจากลิงก์โดยตรงหรือกลับจาก Stripe อาจไม่มีหน้าก่อนหน้าในแอป เพิ่ม usePageNavigation และ fallback ตามหน้า/บทบาทให้ปุ่มย้อนกลับที่ใช้งานอยู่
- AppHeader เดิมใช้ `$emit('back') || goBack()` ซึ่งอาจเรียกตัวจัดการที่ผู้ใช้กำหนดและย้อนประวัติซ้ำ แก้ให้เลือกทำเพียงอย่างเดียว
- หน้าชำระเงินมีทางไปยังรายละเอียดงาน งานของฉัน และหน้าแรกแม้โหลดข้อมูลไม่สำเร็จ ปุ่มกลับรายละเอียดงานใช้ parent ที่แน่นอนและไม่ย้อนเข้า Stripe
- เมื่อเริ่มแอปด้วยลิงก์ return ของ Stripe แบบ success/cancelled ที่ไม่มี app history จะสร้าง parent ในประวัติหนึ่งรายการก่อนแสดงหน้าชำระเงิน เพื่อให้ปุ่ม Back ของเบราว์เซอร์มีปลายทางในแอป การมี query success ไม่ได้เปลี่ยนสถานะเงินเป็น paid
- Checkout ยังคงใช้ same-tab navigation และตรวจ HTTPS/hostname ของ Stripe เพิ่ม guard ป้องกันคำขอซ้ำ และไม่ redirect ถ้าผู้ใช้ออกจากหน้าไปแล้วขณะคำขอยังรออยู่
- ล็อกอิน/ออกจากระบบ/สลับบทบาท และยืนยันเลือกผู้รับจ้าง ใช้ replace สำหรับหน้าที่ไม่ควรย้อนกลับไปทำซ้ำ กรณีต้องล็อกอินใหม่จะรักษาหน้าปลายทางเดิม รวมถึง session หมดอายุ โดยจำกัด redirect ให้เป็นหน้าในแอปและตรงกับบทบาท
- ฟอร์มประกาศงาน ประกาศบริการ และขอใช้บริการ เก็บขั้นตอนใน query เพื่อให้ Back/Forward เปลี่ยนขั้นตอนโดยไม่ทำข้อมูลในฟอร์มหาย ย้าย keyboard focus ไปหัวข้อขั้นตอนใหม่; หากโหลด URL ขั้นตอนสรุปโดยไม่มี draft จะเริ่มขั้นตอนแรก
- แท็บงานของฉันของทั้งผู้ว่าจ้างและผู้รับจ้างเก็บ view/status ใน URL จึงกลับจากรายละเอียดไปยังแท็บเดิมได้
- หน้ารายการประกาศและจัดการประกาศของแอดมินเก็บ page ใน URL ป้องกันกดเกินขอบเขต/ระหว่างโหลด และปรับกลับหน้าสุดท้ายที่ยังมีอยู่เมื่อจำนวนหน้าลดลง ตัวควบคุมแบ่งหน้าอยู่คงที่ระหว่างโหลด พร้อม aria-busy และข้อความหมายเลขหน้าแบบ aria-live
- Router คืนตำแหน่ง scroll เมื่อใช้ browser Back/Forward โดยรอรายการที่โหลดแบบ asynchronous ในระยะเวลาจำกัด และมี catch-all สำหรับ URL ที่ไม่มีหน้ารองรับ

- หน้าที่มีรหัสงาน/บริการ/คำขอจับรหัสของ resource ตั้งแต่เปิดหน้า เพื่อไม่ให้คำขอที่ค้างอยู่ไปใช้ route.params ของหน้าถัดไปจนเรียก API ด้วย undefined เมื่อเปลี่ยนหน้าเร็ว

## การตรวจ

- `npm test`: 123 tests ผ่าน รวม navigation, header callback, Stripe pending/success/cancel, checkout request ที่เสร็จหลังออกจากหน้า, form history, list tabs และ pagination
- `npm run build` และ build สำหรับลิงก์แชร์ผ่าน
- `HIRER_PREVIEW_URL=http://localhost:5173 node scripts/check-navigation.cjs`: ผ่าน 19 journeys โดย Chrome ที่ความกว้าง 390 และ 1440 px รวม keyboard focus, browser Back/Forward, same-tab checkout, direct/new-tab payment return, form draft, original list tab, pagination และการล็อกอินใหม่จาก missing/expired session
- `node scripts/check-navigation.cjs --shared`: ใช้ตรวจโค้ด build ที่เสิร์ฟบนลิงก์ชั่วคราว โดย fixture API/Stripe ยังแยกจากข้อมูลจริง
- การทดสอบไม่ได้สร้างรายการชำระเงินจริงหรือแก้บัญชีจริง เป็น Stripe fixture ใน Chrome ไม่ได้ยืนยันกับอุปกรณ์ iOS/Safari หรือการจ่ายเงินจริงผ่านแอปธนาคาร

## ลิงก์แชร์

เปิด Tunnel ใหม่เนื่องจาก Tunnel เดิมถูก Cloudflare ปฏิเสธด้วย `Unauthorized: Tunnel not found` และ DNS เดิมใช้งานไม่ได้ จึงไม่สามารถคง URL เดิมได้ ดู URL ล่าสุดจาก .password-recovery/share/session.json และเพิ่ม URL ใหม่นั้นใน Authorized JavaScript origins ของ OAuth client เดิมก่อนทดสอบ Google Login

ตัวเปิดลิงก์เพิ่มการตรวจ public /health ทุก 30 วินาที หากติดต่อไม่ได้ 3 ครั้งติดต่อกันจะระบุ status เป็น degraded แทนการแจ้งว่า ready จากการมีโปรเซสในเครื่องอย่างเดียว ไม่เปลี่ยน URL ให้อัตโนมัติเพื่อไม่ให้การตั้งค่า Google origin เปลี่ยนโดยไม่ทราบ

เบราว์เซอร์ยังเป็นผู้ควบคุมประวัติเก่าบนโดเมนภายนอก แอปไม่สามารถปิดแท็บที่เบราว์เซอร์หรือแอปธนาคารสร้างเอง หรือแก้ประวัติข้ามโดเมนทั้งหมดได้ จึงเพิ่มทางออกในแอปและ parent สำหรับการกลับจาก Stripe แทนการพึ่งประวัติภายนอกเพียงอย่างเดียว

เอกสารอ้างอิง:

- https://router.vuejs.org/guide/advanced/scroll-behavior.html
- https://docs.stripe.com/payments/checkout/custom-success-page
