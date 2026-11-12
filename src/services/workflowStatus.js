// Job state and payment state are separate. A refund pauses or ends the job.
export function effectiveJobStatus(status, payment) {
  const paymentStatus = typeof payment === 'string' ? payment : payment?.status;
  if (paymentStatus === 'refunded') return 'cancelled';
  if (['disputed', 'refund_pending'].includes(paymentStatus)) return 'disputed';
  return status;
}

export function requestWorkflowStatus(request) {
  const paymentStatus = request.paymentStatus || request.resultingJob?.paymentStatus;
  if (['refunded', 'refund_pending', 'disputed'].includes(paymentStatus)) return paymentStatus;
  return request.jobStatus || request.resultingJob?.status || request.status;
}

export const workflowLabels = {
  pending: 'รอการตอบรับ', accepted: 'รับคำขอแล้ว', declined: 'ปฏิเสธแล้ว',
  assigned: 'รับคำขอแล้ว รอเริ่มงาน', in_progress: 'กำลังดำเนินงาน',
  awaiting_confirmation: 'รอผู้ว่าจ้างตรวจรับงาน', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก',
  disputed: 'รอพิจารณาคืนเงิน', refund_pending: 'อนุมัติแล้ว รอแอดมินคืนเงิน', refunded: 'คืนเงินแล้ว',
};
export function requestWorkflowLabel(request) {
  if (request.status === 'declined') {
    return ({ capacity: 'ไม่ได้รับเลือก (ผู้รับจ้างรับงานครบแล้ว)', refund: 'คำขอปิดแล้ว (บริการปิดหลังคืนเงิน)',
      post_closed: 'คำขอปิดแล้ว', expired: 'คำขอหมดเวลา', worker_declined: 'ผู้รับจ้างไม่รับคำขอ' })[request.declineReason] || 'ผู้รับจ้างไม่รับคำขอ';
  }
  return workflowLabels[requestWorkflowStatus(request)] || 'กำลังตรวจสอบสถานะ';
}

export function servicePostWorkflowStatus(post, requests) {
  if (post.status === 'pending_review') return 'pending_review';
  const states = requests.map(requestWorkflowStatus);
  // A listing can contain several independent orders; active work takes priority.
  if (states.some(status => ['assigned', 'in_progress', 'awaiting_confirmation'].includes(status))) return 'in_progress';
  if (states.includes('refund_pending')) return 'refund_pending';
  if (states.includes('disputed')) return 'disputed';
  if (post.status === 'closed' && post.closeReason === 'refund') return 'refunded';
  if (states.includes('accepted')) return 'unknown';
  if (states.includes('pending')) return 'waiting';
  if (states.includes('completed')) return 'completed';
  if (states.includes('refunded')) return 'refunded';
  if (states.some(status => ['declined', 'cancelled'].includes(status)) ||
      ['rejected', 'expired'].includes(post.status) || (post.status === 'closed' && post.closeReason === 'manual')) return 'cancelled';
  return post.status === 'active' ? 'waiting' : 'cancelled';
}
