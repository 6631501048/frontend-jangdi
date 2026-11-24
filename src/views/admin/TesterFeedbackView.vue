<script setup>
import {ref,onMounted,onBeforeUnmount,watch} from 'vue';
import api from '../../services/api';
import UserAvatar from '../../components/UserAvatar.vue';
import {useRoutePage} from '../../composables/useRoutePage';
const filter=ref('all'),items=ref([]),total=ref(0),totalPages=ref(1),loading=ref(false),error=ref(''),actionError=ref(''),success=ref(''),marking=ref('');
const page=useRoutePage(()=>load());let requestId=0,disposed=false;
const categories={general:'ความคิดเห็นทั่วไป',bug:'ปัญหาการใช้งาน',suggestion:'ข้อเสนอแนะ'};
const date=value=>value?new Date(value).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'}):'—';
async function load(){
 if(disposed)return;const current=++requestId;loading.value=true;error.value='';
 try{
  const {data}=await api.get('/admin/tester-feedback',{params:{status:filter.value,page:page.value}});
  if(disposed||current!==requestId)return;
  items.value=data.items||[];total.value=data.total||0;totalPages.value=Math.max(1,data.totalPages||1);page.value=data.page||1;
 }catch(err){if(!disposed&&current===requestId)error.value=err.response?.data?.message||'โหลดความคิดเห็นไม่สำเร็จ';}
 finally{if(!disposed&&current===requestId)loading.value=false;}
}
async function markRead(item){
 if(marking.value||item.status==='read')return;marking.value=item._id;actionError.value='';success.value='';
 try{
  await api.patch(`/admin/tester-feedback/${item._id}/read`);
  if(disposed)return;item.status='read';success.value='ทำเครื่องหมายอ่านแล้ว';await load();
 }catch(err){if(!disposed)actionError.value=err.response?.data?.message||'ทำเครื่องหมายไม่สำเร็จ กรุณาลองอีกครั้ง';}
 finally{if(!disposed)marking.value='';}
}
function changePage(next){if(loading.value||next<1||next>totalPages.value)return;page.value=next;load();}
watch(filter,()=>{page.value=1;load();});onMounted(load);onBeforeUnmount(()=>{disposed=true;requestId++;});
</script>
<template>
 <section class="jd-page feedback-inbox">
  <header class="inbox-heading"><div><p class="eyebrow">รับฟังและปรับปรุงไปด้วยกัน</p><h1>ความคิดเห็นจากผู้ทดสอบ</h1><p class="subtitle">ข้อเสนอแนะและปัญหาที่สมาชิกส่งถึงผู้ดูแล</p></div><button type="button" class="outline" :disabled="loading" @click="load">{{loading?'กำลังโหลด…':'รีเฟรช'}}</button></header>
  <div class="inbox-toolbar"><label for="feedback-status">สถานะ <select id="feedback-status" v-model="filter"><option value="all">ทั้งหมด</option><option value="new">ยังไม่ได้อ่าน</option><option value="read">อ่านแล้ว</option></select></label><span>{{total}} ความคิดเห็น</span></div>
  <p v-if="error" class="error" role="alert">{{error}} <button type="button" class="outline" @click="load">ลองใหม่</button></p>
  <p v-if="actionError" class="error" role="alert">{{actionError}}</p><p v-if="success" class="success" role="status">{{success}}</p>
  <div :aria-busy="loading"><p v-if="loading" class="muted" role="status">กำลังโหลดความคิดเห็น…</p><p v-else-if="!error&&!items.length" class="empty">ยังไม่มีความคิดเห็นในสถานะนี้</p>
   <ul class="feedback-list"><li v-for="item in items" :key="item._id" class="feedback-item">
    <div class="item-heading"><span class="author-avatar"><UserAvatar :src="item.author?.avatarUrl" :name="item.author?.fullName" /></span><div class="author-info"><strong>{{item.author?.fullName||'สมาชิกที่ไม่พร้อมแสดงชื่อ'}}</strong><span v-if="item.author?.email">{{item.author.email}}</span><span>{{item.role==='worker'?'ผู้รับจ้าง':'ผู้ว่าจ้าง'}} · {{date(item.createdAt)}}</span></div><span class="read-badge" :class="{unread:item.status==='new'}">{{item.status==='new'?'ยังไม่ได้อ่าน':'อ่านแล้ว'}}</span></div>
    <span class="category-label">{{categories[item.category]||'ความคิดเห็นทั่วไป'}}</span><p class="message">{{item.message}}</p>
    <p v-if="item.pagePath" class="page-context">หน้าที่เกี่ยวข้อง: <span>{{item.pagePath}}</span></p>
    <div class="item-footer"><span v-if="item.readAt" class="muted">อ่านเมื่อ {{date(item.readAt)}}</span><button type="button" class="outline" :disabled="!!marking||item.status==='read'" @click="markRead(item)">{{marking===item._id?'กำลังบันทึก…':item.status==='read'?'อ่านแล้ว':'ทำเครื่องหมายอ่านแล้ว'}}</button></div>
   </li></ul>
  </div>
  <nav class="pagination" aria-label="หน้าความคิดเห็นผู้ทดสอบ" :aria-busy="loading"><button type="button" class="outline" :disabled="loading||page<=1" @click="changePage(page-1)">ก่อนหน้า</button><span aria-live="polite">หน้า {{page}} / {{totalPages}}</span><button type="button" class="outline" :disabled="loading||page>=totalPages" @click="changePage(page+1)">ถัดไป</button></nav>
 </section>
