# เปลี่ยนหน้าต่าง localhost says เป็น UI ภายในเว็บ

ตรวจ source ใต้ `src` ทุกไฟล์ Vue/JS/TS และพบ browser-native dialog ที่ยังใช้งานจริง 9 จุดใน 4 ส่วน (ไม่นับ comment ของ Google One Tap ซึ่งไม่ใช่ browser-native prompt ที่ใช้งานอยู่)

| หน้า/ส่วน | ตำแหน่ง | การแก้ |
| --- | --- | --- |
| ผู้สมัครงานของผู้ว่าจ้าง | `/hirer/my-jobs/:id/applicants` | เปลี่ยน confirm ลบงานเลยเวลาที่ไม่มีผู้สมัครเป็น DecisionDialog เดิมของเว็บ ยืนยันแล้วเรียก cancel API เดิม |
| รายละเอียด/ติดตามงานของผู้รับจ้าง | `/worker/jobs/:id/tracking` | เปลี่ยน confirm ส่ง SOS และ confirm ส่งโดยไม่มีพิกัดเป็น DecisionDialog; เปลี่ยน alert สำเร็จ/ผิดพลาดเป็นข้อความในกล่อง SOS |
| โปรไฟล์สมาชิกและผู้ดูแล | `/profile`, `/admin/profile` | เปลี่ยน alert ตรวจรหัส/ส่งไม่สำเร็จเป็นข้อความใน modal และแจ้งสำเร็จในหน้าโปรไฟล์ คง session เมื่อรหัสเดิมผิด |
| เมนูสลับบทบาทของสมาชิก | หน้า `/hirer`, `/worker/feed`, `/profile`, `/profile/ratings`, `/profile/history` ที่ใช้ AppRoleDrawer | เปลี่ยน alert เมื่อสลับบทบาทไม่สำเร็จเป็นข้อความใน drawer พร้อมลองใหม่ได้ |

หน้าขอคืนเงินตามรูป (`/hirer/my-jobs/:id/refund`) เปลี่ยนเป็น DecisionDialog ไว้ก่อนรอบนี้แล้ว ตรวจซ้ำด้วย browser และโค้ดที่ localhost:5173 เสิร์ฟจริง ไม่พบ window.confirm ในหน้านี้ การยืนยันคืนเงินจากทั้งสองสถานะงานยังใช้ฟอร์มภายในเว็บ

สำหรับ SOS ยังคงต้องยืนยันก่อนส่ง รวมกรณีส่งโดยไม่มีพิกัด ถ้ายกเลิกหรือออกจากหน้าระหว่างรอ geolocation จะไม่ส่ง SOS ตามหลัง ไม่เปลี่ยน SOS API หรือข้อมูลคำขอ

## ผลตรวจ

- เพิ่ม static AST regression test ตรวจไม่ให้มีการเรียก alert/confirm/prompt แบบ global หรือ window/globalThis/self กลับเข้ามาใน application scripts
- `npm test`: 96 tests ผ่าน รวมการยืนยัน/ยกเลิก SOS, GPS สำเร็จ/ล้มเหลว/ไม่มี API/throw, การออกจากหน้าก่อนรับตำแหน่ง, role retry และรหัสผ่านของ member/admin
- `npm run build`: ผ่าน
- [Browser checks ใหม่](ui-review/page-dialogs/checks.json): 9 กลุ่มผ่าน โดยแทน native dialog functions ให้ throw เพื่อจับหากโค้ดยังเรียกใช้ ครอบคลุมมือถือ/เดสก์ท็อปและ contrast/names/target ที่ 320/390/768/1440px
- [Refund checks](ui-review/hirer-refund/checks.json): 4 กลุ่มผ่าน
- interaction/form checks เดิม 13 กรณีผ่าน
- ตรวจ transformed modules จาก Vite ที่ localhost:5173 ทั้ง 5 คอมโพเนนต์ข้างต้น ตอบ 200 และไม่มี window.alert/confirm/prompt calls

การทดสอบใช้ API และ geolocation จำลอง ไม่ส่ง SOS จริง ไม่ยกเลิกงานจริง ไม่ขอคืนเงินจริง และไม่เปลี่ยนรหัสบัญชีจริง

ภาพตัวอย่าง: [ยืนยันลบงานหมดเวลา](ui-review/page-dialogs/expired-job-confirm-390.png), [SOS ไม่มีพิกัด](ui-review/page-dialogs/sos-without-location-390.png), [รหัสผ่านผิด](ui-review/page-dialogs/password-error-admin-390.png), [สลับบทบาทผิดพลาด](ui-review/page-dialogs/role-error-hirer-390.png)

หากแท็บที่เปิดค้างยังเห็นหน้าต่างเดิม ให้ Ctrl+Shift+R เพื่อโหลด frontend ปัจจุบัน ไม่ต้อง restart backend สำหรับการแก้ UI รอบนี้
