<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useAuthStore } from '../../stores/auth';
import api from '../../services/api';
import UserAvatar from '../../components/UserAvatar.vue';
import AdminDecisionDialog from '../../components/AdminDecisionDialog.vue';
import { useAdminDecision } from '../../composables/useAdminDecision';
const auth = useAuthStore();
const { decision, askDecision, confirmDecision, cancelDecision } = useAdminDecision();
const users = ref([]), loading = ref(true), hasLoaded = ref(false), updatedAt = ref(null);
const search = ref(''), activeRole = ref('All'), activeStatus = ref('all'), page = ref(1);
const errorMessage = ref(''), actionError = ref(''), successMessage = ref('');
const selectedUser = ref(null), actionLoading = ref(null), detailPanel = ref(null);
const pageSize = 10;
let requestId = 0, selectedTrigger;
const roles = [{ value: 'All', label: 'ทั้งหมด' }, { value: 'Hirer', label: 'ผู้ว่าจ้าง' }, { value: 'Worker', label: 'ผู้รับจ้าง' }];
const metrics = computed(() => [
  { status: 'all', label: 'สมาชิกทั้งหมด', count: users.value.length, hint: 'ผู้ว่าจ้างและผู้รับจ้าง', tone: 'brand', path: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0' },
  { status: 'active', label: 'ใช้งานปกติ', count: users.value.filter(u => u.accountStatus === 'active').length, hint: 'พร้อมใช้งานในชุมชน', tone: 'green', path: 'M9 12l2 2 4-4M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0' },
  { status: 'warned', label: 'ได้รับคำเตือน', count: users.value.filter(u => u.accountStatus === 'warned').length, hint: 'ติดตามการใช้งาน', tone: 'yellow', path: 'M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0' },
  { status: 'suspended', label: 'ระงับบัญชี', count: users.value.filter(u => u.accountStatus === 'suspended').length, hint: 'พักการเข้าใช้งาน', tone: 'red', path: 'M9 9v6M15 9v6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0' },
]);
const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase();
  return users.value.filter(u => (activeRole.value === 'All' || u.currentRole === activeRole.value.toLowerCase()) &&
    (activeStatus.value === 'all' || u.accountStatus === activeStatus.value) &&
    (!q || [u.fullName, u.email, u.studentId].some(v => String(v || '').toLowerCase().includes(q))));
});
const pageCount = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / pageSize)));
const visibleUsers = computed(() => filteredUsers.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const rangeStart = computed(() => filteredUsers.value.length ? (page.value - 1) * pageSize + 1 : 0);
const rangeEnd = computed(() => Math.min(page.value * pageSize, filteredUsers.value.length));
const hasFilters = computed(() => !!search.value.trim() || activeRole.value !== 'All' || activeStatus.value !== 'all');
const busy = computed(() => !!actionLoading.value || !!decision.value);
const selectedIsProtected = computed(() => !!selectedUser.value && (selectedUser.value.isAdmin || String(selectedUser.value._id) === String(auth.user?._id)));
const history = computed(() => [...(selectedUser.value?.moderationHistory || [])].sort((a,b) => new Date(b.performedAt) - new Date(a.performedAt)));
const selectedEmail = computed(() => {
  const value = selectedUser.value?.email || 'ยังไม่ระบุอีเมล', at = value.indexOf('@');
  return at < 0 ? [value, ''] : [value.slice(0, at), value.slice(at)];
});
const statusNames = { active: 'ใช้งานปกติ', warned: 'ได้รับคำเตือน', suspended: 'ระงับบัญชี' };
const actionNames = { warn: 'แจ้งเตือนบัญชี', suspend: 'ระงับบัญชี', clear: 'คืนสถานะปกติ' };
function roleLabel(u) { return u.isAdmin ? 'ผู้ดูแลระบบ' : ({ hirer:'ผู้ว่าจ้าง', worker:'ผู้รับจ้าง' })[u.currentRole] || 'ยังไม่ระบุ'; }
function statusLabel(s) { return statusNames[s] || 'ยังไม่ระบุ'; }
function statusClass(s) { return ({ active:'green', warned:'yellow', suspended:'red' })[s] || 'neutral'; }
function date(value, withTime = false) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'ไม่ระบุ';
  return new Date(value).toLocaleString('th-TH', { day:'numeric', month:'short', year:'numeric', ...(withTime ? { hour:'2-digit', minute:'2-digit' } : {}) });
}
function roleCount(value) { return value === 'All' ? users.value.length : users.value.filter(u => u.currentRole === value.toLowerCase()).length; }
watch([search, activeRole, activeStatus], () => { page.value=1; selectedUser.value=null; actionError.value=''; successMessage.value=''; cancelDecision(); });
watch(pageCount, count => { page.value=Math.min(page.value,count); });
function resetFilters() { search.value=''; activeRole.value='All'; activeStatus.value='all'; }
async function loadUsers() {
  const id=++requestId; loading.value=true; errorMessage.value='';
  try {
    // Complete list from the existing API: counters and local filters share one snapshot.
    const {data}=await api.get('/admin/users');
    if(id!==requestId)return false;
    users.value=Array.isArray(data)?data:[];
    if(selectedUser.value)selectedUser.value=users.value.find(u=>u._id===selectedUser.value._id)||null;
    hasLoaded.value=true; updatedAt.value=new Date(); return true;
  } catch(error) { if(id===requestId)errorMessage.value=error.response?.data?.message||'โหลดรายชื่อผู้ใช้ไม่สำเร็จ กรุณาลองอีกครั้ง'; return false; }
  finally { if(id===requestId)loading.value=false; }
}
async function selectUser(user,event) {
  if(busy.value)return;
  selectedTrigger=event?.currentTarget; selectedUser.value=user; actionError.value=''; successMessage.value='';
  await nextTick();
  if(window.matchMedia?.('(max-width: 1000px)').matches)detailPanel.value?.scrollIntoView?.({behavior:'smooth',block:'start'});
  detailPanel.value?.focus({preventScroll:true});
}
function closeDetails() { if(busy.value)return; selectedUser.value=null; actionError.value=''; successMessage.value=''; if(selectedTrigger?.isConnected)selectedTrigger.focus(); }
async function statusAction(action) {
  const statuses={warn:'warned',suspend:'suspended',clear:'active'};
  if(!selectedUser.value||busy.value||selectedIsProtected.value||!statuses[action]||selectedUser.value.accountStatus===statuses[action])return;
  const target=selectedUser.value;
  const reason=await askDecision({title:actionNames[action],message:`บัญชี ${target.fullName||target.email||'สมาชิกที่เลือก'}`,
    notice:action==='suspend'?'บัญชีนี้จะเข้าใช้งานไม่ได้จนกว่าจะได้รับการคืนสถานะ กรุณาระบุเหตุผลให้ชัดเจน':action==='warn'?'เหตุผลจะถูกบันทึกไว้ในประวัติการจัดการบัญชี':'บัญชีจะกลับมาใช้งานได้ตามปกติ พร้อมบันทึกเหตุผลในประวัติ',
    requireReason:true,minLength:5,maxLength:500,confirmLabel:action==='suspend'?'ยืนยันระงับบัญชี':action==='warn'?'บันทึกคำเตือน':'ยืนยันคืนสถานะ'});
  if(reason===null||actionLoading.value||selectedUser.value?._id!==target._id)return;
  actionLoading.value=target._id; actionError.value=''; successMessage.value='';
  try {
    const {data}=await api.post(`/admin/users/${target._id}/suspend`,{action,reason:reason.trim()});
    const updated={...target,...data.user};
    users.value=users.value.map(u=>u._id===target._id?updated:u); selectedUser.value=updated;
    const refreshed=await loadUsers(); if(!selectedUser.value)selectedUser.value=updated;
    successMessage.value=refreshed?`อัปเดตบัญชีเป็น “${statusLabel(updated.accountStatus)}” แล้ว`:'อัปเดตสถานะแล้ว แต่ยังโหลดประวัติล่าสุดไม่ได้ กรุณารีเฟรชรายชื่อ';
  } catch(error) { actionError.value=error.response?.data?.message||'เปลี่ยนสถานะไม่สำเร็จ กรุณาลองอีกครั้ง'; }
  finally { actionLoading.value=null; }
}
onMounted(loadUsers);
onUnmounted(()=>{requestId+=1;});
</script>

