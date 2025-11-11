<template>
  <UiInputGroup>
    <UiInputGroupInput
      v-model="model"
      v-bind="$attrs"
    />
    <UiInputGroupButton
      :icon="copied ? Check : Copy"
      variant="ghost"
      @click.prevent="handleCopy"
    />
  </UiInputGroup>
</template>

<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import { Copy, Check } from "lucide-vue-next";

const model = defineModel<string | number | null>();

const { copy, copied } = useClipboard();

const handleCopy = async () => {
  if (model.value) {
    await copy(String(model.value));
  }
};
</script>
