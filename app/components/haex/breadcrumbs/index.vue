<template>
  <UiBreadcrumb class="px-7 pt-3 pb-3 border-b">
    <UiBreadcrumbList>
      <UiBreadcrumbItem>
        <UiBreadcrumbLink as-child>
          <NuxtLinkLocale :to="{ name: 'passwordGroupItems' }" class="flex items-center">
            <Icon name="mdi:safe" size="20" />
          </NuxtLinkLocale>
        </UiBreadcrumbLink>
      </UiBreadcrumbItem>

      <template v-for="(item, index) in items ?? []" :key="item.id">
        <UiBreadcrumbSeparator>
          <ChevronRight class="w-4 h-4" />
        </UiBreadcrumbSeparator>

        <UiBreadcrumbItem>
          <UiBreadcrumbLink v-if="index < (items?.length ?? 0) - 1" as-child>
            <NuxtLinkLocale
              :to="{ name: 'passwordGroupItems', params: { groupId: item.id } }"
            >
              {{ item.name }}
            </NuxtLinkLocale>
          </UiBreadcrumbLink>
          <UiBreadcrumbPage v-else>
            {{ item.name }}
          </UiBreadcrumbPage>
        </UiBreadcrumbItem>
      </template>

      <template v-if="lastGroup">
        <UiBreadcrumbSeparator />
        <UiBreadcrumbItem>
          <UiBreadcrumbLink as-child>
            <NuxtLinkLocale
              :to="{
                name: 'passwordGroupEdit',
                params: { groupId: lastGroup.id },
              }"
              :title="t('edit')"
            >
              <Pencil class="w-4 h-4" />
            </NuxtLinkLocale>
          </UiBreadcrumbLink>
        </UiBreadcrumbItem>
      </template>
    </UiBreadcrumbList>
  </UiBreadcrumb>
</template>

<script setup lang="ts">
import type { SelectHaexPasswordsGroups } from "~/database";
import { ChevronRight, Pencil } from "lucide-vue-next";

const props = defineProps<{ items?: SelectHaexPasswordsGroups[] }>();

const lastGroup = computed(() => props.items?.at(-1));

const { t } = useI18n();
</script>

<i18n lang="yaml">
de:
  edit: Bearbeiten

en:
  edit: Edit
</i18n>