<template>
  <section class="users jd-page">
    <header class="users-heading"><div><p class="eyebrow">ชุมชน JangDi</p><h1>จัดการผู้ใช้</h1><p class="page-description">ดูแลสมาชิกและติดตามสถานะบัญชีได้ในที่เดียว</p></div><button type="button" class="refresh-btn" aria-label="รีเฟรชรายชื่อ" :disabled="loading||busy" @click="loadUsers"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M18 18a8 8 0 0 1-13-3" /></svg><span>{{loading?'กำลังโหลด…':'รีเฟรชรายชื่อ'}}</span></button></header>
    <div class="member-summary" role="group" aria-label="สรุปสถานะสมาชิก กดเพื่อกรองรายชื่อ"><button v-for="metric in metrics" :key="metric.status" type="button" class="metric-card" :class="[{chosen:activeStatus===metric.status},metric.tone]" :aria-pressed="activeStatus===metric.status" :disabled="loading||busy" @click="activeStatus=metric.status"><span class="metric-top"><span>{{metric.label}}</span><span class="metric-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="metric.path" /></svg></span></span><strong>{{hasLoaded?metric.count.toLocaleString('th-TH'):'—'}}</strong><span class="metric-hint">{{metric.hint}}</span></button></div>
    <div class="workspace">
      <section class="directory-panel" aria-labelledby="members-title">
        <div class="directory-heading"><div><h2 id="members-title">รายชื่อสมาชิก <span class="count-pill">{{hasLoaded?users.length:'—'}}</span></h2><p>ค้นหาบัญชีที่ต้องการดูแล แล้วเปิดดูรายละเอียด</p></div><span v-if="updatedAt" class="updated-at">อัปเดต {{updatedAt.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}}</span></div>
        <div class="filter-area"><label class="search-box"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg><span class="sr-only">ค้นหาชื่อ อีเมล หรือรหัสนักศึกษา</span><input v-model="search" type="search" maxlength="100" placeholder="ค้นหาชื่อ อีเมล หรือรหัสนักศึกษา" :disabled="busy" /></label><div class="filter-row"><div class="role-tabs" role="group" aria-label="กรองบทบาทปัจจุบัน"><button v-for="role in roles" :key="role.value" type="button" :aria-pressed="activeRole===role.value" :class="{active:activeRole===role.value}" :disabled="busy" @click="activeRole=role.value">{{role.label}} <span>{{roleCount(role.value)}}</span></button></div><label class="status-filter"><span class="sr-only">สถานะบัญชี</span><select v-model="activeStatus" :disabled="busy"><option value="all">ทุกสถานะ</option><option value="active">ใช้งานปกติ</option><option value="warned">ได้รับคำเตือน</option><option value="suspended">ระงับบัญชี</option></select></label></div></div>
        <p v-if="errorMessage" class="inline-message error-box" role="alert">{{errorMessage}} <button type="button" :disabled="loading||busy" @click="loadUsers">ลองอีกครั้ง</button></p>
        <div class="result-bar"><p role="status" aria-live="polite">{{loading?'กำลังโหลดรายชื่อ…':`พบ ${filteredUsers.length.toLocaleString('th-TH')} บัญชี`}}</p><button v-if="hasFilters" type="button" class="reset-filters" :disabled="busy" @click="resetFilters">ล้างตัวกรอง</button><span v-else>เรียงจากสมาชิกใหม่</span></div>
        <div v-if="loading" class="directory-state" role="status"><span class="loading-symbol" aria-hidden="true"></span><strong>กำลังโหลดสมาชิก</strong><p>รอสักครู่ เรากำลังเตรียมรายชื่อให้คุณ</p></div>
        <div v-else-if="!hasLoaded&&errorMessage" class="directory-state"><strong>ยังแสดงรายชื่อไม่ได้</strong><p>ลองโหลดรายชื่ออีกครั้งได้จากปุ่มด้านบน</p></div>
        <template v-else-if="filteredUsers.length">
          <table class="members-table"><caption class="sr-only">รายชื่อสมาชิก กดดูบัญชีเพื่อจัดการสถานะและอ่านประวัติ</caption><thead><tr><th scope="col">สมาชิก</th><th scope="col">บทบาทปัจจุบัน</th><th scope="col">สถานะบัญชี</th><th scope="col"><span class="sr-only">รายละเอียดบัญชี</span></th></tr></thead><tbody><tr v-for="user in visibleUsers" :key="user._id" class="user-row" :class="{selected:selectedUser?._id===user._id}">
            <td class="identity-cell"><div class="member-identity"><span class="member-avatar"><UserAvatar :src="user.avatarUrl" :name="user.fullName||user.email||'สมาชิก'" :label="`รูปโปรไฟล์ ${user.fullName||'สมาชิก'}`" /></span><div><strong class="user-name">{{user.fullName||'ยังไม่ระบุชื่อ'}}</strong><span class="user-email">{{user.email||'ยังไม่ระบุอีเมล'}}</span><span class="student-id">{{user.studentId?`รหัส ${user.studentId}`:'ยังไม่ระบุรหัสนักศึกษา'}}</span></div></div></td>
            <td class="role-cell"><span class="mobile-label">บทบาทปัจจุบัน</span><span class="role-label">{{roleLabel(user)}}</span></td>
            <td class="status-cell"><span class="mobile-label">สถานะบัญชี</span><span class="status-badge" :class="statusClass(user.accountStatus)"><span class="status-dot" aria-hidden="true"></span>{{statusLabel(user.accountStatus)}}</span></td>
            <td class="inspect-cell"><button type="button" class="inspect-btn" :aria-label="`ดูรายละเอียดบัญชี ${user.fullName||user.email||'สมาชิก'}`" :aria-expanded="selectedUser?._id===user._id" aria-controls="user-detail" :disabled="busy" @click="selectUser(user,$event)">{{selectedUser?._id===user._id?'กำลังดู':'ดูบัญชี'}}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button></td>
          </tr></tbody></table>
          <div class="pagination"><p>แสดง {{rangeStart}}–{{rangeEnd}} จาก {{filteredUsers.length}} บัญชี</p><div><button type="button" aria-label="หน้ารายชื่อก่อนหน้า" :disabled="page===1||busy" @click="page--"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg></button><span>{{page}} / {{pageCount}}</span><button type="button" aria-label="หน้ารายชื่อถัดไป" :disabled="page===pageCount||busy" @click="page++"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button></div></div>
        </template>
        <div v-else class="directory-state"><span class="state-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg></span><strong>{{hasFilters?'ไม่พบสมาชิกที่ตรงกัน':'ยังไม่มีสมาชิกในรายชื่อ'}}</strong><p>{{hasFilters?'ลองเปลี่ยนคำค้น บทบาท หรือสถานะบัญชี':'รายชื่อจะปรากฏเมื่อมีสมาชิกในระบบ'}}</p><button v-if="hasFilters" type="button" class="empty-reset" @click="resetFilters">ดูสมาชิกทั้งหมด</button></div>
      </section>
      <aside id="user-detail" ref="detailPanel" class="user-inspector" tabindex="-1" aria-label="รายละเอียดบัญชีที่เลือก">
        <template v-if="selectedUser">
          <div class="inspector-heading"><p class="eyebrow">บัญชีที่เลือก</p><button type="button" class="close-details" aria-label="ปิดรายละเอียดผู้ใช้" :disabled="busy" @click="closeDetails">×</button></div>
          <div class="selected-identity"><span class="selected-avatar"><UserAvatar :src="selectedUser.avatarUrl" :name="selectedUser.fullName||selectedUser.email||'สมาชิก'" /></span><h2>{{selectedUser.fullName||'ยังไม่ระบุชื่อ'}}</h2><p>{{selectedEmail[0]}}<wbr />{{selectedEmail[1]}}</p><span class="status-badge" :class="statusClass(selectedUser.accountStatus)"><span class="status-dot" aria-hidden="true"></span>{{statusLabel(selectedUser.accountStatus)}}</span></div>
          <dl class="account-facts"><div><dt>รหัสนักศึกษา</dt><dd>{{selectedUser.studentId||'ไม่ระบุ'}}</dd></div><div><dt>บทบาทปัจจุบัน</dt><dd>{{roleLabel(selectedUser)}}</dd></div><div><dt>ยืนยันอีเมล</dt><dd>{{selectedUser.isEmailVerified?'ยืนยันแล้ว':'ยังไม่ยืนยัน'}}</dd></div><div><dt>เข้าร่วมเมื่อ</dt><dd>{{date(selectedUser.createdAt)}}</dd></div></dl>
          <section class="moderation-actions" aria-labelledby="moderation-title"><h3 id="moderation-title">จัดการสถานะบัญชี</h3><p class="helper">ทุกการเปลี่ยนสถานะต้องระบุเหตุผล</p><p v-if="selectedIsProtected" class="protected-note">บัญชีนี้ไม่สามารถเปลี่ยนสถานะจากหน้านี้ได้</p><p v-if="actionError" class="inline-message error-box" role="alert">{{actionError}}</p><p v-if="successMessage" class="inline-message success-box" role="status">{{successMessage}}</p>
            <div class="moderation-buttons"><button type="button" class="action-btn warn" :disabled="busy||selectedIsProtected||selectedUser.accountStatus==='warned'" @click="statusAction('warn')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" /></svg>แจ้งเตือน</button><button type="button" class="action-btn suspend" :disabled="busy||selectedIsProtected||selectedUser.accountStatus==='suspended'" @click="statusAction('suspend')"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></svg>ระงับบัญชี</button><button type="button" class="action-btn clear" :disabled="busy||selectedIsProtected||selectedUser.accountStatus==='active'" @click="statusAction('clear')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 12 3 3 5-6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0" /></svg>คืนสถานะปกติ</button></div>
          </section>
          <section class="moderation-history" aria-labelledby="history-title"><h3 id="history-title">ประวัติการจัดการ</h3><ol v-if="history.length"><li v-for="(entry,index) in history" :key="index"><span class="history-dot" :class="statusClass(entry.newStatus)" aria-hidden="true"></span><div><strong>{{actionNames[entry.action]||'เปลี่ยนสถานะบัญชี'}}</strong><time :datetime="entry.performedAt">{{date(entry.performedAt,true)}}</time><p>{{entry.reason}}</p></div></li></ol><p v-else class="helper">ยังไม่มีประวัติการจัดการบัญชี</p></section>
        </template>
        <div v-else class="inspector-empty"><span class="empty-people" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /></svg></span><h2>ดูแลสมาชิกทีละบัญชี</h2><p>กด “ดูบัญชี” จากรายชื่อ เพื่อดูข้อมูล สถานะ และประวัติการจัดการ</p><span class="inspector-tip">ตรวจสอบข้อมูลก่อนเปลี่ยนสถานะ</span></div>
      </aside>
    </div>
    <AdminDecisionDialog v-if="decision" v-bind="decision" @confirm="confirmDecision" @cancel="cancelDecision" />
  </section>
