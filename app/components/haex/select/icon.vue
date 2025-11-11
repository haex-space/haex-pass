<template>
  <div class="space-y-2">
    <UiLabel v-if="label">{{ label }}</UiLabel>

    <UiPopover v-model:open="isOpen">
      <UiPopoverTrigger as-child>
        <UiButton
          variant="outline"
          role="combobox"
          :aria-expanded="isOpen"
          :disabled="readOnly"
          class="w-full justify-center"
          :style="props.color ? { backgroundColor: props.color, borderColor: props.color } : undefined"
        >
          <component
            :is="selectedIconComponent"
            class="h-4 w-4"
            :style="props.color ? { color: getTextColor(props.color) } : undefined"
          />
        </UiButton>
      </UiPopoverTrigger>
      <UiPopoverContent class="w-96 p-0">
        <UiCommand>
          <UiCommandInput :placeholder="t('search')" v-model="search" />
          <UiCommandEmpty>{{ t('noResults') }}</UiCommandEmpty>
          <UiCommandList class="max-h-[300px]">
            <UiCommandGroup>
              <div class="grid grid-cols-8 gap-1 p-2">
                <UiCommandItem
                  v-for="icon in filteredIcons"
                  :key="icon"
                  :value="icon"
                  @select="selectIcon(icon)"
                  class="p-2 flex items-center justify-center cursor-pointer"
                >
                  <component :is="iconComponents[icon]" class="h-5 w-5" />
                </UiCommandItem>
              </div>
            </UiCommandGroup>
          </UiCommandList>
          <div class="flex gap-2 p-2 border-t">
            <UiButton
              v-if="iconName"
              variant="outline"
              size="sm"
              class="flex-1"
              @click="clearIcon"
            >
              {{ t('clear') }}
            </UiButton>
            <UiButton
              variant="default"
              size="sm"
              class="flex-1"
              @click="isOpen = false"
            >
              {{ t('close') }}
            </UiButton>
          </div>
        </UiCommand>
      </UiPopoverContent>
    </UiPopover>
  </div>
</template>

<script setup lang="ts">
import { Key } from 'lucide-vue-next';

const props = defineProps<{
  label?: string;
  defaultIcon?: string;
  color?: string | null;
  readOnly?: boolean;
}>();

const iconName = defineModel<string | null>();
const { t } = useI18n();

const isOpen = ref(false);
const search = ref('');

const { iconComponents, icons, getTextColor } = useIconComponents();

const filteredIcons = computed(() => {
  if (!search.value) return icons;
  const searchLower = search.value.toLowerCase();
  return icons.filter((icon) => icon.toLowerCase().includes(searchLower));
});

const selectedIconComponent = computed(() => {
  const name = iconName.value || props.defaultIcon;
  if (!name) return Key; // Fallback to Key if no icon is set
  return iconComponents[name] || Key;
});

const selectIcon = (icon: string) => {
  iconName.value = icon;
  isOpen.value = false;
  search.value = '';
};

const clearIcon = () => {
  iconName.value = null;
  search.value = '';
};
</script>

<i18n lang="yaml">
de:
  selectIcon: Icon auswählen
  search: Suchen...
  clear: Zurücksetzen
  close: Schließen
  noResults: Keine Icons gefunden

en:
  selectIcon: Select icon
  search: Search...
  clear: Clear
  close: Close
  noResults: No icons found
</i18n>
