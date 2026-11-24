<script setup>
import { useRouter } from "vue-router";

const props = defineProps({
  title: { type: String, required: true },
});
defineEmits(["back"]);

const router = useRouter();
function goBack() {
  router.back();
}
</script>

<template>
  <header class="app-header">
    <button class="back-btn" aria-label="ย้อนกลับ" @click="$emit('back') || goBack()">‹</button>
    <h1>{{ title }}</h1>
    <span class="spacer" />
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px max(12px, calc((100% - 960px) / 2));
  border-bottom: 1px solid var(--jd-line);
  position: sticky;
  top: 0;
  background: white;
  z-index: 5;
}
.back-btn {
  min-width: 44px;
  min-height: 44px;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--jd-ink);
}
h1 {
  flex: 1;
  text-align: center;
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}
.spacer {
  min-width: 44px;
}
</style>
