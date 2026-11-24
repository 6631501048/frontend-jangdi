# โปรไฟล์ผู้ดูแลระบบ

สาเหตุเดิม: ปุ่มรูปโปรไฟล์ใน AdminLayout ชี้ไป `/profile` ซึ่งอยู่นอก layout ผู้ดูแล และหน้านั้นแสดง AppTopBar/AppRoleDrawer ของสมาชิก พร้อมข้อมูลรีวิว ประวัติประกาศ บัญชีธนาคาร และที่อยู่ อีกทั้ง guard และ login ตรวจ isProfileComplete ก่อนสิทธิ์ admin จึงอาจพาบัญชีผู้ดูแลไปกรอกโปรไฟล์สมาชิก

แก้ให้ `/admin/profile` เป็น child route ภายใน AdminLayout เข้าผ่านรูปโปรไฟล์มุมขวา โดยไม่มีรายการโปรไฟล์ในเมนูด้านข้าง ลิงก์เก่า `/profile`, `/profile/ratings`, `/profile/history` สำหรับ admin จะ redirect มาที่นี่ หน้าแรก/ฟอร์มประกาศที่ผูกบทบาทสมาชิกและ `/register` จะพา admin กลับ dashboard ผู้ดูแลโดยไม่ PATCH เปลี่ยน role

หน้า admin ใช้คอมโพเนนต์โปรไฟล์เดิมในโหมดผู้ดูแล แสดงเฉพาะรูป ชื่อ เบอร์โทร อีเมล และการเปลี่ยนรหัสผ่าน ไม่มี header/drawer สมาชิกซ้อนและไม่เรียก reviews/posts API การแก้ข้อมูลส่งเฉพาะ fullName/phone จึงไม่เขียนทับข้อมูลสมาชิกที่ไม่ได้แสดง ส่วน avatar/password ใช้ API เดิม

โปรไฟล์ hirer/worker คงข้อมูลเดิม ผู้ใช้ทั่วไปและผู้ที่ยังไม่ล็อกอินไม่สามารถเปิดหน้า admin profile ได้ การตรวจใช้บัญชีและ API จำลอง ไม่แก้บัญชีจริง

ผลตรวจ:

- `npm test`: 88 tests ผ่าน รวมใหม่ 5 กรณีสำหรับ admin profile และการรักษา member profile
- `npm run build`: ผ่าน
- [7 กลุ่ม browser checks](ui-review/admin-profile/checks.json): navigation/legacy URLs, incomplete admin profile, load/save failure/retry, role preservation, admin menu, admin login และ member/anonymous guards
- responsive/contrast/targets และปิด password dialog ด้วย Escape ที่ 320/390/768/1440px
- interaction/form checks เดิม 13 กรณีผ่าน

ภาพทดสอบ: [มือถือ](ui-review/admin-profile/admin-profile-390.png), [เดสก์ท็อป](ui-review/admin-profile/admin-profile-1440.png)
