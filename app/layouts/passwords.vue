<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <HaexHeader class="flex-none" />
    <div class="flex-none relative border-b border-border">
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out absolute top-0 left-0 w-full"
        leave-active-class="transition-all duration-300 ease-in absolute top-0 left-0 w-full"
        enter-from-class="opacity-0 translate-y-full"
        enter-to-class="opacity-100 translate-y-0"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-full"
      >
        <HaexBreadcrumbs
          v-if="!selectionStore.isSelectionMode"
          key="breadcrumbs"
          :items="breadCrumbs"
          @paste="onPasteAsync"
        />

        <HaexSelectionToolbar
          v-else
          key="toolbar"
          @edit="onEditAsync"
          @copy="onCopyAsync"
          @cut="onCutAsync"
          @delete="onDeleteAsync"
          @paste="onPasteAsync"
        />
      </TransitionGroup>
    </div>
    <div class="flex-1 overflow-y-auto">
      <slot />
    </div>

    <!-- Delete Dialog -->
    <HaexDialogDeleteItem
      v-model:open="showDeleteDialog"
      :item-name="deleteDialogItemName"
      :final="inTrashGroup"
      @confirm="onConfirmDeleteAsync"
      @abort="showDeleteDialog = false"
    />
    <!-- Clone Options Dialog -->
    <HaexDialogCloneOptions
      v-model:open="showCloneDialog"
      @confirm="onConfirmCloneAsync"
    />
  </div>
</template>

<script setup lang="ts">
import { onKeyStroke } from "@vueuse/core";

const { breadCrumbs, inTrashGroup } = storeToRefs(usePasswordGroupStore());
const selectionStore = useSelectionStore();
const router = useRouter();
const localePath = useLocalePath();

const showDeleteDialog = ref(false);
const deleteDialogItemName = ref<string>("");
const showCloneDialog = ref(false);
const { t } = useI18n();

// Keyboard shortcuts
// Ctrl/Cmd + A: Select all items
onKeyStroke("a", (event) => {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
    selectionStore.selectAll();
  }
});

// Escape: Clear selection
onKeyStroke("Escape", (event) => {
  if (selectionStore.isSelectionMode) {
    event.preventDefault();
    selectionStore.clearSelection();
  }
});

// Delete: Delete selected items
onKeyStroke("Delete", (event) => {
  if (selectionStore.isSelectionMode && selectionStore.selectedCount > 0) {
    event.preventDefault();
    onDeleteAsync();
  }
});

// Ctrl/Cmd + X: Cut selected items
onKeyStroke("x", (event) => {
  if (
    (event.ctrlKey || event.metaKey) &&
    selectionStore.isSelectionMode &&
    selectionStore.selectedCount > 0
  ) {
    event.preventDefault();
    onCutAsync();
  }
});

// Ctrl/Cmd + C: Copy selected items
onKeyStroke("c", (event) => {
  if (
    (event.ctrlKey || event.metaKey) &&
    selectionStore.isSelectionMode &&
    selectionStore.selectedCount > 0
  ) {
    event.preventDefault();
    onCopyAsync();
  }
});

// Ctrl/Cmd + V: Paste items
onKeyStroke("v", (event) => {
  if ((event.ctrlKey || event.metaKey) && selectionStore.hasClipboardItems) {
    event.preventDefault();
    onPasteAsync();
  }
});

const onEditAsync = async () => {
  const selectedId = Array.from(selectionStore.selectedItems)[0];
  if (!selectedId) return;

  // TODO: Determine if it's a group or item
  // For now, assume it's an item
  await router.push(
    localePath({
      name: "passwordItemEdit",
      params: { ...router.currentRoute.value.params, itemId: selectedId },
    })
  );
  selectionStore.clearSelection();
};

const onCopyAsync = async () => {
  selectionStore.copyToClipboard();
  console.log(
    "Copied items to clipboard:",
    Array.from(selectionStore.clipboardItems)
  );
};

const onCutAsync = async () => {
  selectionStore.cutToClipboard();
  console.log(
    "Cut items to clipboard:",
    Array.from(selectionStore.clipboardItems)
  );
};

const onPasteAsync = async () => {
  const { moveGroupItemsAsync, syncGroupItemsAsync, currentGroupId } =
    usePasswordGroupStore();

  if (!selectionStore.clipboardItems.length) return;

  if (selectionStore.clipboardMode === "cut") {
    // Move items to current group
    const itemIds = selectionStore.clipboardItems.map((item) => item.id);
    await moveGroupItemsAsync(itemIds, currentGroupId);
    await syncGroupItemsAsync();
    selectionStore.clearClipboard();
  } else if (selectionStore.clipboardMode === "copy") {
    // Show clone options dialog
    showCloneDialog.value = true;
  }
};

const onDeleteAsync = async () => {
  if (!selectionStore.selectedItems.size) return;

  // Determine item name(s) for dialog
  const { groups } = usePasswordGroupStore();
  const { items } = usePasswordItemStore();
  const selectedCount = selectionStore.selectedItems.size;

  if (selectedCount === 1) {
    // Single item selected - show specific name
    const itemId = Array.from(selectionStore.selectedItems)[0];
    const group = groups.find((g) => g.id === itemId);

    if (group) {
      deleteDialogItemName.value = group.name || "Untitled";
    } else {
      const item = items.find((i) => {
        const itemRecord = i as Record<string, Record<string, unknown>>;
        return itemRecord.haex_passwords_item_details?.id === itemId;
      });

      if (item) {
        const itemRecord = item as Record<string, Record<string, unknown>>;
        const details = itemRecord.haex_passwords_item_details;
        deleteDialogItemName.value = (details?.title as string) || "Untitled";
      }
    }
  } else {
    // Multiple items selected
    deleteDialogItemName.value = `${selectedCount} items`;
  }

  showDeleteDialog.value = true;
};

const onConfirmDeleteAsync = async () => {
  const { deleteAsync: deleteItem } = usePasswordItemStore();
  const { deleteGroupAsync, groups, syncGroupItemsAsync } =
    usePasswordGroupStore();

  if (!selectionStore.selectedItems.size) return;

  for (const itemId of selectionStore.selectedItems) {
    // Check if it's a group
    const isGroup = groups.find((g) => g.id === itemId);

    if (isGroup) {
      await deleteGroupAsync(itemId, inTrashGroup.value);
    } else {
      await deleteItem(itemId, inTrashGroup.value);
    }
  }

  await syncGroupItemsAsync();
  selectionStore.clearSelection();
  showDeleteDialog.value = false;
};

const onConfirmCloneAsync = async (options: {
  includeHistory: boolean;
  referenceCredentials: boolean;
  withCloneAppendix: boolean;
}) => {
  const { cloneGroupItemsAsync, currentGroupId } = usePasswordGroupStore();

  if (!selectionStore.clipboardItems.length) return;

  const itemIds = selectionStore.clipboardItems.map((item) => item.id);
  const cloneAppendix = options.withCloneAppendix
    ? t("cloneAppendix")
    : undefined;

  await cloneGroupItemsAsync(itemIds, currentGroupId, {
    includeHistory: options.includeHistory,
    referenceCredentials: options.referenceCredentials,
    cloneAppendix,
  });

  selectionStore.clearClipboard();
  showCloneDialog.value = false;
};
</script>

<i18n lang="yaml">
de:
  cloneAppendix: "(Klon)"

en:
  cloneAppendix: "(Clone)"
</i18n>