</template>

<style scoped>
.users{color:var(--jd-ink);min-width:0}svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}button,input,select{font:inherit}button:disabled{cursor:not-allowed}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.users-heading{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:28px}.eyebrow{margin:0 0 6px;color:var(--jd-brand);font-size:.8125rem;font-weight:700}.users-heading h1{margin:0;font-size:clamp(1.75rem,3vw,2.25rem);line-height:1.4;letter-spacing:-.03em}.page-description{margin:8px 0 0;color:var(--jd-muted);font-size:.9375rem}.refresh-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;flex-shrink:0;min-height:44px;padding:10px 16px;border:1px solid var(--jd-input-border);border-radius:12px;background:white;color:var(--jd-ink);font-size:.875rem}
.member-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:28px}.metric-card{display:flex;flex-direction:column;align-items:stretch;gap:8px;min-width:0;padding:18px 20px;text-align:left;border:1px solid var(--jd-line);border-radius:16px;background:white;color:var(--jd-ink);transition:border-color .15s,box-shadow .15s}.metric-card.chosen{border-color:var(--jd-brand);box-shadow:0 0 0 1px var(--jd-brand)}.metric-card:hover:not(:disabled){border-color:var(--jd-brand)}.metric-top{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.875rem;font-weight:600}.metric-icon{display:grid;place-items:center;width:32px;height:32px;flex-shrink:0;border-radius:10px;background:var(--jd-peach-soft);color:var(--jd-brand)}.metric-card.green .metric-icon{color:var(--jd-success);background:var(--jd-success-soft)}.metric-card.yellow .metric-icon{color:var(--jd-warning);background:var(--jd-warning-soft)}.metric-card.red .metric-icon{color:var(--jd-danger);background:var(--jd-danger-soft)}.metric-card strong{font-size:1.875rem;line-height:1.25;letter-spacing:-.03em}.metric-hint{font-size:.75rem;color:var(--jd-muted)}
.workspace{display:grid;grid-template-columns:minmax(0,1fr) 304px;gap:22px;align-items:start}.directory-panel,.user-inspector{min-width:0;border:1px solid var(--jd-line);border-radius:20px;background:white}.directory-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:22px 22px 18px}.directory-heading h2{display:flex;align-items:center;gap:10px;font-size:1.125rem;margin:0}.directory-heading p,.updated-at{margin:5px 0 0;color:var(--jd-muted);font-size:.8125rem}.updated-at{white-space:nowrap;font-size:.75rem}.count-pill{display:inline-grid;place-items:center;min-width:28px;min-height:24px;padding:1px 7px;border-radius:8px;background:var(--jd-peach-soft);color:var(--jd-brand);font-size:.75rem}
.filter-area{padding:0 22px 18px}.search-box{display:flex;gap:10px;align-items:center;padding:0 12px;border:1px solid var(--jd-input-border);border-radius:11px;color:var(--jd-muted)}.search-box:focus-within{outline:3px solid var(--jd-brand);outline-offset:2px}.search-box input{width:100%;min-width:0;min-height:46px;border:0;padding:10px 0;background:transparent;color:var(--jd-ink);font-size:.875rem}.search-box input::placeholder{color:var(--jd-muted);opacity:1}.search-box input:focus-visible{outline:none}.filter-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:14px}.role-tabs{display:flex;gap:3px;padding:4px;border-radius:11px;background:var(--jd-subtle)}.role-tabs button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:8px 11px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--jd-muted);font-size:.8125rem;white-space:nowrap}.role-tabs button.active{background:white;color:var(--jd-brand);border-color:var(--jd-line);box-shadow:0 1px 3px #100e0408;font-weight:700}.role-tabs button span{font-size:.75rem}.status-filter select{min-height:44px;max-width:100%;padding:8px 30px 8px 12px;border:1px solid var(--jd-input-border);border-radius:10px;color:var(--jd-ink);background:white;font-size:.8125rem}
.result-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 22px;border-block:1px solid var(--jd-line);background:var(--jd-canvas);font-size:.75rem;color:var(--jd-muted);min-height:48px}.result-bar p{margin:0}.reset-filters{min-height:44px;margin-block:-8px;border:0;padding:6px;background:transparent;color:var(--jd-brand);font-size:.8125rem;text-decoration:underline}
.members-table{width:100%;border-collapse:collapse;text-align:left;table-layout:fixed}.members-table th{padding:12px 12px;font-size:.75rem;font-weight:500;color:var(--jd-muted);border-bottom:1px solid var(--jd-line)}.members-table th:first-child{width:43%;padding-left:22px}.members-table th:nth-child(2){width:18%}.members-table th:nth-child(3){width:24%}.members-table th:last-child{width:15%}.members-table td{padding:16px 10px;border-bottom:1px solid var(--jd-line);vertical-align:middle}.members-table td:first-child{padding-left:22px}.members-table td:last-child{padding-right:16px}.user-row.selected{background:var(--jd-peach-soft)}.user-row:not(.selected):hover{background:var(--jd-canvas)}.member-identity{display:flex;align-items:center;gap:10px;min-width:0}.member-identity>div{min-width:0}.member-avatar{display:block;width:38px;height:38px;flex:0 0 38px}.member-avatar :deep(.user-avatar),.selected-avatar :deep(.user-avatar){color:var(--jd-brand);background:var(--jd-peach-soft)}.user-name,.user-email,.student-id{display:block;overflow-wrap:anywhere}.user-name{font-size:.875rem;font-weight:600}.user-email{margin-top:3px;font-size:.75rem;color:var(--jd-muted)}.student-id{margin-top:2px;font-size:.75rem;color:var(--jd-muted)}.role-label{font-size:.8125rem;color:var(--jd-muted)}
.green{--status-ink:var(--jd-success);--status-bg:var(--jd-success-soft)}.yellow{--status-ink:var(--jd-warning);--status-bg:var(--jd-warning-soft)}.red{--status-ink:var(--jd-danger);--status-bg:var(--jd-danger-soft)}.neutral{--status-ink:var(--jd-muted);--status-bg:var(--jd-subtle)}.status-badge{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:8px;font-size:.75rem;font-weight:600;white-space:nowrap;color:var(--status-ink);background:var(--status-bg)}.status-dot{width:5px;height:5px;border-radius:50%;background:currentColor}.inspect-btn{display:flex;align-items:center;justify-content:center;gap:3px;min-height:44px;width:100%;padding:7px 4px;border:1px solid var(--jd-line);border-radius:9px;background:white;color:var(--jd-brand);font-size:.75rem;white-space:nowrap}.inspect-btn svg{width:13px;height:13px}.user-row.selected .inspect-btn{border-color:var(--jd-brand)}.mobile-label{display:none}
.pagination{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 22px;font-size:.75rem;color:var(--jd-muted)}.pagination p{margin:0}.pagination>div{display:flex;align-items:center;gap:8px}.pagination button{display:grid;place-items:center;min-width:44px;min-height:44px;border:1px solid var(--jd-line);border-radius:9px;background:white;color:var(--jd-ink)}.pagination button:disabled{color:var(--jd-muted);background:var(--jd-subtle)}
.directory-state{display:flex;flex-direction:column;align-items:center;gap:10px;min-height:300px;padding:48px 24px;text-align:center}.directory-state strong{font-size:1rem}.directory-state p{max-width:300px;margin:0;font-size:.875rem;color:var(--jd-muted)}.state-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:14px;background:var(--jd-subtle);color:var(--jd-muted)}.empty-reset{min-height:44px;padding:10px 16px;border:1px solid var(--jd-brand);border-radius:10px;background:white;color:var(--jd-brand)}.loading-symbol{width:26px;height:26px;border:3px solid var(--jd-line);border-top-color:var(--jd-brand);border-radius:50%;animation:users-spin .8s linear infinite}@keyframes users-spin{to{transform:rotate(360deg)}}
.user-inspector{position:sticky;top:94px;padding:20px;scroll-margin-top:92px;max-height:calc(100dvh - 116px);overflow-y:auto}.user-inspector:focus{outline:3px solid var(--jd-brand);outline-offset:3px}.inspector-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.inspector-heading .eyebrow{margin:0}.close-details{display:grid;place-items:center;width:44px;min-height:44px;margin:-8px -8px -4px 0;border:0;border-radius:10px;background:transparent;color:var(--jd-muted);font-size:1.5rem}.selected-identity{padding:14px 0 20px;border-bottom:1px solid var(--jd-line)}.selected-avatar{display:block;width:56px;height:56px;margin-bottom:12px}.selected-identity h2{margin:0;font-size:1.125rem;line-height:1.5;overflow-wrap:anywhere}.selected-identity>p{margin:4px 0 12px;color:var(--jd-muted);font-size:.8125rem;overflow-wrap:anywhere}.account-facts{display:grid;grid-template-columns:1fr 1fr;gap:16px 12px;margin:20px 0}.account-facts dt{font-size:.75rem;color:var(--jd-muted)}.account-facts dd{margin:4px 0 0;font-size:.8125rem;font-weight:500;overflow-wrap:anywhere}.moderation-actions{padding:20px 0;border-block:1px solid var(--jd-line)}.user-inspector h3{margin:0 0 6px;font-size:.875rem}.helper{color:var(--jd-muted);font-size:.75rem;margin:0}.moderation-buttons{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}.action-btn{display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:10px 8px;border:1px solid transparent;border-radius:10px;font-size:.8125rem;font-weight:600}.action-btn svg{width:16px;height:16px}.action-btn.warn{color:var(--jd-warning);border-color:#dfc783;background:var(--jd-warning-soft)}.action-btn.suspend{color:var(--jd-danger);border-color:#e5b8af;background:var(--jd-danger-soft)}.action-btn.clear{grid-column:1/-1;color:var(--jd-ink);background:white;border-color:var(--jd-input-border)}.action-btn:disabled{opacity:.55}.protected-note{padding:10px;border-radius:8px;background:var(--jd-subtle);font-size:.75rem;color:var(--jd-muted)}
.moderation-history{padding-top:20px}.moderation-history ol{display:grid;gap:18px;list-style:none;margin:18px 0 0;padding:0}.moderation-history li{display:flex;align-items:flex-start;gap:10px}.history-dot{display:block;width:8px;height:8px;flex:0 0 8px;margin-top:7px;border-radius:50%;background:var(--status-ink,var(--jd-brand))}.moderation-history strong{display:block;font-size:.8125rem;font-weight:600}.moderation-history time{display:block;font-size:.75rem;color:var(--jd-muted);margin-top:2px}.moderation-history li p{font-size:.8125rem;color:var(--jd-muted);margin:6px 0 0;overflow-wrap:anywhere;white-space:pre-wrap}.inspector-empty{display:flex;flex-direction:column;align-items:center;padding:22px 0;text-align:center}.empty-people{display:grid;place-items:center;width:72px;height:72px;margin-bottom:20px;border-radius:22px;background:var(--jd-peach-soft);color:var(--jd-brand)}.empty-people svg{width:30px;height:30px}.inspector-empty h2{font-size:1rem;margin:0 0 8px}.inspector-empty p{font-size:.8125rem;color:var(--jd-muted);margin:0;line-height:1.8}.inspector-tip{display:block;margin-top:22px;padding-top:16px;border-top:1px solid var(--jd-line);color:var(--jd-muted);font-size:.75rem;width:100%}
.inline-message{border-radius:10px;padding:12px;font-size:.8125rem;overflow-wrap:anywhere}.error-box{color:var(--jd-danger);background:var(--jd-danger-soft)}.directory-panel>.error-box{margin:0 22px 16px}.error-box button{min-height:44px;border:0;padding:6px 8px;background:transparent;color:inherit;text-decoration:underline}.success-box{color:var(--jd-success);background:var(--jd-success-soft)}
@media(max-width:1100px){.workspace{grid-template-columns:minmax(0,1fr) 286px;gap:16px}.directory-heading,.filter-area{padding-inline:16px}.updated-at{display:none}}
@media(max-width:1000px){.workspace{grid-template-columns:minmax(0,1fr)}.user-inspector{position:static;max-height:none}.member-summary{gap:10px}.metric-card{padding:16px}.inspector-empty{padding:12px}}
@media(max-width:700px){
 .users-heading{align-items:flex-start;margin-bottom:22px;gap:12px}.page-description{font-size:.8125rem;max-width:230px}.refresh-btn{width:44px;padding:10px;gap:0}.refresh-btn>span{display:none}
 .member-summary{grid-template-columns:repeat(2,minmax(0,1fr));margin-bottom:22px}.metric-card{padding:14px;gap:8px}.metric-top{font-size:.75rem}.metric-icon{width:26px;height:26px;border-radius:8px}.metric-icon svg{width:16px;height:16px}.metric-card strong{font-size:1.75rem}.metric-hint{font-size:.75rem}
 .directory-heading{padding:18px 16px 14px}.directory-heading h2{font-size:1rem}.directory-heading p{font-size:.75rem}.filter-area{padding:0 16px 16px}.filter-row{align-items:stretch}.role-tabs{width:100%}.role-tabs button{flex:1;padding-inline:6px}.status-filter{width:100%}.status-filter select{width:100%}.result-bar{padding-inline:16px}
 .members-table,.members-table tbody{display:block}.members-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.members-table .user-row{display:grid;grid-template-columns:1fr 1fr;gap:14px 10px;padding:18px 16px;border-bottom:1px solid var(--jd-line)}.members-table td,.members-table td:first-child,.members-table td:last-child{display:block;border:0;padding:0}.identity-cell,.inspect-cell{grid-column:1/-1}.member-avatar{width:42px;height:42px;flex-basis:42px}.user-name{font-size:.9375rem}.user-email{font-size:.8125rem}.student-id{font-size:.75rem}.mobile-label{display:block;font-size:.75rem;color:var(--jd-muted);margin-bottom:5px}.status-badge{font-size:.75rem}.inspect-btn{width:100%;font-size:.8125rem}.inspect-btn svg{width:16px;height:16px}.pagination{flex-wrap:wrap;padding:14px 16px}.pagination>div{margin-left:auto}.directory-panel>.error-box{margin-inline:16px}
}
@media(prefers-reduced-motion:reduce){.loading-symbol{animation:none}.metric-card{transition:none}}
</style>
