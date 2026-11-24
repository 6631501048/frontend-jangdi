<script setup>
import {computed,ref} from 'vue';
import {useRoute} from 'vue-router';
import api from '../services/api';
import {useAuthStore} from '../stores/auth';
import {homePath} from '../services/navigation';
import AppTopBar from '../components/AppTopBar.vue';
import AppRoleDrawer from '../components/AppRoleDrawer.vue';
const route=useRoute(),auth=useAuthStore();
const drawerOpen=ref(false),category=ref('general'),message=ref(''),sending=ref(false),error=ref(''),success=ref('');
const source=route.query.from;
const pagePath=typeof source==='string'&&source.startsWith('/')&&!source.startsWith('//')&&source.length<=200&&!/[?#\\\s]/.test(source)?source:'';
const valid=computed(()=>!!message.value.trim()&&message.value.trim().length<=2000);
async function submit(){
 if(sending.value||!valid.value)return;
 sending.value=true;error.value='';success.value='';
 try{
  const {data}=await api.post('/tester-feedback',{message:message.value.trim(),category:category.value,pagePath});
  success.value=data.message||'ส่งความคิดเห็นถึงผู้ดูแลแล้ว ขอบคุณที่ช่วยทดสอบ';message.value='';category.value='general';
 }catch(err){error.value=err.response?.data?.message||'ส่งความคิดเห็นไม่สำเร็จ กรุณาลองอีกครั้ง';}
 finally{sending.value=false;}
}
</script>
<template>
 <div class="jd-page feedback-page">
  <AppTopBar @menu="drawerOpen=true" />
  <AppRoleDrawer v-model="drawerOpen" />
  <main class="feedback-content">
   <RouterLink :to="homePath(auth.user)" class="back-link">‹ กลับหน้าแรก</RouterLink>
   <section class="feedback-card" aria-labelledby="feedback-heading">
    <p class="eyebrow">ช่วยให้ JangDi ใช้งานดีขึ้น</p><h1 id="feedback-heading">ส่งความคิดเห็นถึงผู้ดูแล</h1>
    <p class="intro">พบปัญหาหรือมีข้อเสนอแนะระหว่างทดสอบ บอกเราได้ที่นี่ ความคิดเห็นนี้ส่งให้ผู้ดูแลระบบ</p>
    <p v-if="success" class="success" role="status">{{success}}</p>
    <form @submit.prevent="submit" :aria-busy="sending">
     <label for="feedback-category">ประเภทความคิดเห็น</label>
     <select id="feedback-category" v-model="category" :disabled="sending"><option value="general">ความคิดเห็นทั่วไป</option><option value="bug">ปัญหาการใช้งาน</option><option value="suggestion">ข้อเสนอแนะ</option></select>
     <label for="feedback-message">ความคิดเห็นของคุณ</label>
     <textarea id="feedback-message" v-model="message" rows="7" maxlength="2000" required :disabled="sending" aria-describedby="feedback-hint feedback-count" placeholder="เช่น พบปัญหาที่หน้าไหน กดอะไรแล้วเกิดอะไรขึ้น หรืออยากให้ปรับส่วนใด"></textarea>
     <div class="field-help"><p id="feedback-hint">หากพบปัญหา ลองระบุขั้นตอนที่ทำ เพื่อให้เราตรวจสอบได้ง่ายขึ้น</p><span id="feedback-count">{{message.length}}/2000</span></div>
     <p v-if="error" class="error" role="alert">{{error}}</p>
     <button type="submit" class="submit" :disabled="sending||!valid">{{sending?'กำลังส่ง…':'ส่งความคิดเห็น'}}</button>
    </form>
   </section>
  </main>
 </div>
</template>
<style scoped>
.feedback-page{min-height:100vh;background:var(--jd-canvas)}.feedback-content{max-width:760px;margin:auto;padding:24px 16px 48px}.back-link{display:inline-flex;align-items:center;min-height:44px;margin-bottom:12px;color:var(--jd-brand);text-underline-offset:4px}.feedback-card{padding:28px;border:1px solid var(--jd-line);border-radius:22px;background:var(--jd-surface)}.eyebrow{margin:0;color:var(--jd-brand);font-size:.8125rem;font-weight:600}h1{margin:8px 0 12px;font-size:1.5rem;line-height:1.5;overflow-wrap:anywhere}.intro{margin:0 0 24px;color:var(--jd-muted);line-height:1.8;font-size:.9375rem}form{display:grid;gap:10px}label{margin-top:8px;font-size:.875rem;font-weight:600}select,textarea{width:100%;min-width:0;padding:12px;border:1px solid var(--jd-input-border);border-radius:12px;background:white;color:var(--jd-ink);font:inherit}select{min-height:48px}textarea{resize:vertical;line-height:1.8}.field-help{display:flex;align-items:flex-start;gap:12px;color:var(--jd-muted);font-size:.75rem;line-height:1.8}.field-help p{margin:0}.field-help span{margin-left:auto;white-space:nowrap}.submit{min-height:48px;margin-top:8px;padding:12px;border:1px solid var(--jd-brand);border-radius:12px;background:var(--jd-brand);color:white;font:inherit;font-weight:600}.submit:disabled{background:var(--jd-subtle);border-color:var(--jd-line);color:var(--jd-muted);cursor:default}.success{padding:12px 16px;background:var(--jd-success-soft);color:var(--jd-success);border-radius:12px;line-height:1.8}.error{margin:0;color:var(--jd-danger);font-size:.875rem}a:focus-visible,button:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid var(--jd-brand);outline-offset:3px}@media(max-width:420px){.feedback-card{padding:20px}h1{font-size:1.25rem}.field-help{flex-wrap:wrap}}
</style>

