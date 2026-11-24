<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api';
import AppHeader from '../components/AppHeader.vue';
import UserAvatar from '../components/UserAvatar.vue';
import UserContactEmail from '../components/UserContactEmail.vue';
const profileId=useRoute().params.id;
const profile=ref(null),reviews=ref([]),loading=ref(true),error=ref(''),reviewsError=ref('');
let disposed=false;
async function load(){
 loading.value=true;error.value='';reviewsError.value='';
 try{
  const [person,feedback]=await Promise.all([
   api.get(`/users/${profileId}`),
   api.get(`/users/${profileId}/reviews`).catch(()=>{if(!disposed)reviewsError.value='ยังโหลดรีวิวไม่ได้';return {data:{reviews:[]}};}),
  ]);
  if(disposed)return;
  profile.value=person.data;reviews.value=(feedback.data.reviews||[]).slice(0,5);
 }catch(err){if(!disposed){profile.value=null;error.value=err.response?.data?.message||'โหลดโปรไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง';}}
 finally{if(!disposed)loading.value=false;}
}
onMounted(load);onBeforeUnmount(()=>{disposed=true;});
</script>
<template>
 <main class="jd-page member-profile">
  <AppHeader title="โปรไฟล์ผู้ใช้" />
  <div class="member-content" :aria-busy="loading">
   <p v-if="loading" role="status">กำลังโหลดโปรไฟล์…</p>
   <div v-else-if="error" class="profile-error" role="alert"><p>{{error}}</p><button type="button" @click="load">ลองใหม่</button></div>
   <template v-else-if="profile">
    <section class="profile-card identity-card" aria-labelledby="member-name">
     <div class="member-avatar"><UserAvatar :src="profile.avatarUrl" :name="profile.fullName" /></div>
     <div class="identity-copy"><p class="eyebrow">สมาชิก JangDi</p><h1 id="member-name">{{profile.fullName||'สมาชิก JangDi'}}</h1><p class="rating">★ {{Number(profile.credibilityScore||0).toFixed(1)}} <span>จาก {{profile.reviewCount||0}} รีวิว</span></p></div>
     <p v-if="profile.shortDescription" class="description">{{profile.shortDescription}}</p>
    </section>
    <section class="profile-card" aria-labelledby="contact-heading">
     <h2 id="contact-heading">ช่องทางติดต่อ</h2>
     <UserContactEmail :email="profile.email" />
     <p v-if="profile.canViewEmail===false" class="contact-note">อีเมลติดต่อจะแสดงเฉพาะคู่จ้างงานหลังยืนยันจ้าง รวมถึงงานที่จบแล้ว</p>
     <div class="contact-links">
      <a v-if="profile.phone" :href="`tel:${profile.phone}`">โทร {{profile.phone}}</a>
      <a v-if="profile.lineId" :href="`https://line.me/R/ti/p/~${encodeURIComponent(profile.lineId)}`" target="_blank" rel="noopener noreferrer">LINE: {{profile.lineId}}</a>
     </div>
     <p v-if="!profile.email&&!profile.phone&&!profile.lineId" class="muted">ยังไม่มีข้อมูลติดต่อที่แสดงได้</p>
    </section>
    <section class="profile-card" aria-labelledby="reviews-heading">
     <h2 id="reviews-heading">รีวิวล่าสุด</h2>
     <p v-if="reviewsError" class="muted">{{reviewsError}} <button type="button" @click="load">ลองใหม่</button></p>
     <p v-else-if="!reviews.length" class="muted">ยังไม่มีรีวิว</p>
     <ul v-else class="reviews"><li v-for="review in reviews" :key="review._id"><div class="review-heading"><span class="review-avatar"><UserAvatar :src="review.fromUser?.avatarUrl" :name="review.fromUser?.fullName" /></span><strong>{{review.fromUser?.fullName||'สมาชิก'}}</strong><span class="review-rating">★ {{review.rating}}</span></div><p v-if="review.comment">{{review.comment}}</p></li></ul>
    </section>
   </template>
  </div>
 </main>
</template>
<style scoped>
.member-profile{min-height:100vh;background:var(--jd-canvas)}.member-content{max-width:760px;margin:auto;padding:24px 16px 48px;display:grid;gap:18px}.profile-card{padding:24px;border:1px solid var(--jd-line);border-radius:20px;background:var(--jd-surface)}.identity-card{display:grid;grid-template-columns:80px minmax(0,1fr);gap:20px;align-items:center}.member-avatar{width:80px;height:80px}.eyebrow{margin:0;color:var(--jd-brand);font-size:.8125rem;font-weight:600}h1{margin:4px 0;font-size:1.5rem;line-height:1.5;overflow-wrap:anywhere}h2{margin:0 0 14px;font-size:1.0625rem}.rating{margin:4px 0;color:var(--jd-warning);font-weight:600}.rating span{color:var(--jd-muted);font-size:.875rem;font-weight:400}.description{grid-column:1/-1;margin:0;color:var(--jd-muted);white-space:pre-wrap;overflow-wrap:anywhere}.contact-note,.muted{font-size:.875rem;line-height:1.8;color:var(--jd-muted)}.contact-links{display:flex;flex-wrap:wrap;gap:8px}.contact-links a{display:inline-flex;align-items:center;min-height:44px;padding:8px 12px;border:1px solid var(--jd-input-border);border-radius:10px;color:var(--jd-brand);text-underline-offset:4px;overflow-wrap:anywhere}.reviews{list-style:none;margin:0;padding:0}.reviews li+li{margin-top:16px;padding-top:16px;border-top:1px solid var(--jd-line)}.review-heading{display:flex;align-items:center;gap:10px;min-width:0}.review-heading strong{overflow-wrap:anywhere;font-size:.875rem}.review-avatar{display:block;flex:0 0 32px;width:32px;height:32px}.review-rating{margin-left:auto;white-space:nowrap;color:var(--jd-warning);font-size:.875rem}.reviews li>p{margin:10px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}.profile-error{color:var(--jd-danger)}button{min-height:44px;padding:8px 14px;border:1px solid var(--jd-input-border);border-radius:10px;background:white;color:var(--jd-ink);font:inherit}a:focus-visible,button:focus-visible{outline:3px solid var(--jd-brand);outline-offset:3px}@media(max-width:420px){.profile-card{padding:18px}.identity-card{grid-template-columns:64px minmax(0,1fr);gap:14px}.member-avatar{width:64px;height:64px}h1{font-size:1.25rem}}
</style>
