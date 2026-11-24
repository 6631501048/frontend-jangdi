<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';
const props=defineProps({userId:{type:String,default:''},label:{type:String,default:'ดูโปรไฟล์'}});
const auth=useAuthStore();
const destination=computed(()=>String(props.userId)===String(auth.user?._id) ? {name:auth.user?.isAdmin?'admin-profile':'profile'} : {name:'user-profile',params:{id:props.userId}});
</script>
<template><RouterLink v-if="userId" class="user-profile-link" :to="destination">{{label}}<span aria-hidden="true"> ›</span></RouterLink></template>
<style scoped>.user-profile-link{display:inline-flex;align-items:center;min-height:44px;color:var(--jd-brand);font-size:.875rem;font-weight:600;text-underline-offset:4px;overflow-wrap:anywhere}.user-profile-link:focus-visible{outline:3px solid var(--jd-brand);outline-offset:3px;border-radius:4px}</style>