</template>
<style scoped>
.feedback-inbox{max-width:1120px;margin:auto;padding:24px 20px 48px}.inbox-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px}.eyebrow{margin:0;color:var(--jd-brand);font-size:.8125rem;font-weight:600}h1{margin:6px 0 8px;font-size:1.5rem;line-height:1.5}.subtitle{margin:0;color:var(--jd-muted);font-size:.875rem;line-height:1.8}.outline{min-height:44px;padding:10px 14px;border:1px solid var(--jd-input-border);border-radius:10px;background:white;color:var(--jd-ink);font:inherit;font-size:.875rem}.outline:disabled{color:var(--jd-muted);background:var(--jd-subtle);border-color:var(--jd-line);cursor:default}.inbox-toolbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;font-size:.875rem;color:var(--jd-muted)}.inbox-toolbar label{display:flex;gap:10px;align-items:center}select{min-height:44px;padding:8px 12px;border:1px solid var(--jd-input-border);border-radius:10px;background:white;color:var(--jd-ink);font:inherit}.feedback-list{display:grid;gap:16px;margin:0;padding:0;list-style:none}.feedback-item{min-width:0;padding:22px;border:1px solid var(--jd-line);border-radius:18px;background:var(--jd-surface)}.item-heading{display:flex;align-items:flex-start;gap:12px}.author-avatar{display:block;flex:0 0 40px;width:40px;height:40px}.author-info{display:grid;gap:3px;min-width:0;flex:1}.author-info strong{font-size:.9375rem;overflow-wrap:anywhere}.author-info>span{font-size:.75rem;color:var(--jd-muted);overflow-wrap:anywhere}.read-badge{padding:5px 9px;border-radius:8px;font-size:.75rem;white-space:nowrap;color:var(--jd-muted);background:var(--jd-subtle)}.read-badge.unread{background:var(--jd-peach-soft);color:var(--jd-brand);font-weight:600}.category-label{display:inline-block;margin-top:18px;color:var(--jd-brand);font-size:.8125rem;font-weight:600}.message{margin:8px 0 14px;line-height:1.9;white-space:pre-wrap;overflow-wrap:anywhere}.page-context{margin:0;padding:10px 12px;border-radius:10px;background:var(--jd-canvas);color:var(--jd-muted);font-size:.75rem;overflow-wrap:anywhere}.item-footer{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:12px;margin-top:16px}.item-footer>.muted{margin-right:auto}.muted{font-size:.8125rem;color:var(--jd-muted)}.pagination{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:24px;font-size:.875rem}.empty{padding:40px 20px;text-align:center;background:var(--jd-surface);border:1px solid var(--jd-line);border-radius:18px;color:var(--jd-muted)}.error{color:var(--jd-danger);font-size:.875rem;line-height:1.8}.success{color:var(--jd-success);background:var(--jd-success-soft);padding:12px;border-radius:10px;font-size:.875rem}button:focus-visible,select:focus-visible{outline:3px solid var(--jd-brand);outline-offset:3px}@media(max-width:480px){.feedback-inbox{padding:20px 16px 36px}h1{font-size:1.25rem}.inbox-heading{flex-wrap:wrap}.feedback-item{padding:16px}.item-heading{flex-wrap:wrap}.read-badge{margin-left:52px}.pagination{gap:10px}.pagination .outline{padding:10px}}
</style>
