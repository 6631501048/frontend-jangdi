export const money = (value) => Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const paymentStatus = (status) => ({ pending: 'รอชำระเงิน', held: 'พักเงินรองานเสร็จ', released: 'ยืนยันรับงานแล้ว', disputed: 'รอพิจารณาคืนเงิน', refunded: 'คืนเงินแล้ว' })[status] || 'ไม่ทราบสถานะ';
export const dateTime = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
