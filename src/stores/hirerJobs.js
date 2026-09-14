import { defineStore } from "pinia";

/**
 * สถานะฝั่ง Hirer: งานที่ประกาศ + ผู้สมัคร + การเลือกช่าง (FR-JOB-08, FR-MATCH-03/04/05/06)
 * NOTE: ข้อมูลด้านล่างเป็น mock data สำหรับ demo หน้าจอเท่านั้น
 * ของจริงให้แทนที่ actions ด้วยเรียก src/services/api.js ตาม endpoint ที่ระบุใน TODO comment แต่ละจุด
 */
export const useHirerJobsStore = defineStore("hirerJobs", {
  state: () => ({
    jobs: [
      {
        id: "job-1",
        title: "Buy Food From Hackhaus",
        category: "จัดส่ง",
        description: "Buy food and drink from Hackhaus and deliver to Lamduan 2",
        from: { label: "Hackhaus", address: "Restaurant zone, MFU main campus" },
        to: { label: "Lamduan 2", address: "Lamduan 2 Dormitory, MFU" },
        durationLabel: "1 hr",
        price: 50,
        serviceFee: 29,
        total: 79,
        notes: "",
        status: "waiting", // waiting | in_progress | completed | cancelled
        statusLabel: "Waiting for Selection",
        createdAt: "2026-08-15T09:00:00",
        scheduledLabel: "09:00 - 10:00",
        applicants: [
          { id: "w-john", name: "John", rating: 4.6, distanceKm: 1.5 },
          { id: "w-jane", name: "Jane", rating: 4.8, distanceKm: 0.9 },
          { id: "w-mike", name: "Mike", rating: 4.5, distanceKm: 1.4 },
        ],
        selectedWorker: null,
        timeline: [],
        cancellation: null,
        proofPhoto: null,
        review: null,
      },
      {
        id: "job-2",
        title: "Buy Food From Hackhaus",
        category: "จัดส่ง",
        description: "Buy food and drink from Hackhaus and deliver to Lamduan 2",
        from: { label: "Hackhaus", address: "Restaurant zone, MFU main campus" },
        to: { label: "Lamduan 2", address: "Lamduan 2 Dormitory, MFU" },
        durationLabel: "1 hr",
        price: 50,
        serviceFee: 29,
        total: 79,
        notes: "",
        status: "in_progress",
        statusLabel: "In Progress",
        createdAt: "2026-08-14T09:00:00",
        scheduledLabel: "09:00 - 10:00",
        applicants: [],
        selectedWorker: { id: "w-john", name: "John", rating: 4.6, phone: "066-xxx-xxxx" },
        timeline: [
          { label: "Waiting", time: "08:55", done: true },
          { label: "In Progress", time: "09:05", done: true, current: true },
          { label: "On the way", time: "", done: false },
          { label: "Completed", time: "", done: false },
        ],
        cancellation: null,
        proofPhoto: null,
        review: null,
      },
      {
        id: "job-3",
        title: "Laundry Washing",
        category: "ทำความสะอาด",
        description: "Wash and fold laundry, 1 basket",
        from: { label: "Lamduan 3", address: "Lamduan 3 Dormitory, MFU" },
        to: { label: "Lamduan 3", address: "Lamduan 3 Dormitory, MFU" },
        durationLabel: "1.5 hr",
        price: 100,
        serviceFee: 10,
        total: 110,
        notes: "",
        status: "completed",
        statusLabel: "Completed",
        createdAt: "2026-08-10T13:00:00",
        scheduledLabel: "13:00 - 14:30",
        applicants: [],
        selectedWorker: { id: "w-john", name: "John", rating: 4.6 },
        timeline: [
          { label: "Waiting", time: "12:55", done: true },
          { label: "In Progress", time: "13:00", done: true },
          { label: "On the way", time: "13:05", done: true },
          { label: "Completed", time: "14:20", done: true },
        ],
        cancellation: null,
        proofPhoto: null,
        review: null,
      },
      {
        id: "job-4",
        title: "Cleaning Room",
        category: "ทำความสะอาด",
        description: "Clean and tidy a dorm room",
        from: { label: "Hackhaus", address: "Restaurant zone, MFU main campus" },
        to: { label: "Lamduan 2", address: "Lamduan 2 Dormitory, MFU" },
        durationLabel: "1 hr",
        price: 50,
        serviceFee: 20,
        total: 70,
        notes: "",
        status: "cancelled",
        statusLabel: "Cancelled",
        createdAt: "2026-08-09T10:00:00",
        scheduledLabel: "10:00 - 11:00",
        applicants: [],
        selectedWorker: null,
        timeline: [],
        cancellation: {
          cancelledBy: "Hirer",
          reason: "I found a friend to help me with the job.",
        },
        proofPhoto: null,
        review: null,
      },
    ],
    // เก็บผู้สมัครที่ถูกเลือกไว้ชั่วคราวระหว่างหน้า "Confirm Selection" (ยังไม่ได้ Confirm & Pay จริง)
    pendingSelection: null,
  }),
  getters: {
    byId: (state) => (id) => state.jobs.find((j) => j.id === id),
    byStatus: (state) => (status) => state.jobs.filter((j) => j.status === status),
  },
  actions: {
    // FR-MATCH-03/04: เตรียมเลือกผู้สมัครก่อนไปหน้ายืนยัน+ชำระเงิน
    stageWorkerSelection(jobId, workerId) {
      const job = this.byId(jobId);
      const worker = job?.applicants.find((a) => a.id === workerId);
      this.pendingSelection = job && worker ? { jobId, worker } : null;
    },
    // FR-MATCH-04/05/06, FR-PAY-01: ยืนยันเลือกช่าง + เข้า escrow (Pending -> Held)
    confirmSelectionAndPay(jobId) {
      // TODO: POST /api/jobs/:id/select { workerId } แล้ว backend จะตั้ง PAYMENT.status = "held"
      const job = this.byId(jobId);
      if (!job || !this.pendingSelection || this.pendingSelection.jobId !== jobId) return null;
      const worker = this.pendingSelection.worker;
      job.selectedWorker = { id: worker.id, name: worker.name, rating: worker.rating };
      job.status = "in_progress";
      job.statusLabel = "In Progress";
      job.applicants = [];
      job.timeline = [
        { label: "Waiting", time: nowLabel(), done: true },
        { label: "In Progress", time: nowLabel(), done: true, current: true },
        { label: "On the way", time: "", done: false },
        { label: "Completed", time: "", done: false },
      ];
      this.pendingSelection = null;
      return job;
    },
    // FR-TRACK-04: Hirer ยืนยันงานเสร็จหลังตรวจรูปหลักฐาน -> ปล่อยเงินจาก escrow
    confirmCompletion(jobId) {
      // TODO: POST /api/jobs/:id/confirm-completion (ปลด PAYMENT.status = "released")
      const job = this.byId(jobId);
      if (!job) return;
      job.status = "completed";
      job.statusLabel = "Completed";
      job.timeline.forEach((t) => (t.done = true));
    },
    // FR-JOB-07, FR-PAY-06: ยกเลิกงาน / ขอคืนเงิน
    submitRefundRequest(jobId, reason) {
      // TODO: POST /api/payments/:jobId/refund-request { reason } (FR-PAY-06/07)
      const job = this.byId(jobId);
      if (!job) return;
      job.status = "cancelled";
      job.statusLabel = "Cancelled";
      job.cancellation = { cancelledBy: "Hirer", reason };
    },
    // FR-REV-01: Hirer ให้คะแนน + รีวิว Worker หลังงานเสร็จ
    submitReview(jobId, { rating, tags, comment }) {
      // TODO: POST /api/feedback { jobId, rating, tags, comment } (FR-REV-01, FR-REV-03 recalculates credibility)
      const job = this.byId(jobId);
      if (!job) return;
      job.review = { rating, tags, comment };
    },
  },
});

function nowLabel() {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}