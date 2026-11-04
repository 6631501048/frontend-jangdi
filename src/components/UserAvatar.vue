<script setup>
import { computed, ref, watch } from "vue";
import { resolveBackendAssetUrl } from "../services/backendAssets";

const props = defineProps({ src: { type: String, default: "" }, name: { type: String, default: "" }, label: { type: String, default: "รูปโปรไฟล์" } });
const failed = ref(false);
watch(() => props.src, () => { failed.value = false; });
const imageUrl = computed(() => resolveBackendAssetUrl(props.src));
const initials = computed(() => props.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "👤");
</script>

<template>
  <span class="user-avatar" :aria-label="label" role="img">
    <img v-if="imageUrl && !failed" :src="imageUrl" :alt="label" @error="failed = true" />
    <span v-else aria-hidden="true">{{ initials }}</span>
  </span>
</template>

<style scoped>
.user-avatar { display:inline-flex; width:100%; height:100%; min-width:28px; align-items:center; justify-content:center; overflow:hidden; border-radius:50%; background:#f1f2f4; color:#596273; font-size:.75em; font-weight:700; }
.user-avatar img { display:block; width:100%; height:100%; object-fit:cover; }
</style>
