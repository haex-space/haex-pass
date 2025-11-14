<template>
  <NuxtLayout name="passwords">
    <div class="flex-1 p-2">
      <UiItemGroup v-if="groupItems.length">
        <UiItem
          v-for="item in groupItems"
          :key="item.id"
          :ref="(el) => setupLongPress(el, item)"
          :class="[
            'cursor-pointer transition-colors',
            {
              'bg-primary/10 border-primary': selectionStore.isSelected(item.id),
              'opacity-50': selectionStore.isCut(item.id),
            },
          ]"
          @click="onClickItemAsync(item, $event)"
        >
          <UiItemMedia
            variant="icon"
            :style="item.color ? { backgroundColor: item.color } : undefined"
          >
            <HaexIcon
              :icon="item.icon"
              class="w-4 h-4"
              :style="item.color ? { color: getTextColor(item.color) } : undefined"
            />
          </UiItemMedia>
          <UiItemContent>
            <UiItemTitle>{{ item.name }}</UiItemTitle>
          </UiItemContent>
          <UiItemActions>
            <div v-if="selectionStore.isSelected(item.id)" class="flex items-center">
              <Check class="w-5 h-5 text-primary" />
            </div>
            <ChevronRight v-else-if="item.type === 'group'" class="w-4 h-4" />
          </UiItemActions>
        </UiItem>
      </UiItemGroup>
      <div v-else class="flex justify-center items-center flex-1">
        <p class="text-muted-foreground">{{ t('noItems') }}</p>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ChevronRight, Check } from "lucide-vue-next";
import type { IPasswordMenuItem } from "~/types/password";
import { getTableName } from "drizzle-orm";
import { haexPasswordsGroupItems, haexPasswordsItemDetails } from "~/database";
import { onLongPress } from '@vueuse/core';

definePageMeta({
  name: "passwordGroupItems",
});

const { t } = useI18n();
const localePath = useLocalePath();

const { currentGroupId, groups } = storeToRefs(usePasswordGroupStore());
const { items } = storeToRefs(usePasswordItemStore());
const { search, searchResults } = storeToRefs(useSearchStore());
const { getTextColor } = useIconComponents();
const selectionStore = useSelectionStore();

// Get the actual prefixed table names from Drizzle
const groupItemsTableName = getTableName(haexPasswordsGroupItems);
const itemDetailsTableName = getTableName(haexPasswordsItemDetails);

const groupItems = computed<IPasswordMenuItem[]>(() => {
  const menuItems: IPasswordMenuItem[] = [];

  // When searching, only show groups if search is empty
  const filteredGroups = search.value
    ? [] // Don't show groups when searching
    : groups.value.filter((group) =>
        group.parentId == currentGroupId.value && group.id !== "trash"
      );

  const filteredItems = search.value
    ? searchResults.value || []
    : items.value.filter((item) => {
        const itemRecord = item as Record<string, Record<string, unknown>>;
        return itemRecord[groupItemsTableName]?.groupId == currentGroupId.value;
      });

  menuItems.push(
    ...filteredGroups.map<IPasswordMenuItem>((group) => ({
      color: group.color,
      icon: group.icon,
      id: group.id,
      name: group.name,
      type: "group",
    }))
  );

  menuItems.push(
    ...filteredItems.map<IPasswordMenuItem>((item) => {
      const itemRecord = item as Record<string, Record<string, unknown>>;
      const details = itemRecord[itemDetailsTableName];
      return {
        color: details?.color as string | null,
        icon: details?.icon as string | null,
        id: details?.id as string,
        name: details?.title as string | null,
        type: "item",
      };
    })
  );

  return menuItems;
});

// Long press functionality
const longPressedHook = ref(false);

const setupLongPress = (el: unknown, item: IPasswordMenuItem) => {
  const element = el as { $el?: HTMLElement } | null;
  if (!element?.$el) return;

  onLongPress(
    element.$el,
    () => {
      longPressedHook.value = true;
      selectionStore.isSelectionMode = true;
      selectionStore.selectItem(item.id);
    },
    { delay: 500 }
  );
};

// Auto-exit selection mode when all items are deselected
watch(() => selectionStore.selectedCount, (count) => {
  if (count === 0) {
    longPressedHook.value = false;
  }
});

const onClickItemAsync = async (item: IPasswordMenuItem, event: MouseEvent) => {
  // If long press just happened, ignore the first click event
  if (longPressedHook.value && selectionStore.isSelected(item.id)) {
    event.preventDefault();
    longPressedHook.value = false;
    return;
  }

  // If long press is active OR items are selected OR Ctrl/Cmd is pressed
  if (longPressedHook.value || selectionStore.selectedCount > 0 || event.ctrlKey || event.metaKey) {
    event.preventDefault();

    // Enable selection mode when entering via long press or ctrl
    if (longPressedHook.value || event.ctrlKey || event.metaKey) {
      selectionStore.isSelectionMode = true;
    }

    // Toggle the item
    selectionStore.toggleSelection(item.id);
    longPressedHook.value = false;
    return;
  }

  // Normal navigation
  if (item.type === "group") {
    await navigateTo(
      localePath({
        name: "passwordGroupItems",
        params: {
          groupId: item.id,
        },
      })
    );
  } else {
    await navigateTo(
      localePath({
        name: "passwordItemEdit",
        params: { ...useRouter().currentRoute.value.params, itemId: item.id },
      })
    );
  }
};
</script>

<i18n lang="yaml">
de:
  noItems: Keine Einträge vorhanden

en:
  noItems: No items available
</i18n>
