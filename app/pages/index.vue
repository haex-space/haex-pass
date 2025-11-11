<template>
  <NuxtLayout name="passwords">
    <div class="flex-1 p-2">
      <UiItemGroup v-if="groupItems.length">
        <UiItem
          v-for="item in groupItems"
          :key="item.id"
          class="cursor-pointer"
          @click="onClickItemAsync(item)"
        >
          <UiItemMedia variant="icon">
            <Folder v-if="item.type === 'group'" class="w-4 h-4" />
            <Key v-else class="w-4 h-4" />
          </UiItemMedia>
          <UiItemContent>
            <UiItemTitle>{{ item.name }}</UiItemTitle>
          </UiItemContent>
          <UiItemActions v-if="item.type === 'group'">
            <ChevronRight class="w-4 h-4" />
          </UiItemActions>
        </UiItem>
      </UiItemGroup>
      <div v-else class="flex justify-center items-center flex-1">
        <p class="text-muted-foreground">{{ t("noItems") }}</p>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { Folder, Key, ChevronRight } from "lucide-vue-next";
import type { IPasswordMenuItem } from "~/types/password";
import { getTableName } from "drizzle-orm";
import { haexPasswordsGroupItems, haexPasswordsItemDetails } from "~/database";

definePageMeta({
  name: "passwordGroupItems",
});

const { t } = useI18n();
const localePath = useLocalePath();

const { currentGroupId, groups } = storeToRefs(usePasswordGroupStore());
const { items } = storeToRefs(usePasswordItemStore());
const { search, searchResults } = storeToRefs(useSearchStore());

// Get the actual prefixed table names from Drizzle
const groupItemsTableName = getTableName(haexPasswordsGroupItems);
const itemDetailsTableName = getTableName(haexPasswordsItemDetails);

const groupItems = computed<IPasswordMenuItem[]>(() => {
  const menuItems: IPasswordMenuItem[] = [];

  // When searching, only show groups if search is empty
  const filteredGroups = search.value
    ? [] // Don't show groups when searching
    : groups.value.filter((group) => group.parentId == currentGroupId.value);

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
        icon: details?.icon as string | null,
        id: details?.id as string,
        name: details?.title as string | null,
        type: "item",
      };
    })
  );

  return menuItems;
});

const onClickItemAsync = async (item: IPasswordMenuItem) => {
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
