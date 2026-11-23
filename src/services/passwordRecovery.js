export function passwordValidationMessage(password, confirm) {
  if (typeof password !== 'string' || password.length < 8) return 'ใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร';
  if (new TextEncoder().encode(password).length > 72) return 'รหัสผ่านยาวเกินไป กรุณาใช้ไม่เกิน 72 ไบต์ (ภาษาไทยประมาณ 24 ตัวอักษร)';
  if (password !== confirm) return 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน';
  return '';
}

export function recoveryToken(hash) {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('token') || '';
  return /^[a-f0-9]{64}$/.test(token) ? token : '';
}
