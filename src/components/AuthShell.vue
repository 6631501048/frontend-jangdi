<script setup>
import JangDiMark from './JangDiMark.vue';
</script>
<template>
  <main class="jd-page auth-shell">
    <header class="auth-brand"><JangDiMark /><span>JangDi</span><span class="community-label">พื้นที่เล็ก ๆ ของคนพร้อมช่วย</span></header>
    <div class="auth-grid">
      <aside class="auth-intro">
        <p class="eyebrow">ให้ทุกวันง่ายขึ้น</p>
        <h2>มีงานให้ช่วย<br />มีคนให้เจอ</h2>
        <p>พื้นที่เชื่อมต่อผู้ว่าจ้างและผู้รับจ้าง<br />ในชุมชนมหาวิทยาลัยแม่ฟ้าหลวง</p>
        <ul><li>หาคนช่วยทำงานที่ต้องการ</li><li>เสนอบริการจากสิ่งที่คุณถนัด</li><li>ติดตามงานและคำขอได้ในที่เดียว</li></ul>
        <div class="auth-decoration" aria-hidden="true"><JangDiMark /><span>เริ่มต้นสิ่งดี ๆ<br /><strong>ไปด้วยกัน</strong></span></div>
      </aside>
      <section class="auth-panel"><slot /></section>
    </div>
  </main>
</template>
<style scoped>
.auth-shell { padding:32px max(24px, calc((100% - 1120px) / 2)); background:var(--jd-canvas); }
.auth-brand { display:flex; align-items:center; gap:12px; color:var(--jd-brand); font-size:1.5rem; font-weight:800; }
.community-label { margin-left:auto; font-weight:400; font-size:.875rem; color:var(--jd-muted); }
.auth-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,440px); align-items:center; gap:80px; padding:64px 0; }
.eyebrow { color:var(--jd-brand); font-size:.875rem; font-weight:700; }
.auth-intro h2 { font-size:clamp(2.5rem,5vw,3.5rem); line-height:1.35; letter-spacing:-.04em; margin:16px 0 24px; }
.auth-intro > p:not(.eyebrow) { color:var(--jd-muted); }
ul { list-style:none; padding:0; margin:24px 0; display:grid; gap:12px; }
li { display:flex; align-items:center; gap:10px; font-size:.9375rem; }
li::before { content:'✓'; display:grid; place-items:center; width:26px; height:26px; border-radius:8px; background:var(--jd-peach-soft); color:var(--jd-brand); font-weight:700; }
.auth-decoration { display:flex; align-items:center; gap:20px; padding:24px; margin-top:32px; border-radius:20px; background:var(--jd-peach-soft); }
.auth-decoration svg { width:64px; height:64px; }
.auth-decoration span { color:var(--jd-brand); font-size:1rem; }
.auth-decoration strong { color:var(--jd-ink); font-size:1.25rem; }
.auth-panel { min-width:0; background:var(--jd-surface); border:1px solid var(--jd-line); border-radius:24px; padding:32px; box-shadow:0 8px 32px rgb(16 14 4 / 3%); }
.auth-panel :deep(h1) { font-size:1.5rem; margin:0 0 8px; line-height:1.5; }
.auth-panel :deep(.subtitle) { margin:0 0 28px; color:var(--jd-muted); font-size:.875rem; overflow-wrap:anywhere; }
.auth-panel :deep(form) { display:grid; gap:18px; }
.auth-panel :deep(label) { display:grid; gap:8px; font-size:.875rem; font-weight:600; }
.auth-panel :deep(input) { width:100%; padding:12px; border:1px solid var(--jd-input-border); background:white; }
.auth-panel :deep(button[type="submit"]) { padding:12px 16px; border:1px solid var(--jd-brand); border-radius:12px; background:var(--jd-brand); color:white; font-weight:700; }
.auth-panel :deep(.error) { color:var(--jd-danger); margin:0; font-size:.875rem; }
.auth-panel :deep(.secondary) { padding:12px; border:1px solid var(--jd-input-border); background:white; color:var(--jd-ink); border-radius:12px; font-size:.875rem; }
.auth-panel :deep(.hint), .auth-panel :deep(.location-status) { color:var(--jd-muted); font-size:.875rem; }
@media(max-width:760px) { .auth-shell { padding:24px 16px; } .community-label { display:none; } .auth-grid { grid-template-columns:minmax(0,1fr); padding:28px 0; gap:24px; } .auth-intro { display:none; } .auth-panel { width:100%; max-width:480px; margin:auto; padding:24px; } }
</style>
