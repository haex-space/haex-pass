<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const model = defineModel<string | number | null>()
</script>

<template>
  <input
    v-model="model"
    data-slot="input-group-control"
    :class="cn(
      'flex-1 min-w-0 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent px-3 py-1 text-base outline-none md:text-sm',
      props.class,
    )"
  />
</template>
