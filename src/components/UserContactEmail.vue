<script setup>
defineProps({email:{type:String,default:''}});
</script>
<template><a v-if="email" class="contact-email" :href="`mailto:${email}`"><span>อีเมลติดต่อ</span><strong>{{email}}</strong></a></template>
<style scoped>.contact-email{display:flex;flex-direction:column;justify-content:center;gap:3px;min-height:48px;padding:10px 12px;margin:8px 0;border:1px solid var(--jd-line);border-radius:12px;background:var(--jd-peach-soft);color:var(--jd-ink);text-decoration:none;overflow-wrap:anywhere}.contact-email span{font-size:.75rem;color:var(--jd-muted)}.contact-email strong{font-size:.875rem;font-weight:600}.contact-email:focus-visible{outline:3px solid var(--jd-brand);outline-offset:3px}</style>
