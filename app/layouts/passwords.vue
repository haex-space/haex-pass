<template>
  <div class="flex flex-1 flex-col">
    <HaexHeader />
    <HaexBreadcrumbs :items="breadCrumbs" />
    <slot />
  </div>
</template>

<script setup lang="ts">
const { breadCrumbs } = storeToRefs(usePasswordGroupStore());
</script>
