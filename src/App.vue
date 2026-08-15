<script setup>
import { RouterView } from "vue-router";
</script>

<template>
  <!-- NFR-USE-01: ออกแบบ mobile-first -->
  <div class="app-shell">
    <RouterView />
  </div>
</template>

<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, "Noto Sans Thai", sans-serif; }
.app-shell { max-width: 480px; margin: 0 auto; min-height: 100vh; }
</style>
