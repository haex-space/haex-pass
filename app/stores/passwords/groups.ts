import { eq, isNull, sql } from 'drizzle-orm'
import type { IPasswordMenuItem } from '~/types/password'

import {
  haexPasswordsGroupItems,
  haexPasswordsGroups,
  haexPasswordsItemBinaries,
  type InsertHaexPasswordsGroups,
  type SelectHaexPasswordsGroupItems,
  type SelectHaexPasswordsGroups,
} from '~/database'
import { getSingleRouteParam } from '~/utils/helper'
import { usePasswordItemStore } from './items'

export const trashId = 'trash'

export const usePasswordGroupStore = defineStore('passwordGroupStore', () => {
  const groups = ref<SelectHaexPasswordsGroups[]>([])

  const currentGroupId = computed<string | null | undefined>({
    get: () =>
      getSingleRouteParam(useRouter().currentRoute.value.params.groupId) ||
      undefined,
    set: (newGroupId) => {
      useRouter().currentRoute.value.params.groupId = newGroupId ?? ''
    },
  })

  const currentGroup = ref<SelectHaexPasswordsGroups | null>(null)

  // Watch currentGroupId and update currentGroup
  watch(
    currentGroupId,
    async (newId) => {
      console.log('[passwordGroupStore] currentGroupId changed to:', newId)
      if (newId) {
        console.log('[passwordGroupStore] Reading group:', newId)
        currentGroup.value = await readGroupAsync(newId)
        console.log('[passwordGroupStore] Group read complete:', currentGroup.value?.name)
      } else {
        console.log('[passwordGroupStore] Setting currentGroup to null')
        currentGroup.value = null
      }
    },
    { immediate: true }
  )

  const selectedGroupItems = ref<IPasswordMenuItem[]>()

  const breadCrumbs = computed(() => getParentChain(currentGroupId.value))

  const getParentChain = (
    groupId?: string | null,
    chain: SelectHaexPasswordsGroups[] = []
  ) => {
    const group = groups.value.find((group) => group.id === groupId)
    if (group) {
      chain.unshift(group)
      return getParentChain(group.parentId, chain)
    }
    return chain
  }

  const syncGroupItemsAsync = async () => {
    console.log('[syncGroupItemsAsync] START')
    const haexhubStore = useHaexHubStore()

    // Wait for database to be initialized
    if (!haexhubStore.orm) {
      console.log('[syncGroupItemsAsync] Database not yet initialized, skipping sync')
      return
    }

    const { syncItemsAsync } = usePasswordItemStore()

    console.log('[syncGroupItemsAsync] Reading groups...')
    groups.value = (await readGroupsAsync()) ?? []
    console.log('[syncGroupItemsAsync] Groups read:', groups.value.length)

    console.log('[syncGroupItemsAsync] Syncing items...')
    await syncItemsAsync()
    console.log('[syncGroupItemsAsync] COMPLETE')
  }

  // Watch for haexhub setup completion AND orm initialization, then sync
  const haexhubStore = useHaexHubStore()
  watch(() => ({ isSetupComplete: haexhubStore.state.isSetupComplete, orm: haexhubStore.orm }), ({ isSetupComplete, orm }) => {
    if (isSetupComplete && orm) {
      console.log('[passwordGroupStore] Setup complete and ORM ready, syncing items')
      syncGroupItemsAsync()
    }
  }, { immediate: true })

  // Removed watch on currentGroupId that was causing sync on every navigation
  // This was causing performance issues and potential race conditions
  // syncGroupItemsAsync is now called explicitly when needed

  const inTrashGroup = computed(() =>
    breadCrumbs.value?.some((item) => item.id === trashId)
  )

  return {
    addGroupAsync,
    areGroupsEqual,
    breadCrumbs,
    cloneGroupItemsAsync,
    createTrashIfNotExistsAsync,
    currentGroup,
    currentGroupId,
    deleteGroupAsync,
    getChildGroupsRecursiveAsync,
    groups,
    inTrashGroup,
    insertGroupItemsAsync,
    moveGroupItemsAsync,
    navigateToGroupAsync,
    navigateToGroupItemsAsync,
    readGroupAsync,
    readGroupItemsAsync,
    readGroupsAsync,
    resolveReferenceAsync,
    selectedGroupItems,
    syncGroupItemsAsync,
    trashId,
    updateAsync,
  }
})

const addGroupAsync = async (group: Partial<InsertHaexPasswordsGroups>) => {
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')

  const newGroup: InsertHaexPasswordsGroups = {
    id: group.id || crypto.randomUUID(),
    parentId: group.parentId,
    color: group.color,
    icon: group.icon,
    name: group.name,
    order: group.order,
  }

  await haexhubStore.orm.insert(haexPasswordsGroups).values(newGroup)

  return newGroup
}

const readGroupAsync = async (groupId: string) => {
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')

  const result = await haexhubStore.orm
    .select()
    .from(haexPasswordsGroups)
    .where(eq(haexPasswordsGroups.id, groupId))
    .limit(1)

  return result[0] || null
}

const readGroupsAsync = async (filter?: { parentId?: string | null }) => {
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')

  let query
  if (filter?.parentId) {
    query = haexhubStore.orm
      .select()
      .from(haexPasswordsGroups)
      .where(eq(haexPasswordsGroups.parentId, filter.parentId))
      .orderBy(sql`${haexPasswordsGroups.order} nulls last`)
  } else {
    query = haexhubStore.orm
      .select()
      .from(haexPasswordsGroups)
      .orderBy(sql`${haexPasswordsGroups.order} nulls last`)
  }

  return await query
}

const readGroupItemsAsync = async (
  groupId?: string | null
): Promise<SelectHaexPasswordsGroupItems[]> => {
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')

  if (groupId) {
    return await haexhubStore.orm
      .select()
      .from(haexPasswordsGroupItems)
      .where(eq(haexPasswordsGroupItems.groupId, groupId))
  } else {
    return await haexhubStore.orm
      .select()
      .from(haexPasswordsGroupItems)
      .where(isNull(haexPasswordsGroupItems.groupId))
  }
}

const getChildGroupsRecursiveAsync = async (
  groupId: string,
  groups: SelectHaexPasswordsGroups[] = []
) => {
  const childGroups = (await getByParentIdAsync(groupId)) ?? []
  for (const child of childGroups) {
    groups.push(...(await getChildGroupsRecursiveAsync(child.id)))
  }

  return groups
}

const getByParentIdAsync = async (
  parentId?: string | null
): Promise<SelectHaexPasswordsGroups[]> => {
  try {
    const haexhubStore = useHaexHubStore()
    if (!haexhubStore.orm) throw new Error('Database not initialized')

    if (parentId) {
      return await haexhubStore.orm
        .select()
        .from(haexPasswordsGroups)
        .where(eq(haexPasswordsGroups.parentId, parentId))
        .orderBy(sql`${haexPasswordsGroups.order} nulls last`)
    } else {
      return await haexhubStore.orm
        .select()
        .from(haexPasswordsGroups)
        .where(isNull(haexPasswordsGroups.parentId))
        .orderBy(sql`${haexPasswordsGroups.order} nulls last`)
    }
  } catch (error) {
    console.error(error)
    return []
  }
}

const navigateToGroupAsync = (groupId?: string | null) =>
  navigateTo(
    useLocaleRoute()({
      name: 'passwordGroupEdit',
      params: {
        groupId,
      },
      query: {
        ...useRouter().currentRoute.value.query,
      },
    })
  )

const updateAsync = async (group: InsertHaexPasswordsGroups) => {
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')
  if (!group.id) return

  const newGroup: InsertHaexPasswordsGroups = {
    id: group.id,
    color: group.color,
    description: group.description,
    icon: group.icon,
    name: group.name,
    order: group.order,
    parentId: group.parentId,
  }

  return await haexhubStore.orm
    .update(haexPasswordsGroups)
    .set(newGroup)
    .where(eq(haexPasswordsGroups.id, newGroup.id))
}

const navigateToGroupItemsAsync = (groupId: string) => {
  return navigateTo(
    useLocaleRoute()({
      name: 'passwordGroupItems',
      params: {
        groupId,
      },
      query: {
        ...useRouter().currentRoute.value.query,
      },
    })
  )
}

const insertGroupItemsAsync = async (
  items: IPasswordMenuItem[],
  groupdId?: string | null
) => {
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')

  const { groups } = usePasswordGroupStore()
  const { syncGroupItemsAsync } = usePasswordGroupStore()

  const targetGroup = groups.find((group) => group.id === groupdId)

  for (const item of items) {
    if (item.type === 'group') {
      const updateGroup = groups.find((group) => group.id === item.id)

      if (updateGroup?.parentId === targetGroup?.id) return

      if (updateGroup) {
        updateGroup.parentId = targetGroup?.id ?? null
        await haexhubStore.orm
          .update(haexPasswordsGroups)
          .set(updateGroup)
          .where(eq(haexPasswordsGroups.id, updateGroup.id))
      }
    } else {
      if (targetGroup) {
        await haexhubStore.orm
          .update(haexPasswordsGroupItems)
          .set({ groupId: targetGroup.id, itemId: item.id })
          .where(eq(haexPasswordsGroupItems.itemId, item.id))
      }
    }
  }
  return syncGroupItemsAsync()
}

const moveGroupItemsAsync = async (
  itemIds: string[],
  targetGroupId?: string | null
) => {
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')

  const { groups, syncGroupItemsAsync } = usePasswordGroupStore()
  const targetGroup = groups.find((group) => group.id === targetGroupId)

  for (const itemId of itemIds) {
    // Check if it's a group
    const group = groups.find((g) => g.id === itemId)

    if (group) {
      // Move group by updating parentId
      if (group.parentId === targetGroup?.id) continue

      await haexhubStore.orm
        .update(haexPasswordsGroups)
        .set({ parentId: targetGroup?.id ?? null })
        .where(eq(haexPasswordsGroups.id, itemId))
    } else {
      // Move item by updating groupId in group_items
      if (targetGroup) {
        await haexhubStore.orm
          .update(haexPasswordsGroupItems)
          .set({ groupId: targetGroup.id })
          .where(eq(haexPasswordsGroupItems.itemId, itemId))
      }
    }
  }

  await syncGroupItemsAsync()
}

// Helper function to resolve references for items, groups, and custom fields
const resolveReferenceAsync = async (value: string | null | undefined): Promise<string | null> => {
  if (!value) return null

  // Reference patterns:
  // {REF:FIELD@ITEM:uuid} - Standard item fields
  // {REF:FIELD@GROUP:uuid} - Group fields
  // {REF:FIELDNAME@ITEM.EXTRA:uuid} - Custom fields (KeyValues)
  const refPattern = /\{REF:([A-Z_]+)@(ITEM|GROUP|ITEM\.EXTRA):([a-f0-9-]+)\}/i
  const match = value.match(refPattern)

  if (!match) return value // Not a reference, return as is

  const [, field, type, uuid] = match

  if (!field || !type || !uuid) return value // Invalid reference format

  const fieldUpper = field.toUpperCase()
  const typeUpper = type.toUpperCase()

  if (typeUpper === 'ITEM') {
    const { readAsync } = usePasswordItemStore()
    const referencedItem = await readAsync(uuid)

    if (!referencedItem) return value // Referenced item not found, return original value

    // Map field name to item detail property
    let fieldValue: string | null | undefined = null

    switch (fieldUpper) {
      case 'TITLE':
        fieldValue = referencedItem.details.title
        break
      case 'USERNAME':
        fieldValue = referencedItem.details.username
        break
      case 'PASSWORD':
        fieldValue = referencedItem.details.password
        break
      case 'URL':
        fieldValue = referencedItem.details.url
        break
      case 'NOTE':
      case 'NOTES':
        fieldValue = referencedItem.details.note
        break
      case 'OTP':
      case 'OTPSECRET':
      case 'OTP_SECRET':
        fieldValue = referencedItem.details.otpSecret
        break
      case 'TAGS':
        fieldValue = referencedItem.details.tags
        break
      default:
        return value // Unknown field, return original value
    }

    // Recursively resolve in case the referenced field also has a reference
    return await resolveReferenceAsync(fieldValue ?? null)
  } else if (typeUpper === 'ITEM.EXTRA') {
    const { readKeyValuesAsync } = usePasswordItemStore()
    const keyValues = await readKeyValuesAsync(uuid)

    if (!keyValues || keyValues.length === 0) return value // No custom fields found

    // Find the custom field by key name
    const customField = keyValues.find(
      (kv) => kv.key?.toUpperCase() === fieldUpper
    )

    if (!customField || !customField.value) return value // Field not found

    // Recursively resolve in case the custom field value also has a reference
    return await resolveReferenceAsync(customField.value)
  } else if (typeUpper === 'GROUP') {
    const group = await readGroupAsync(uuid)

    if (!group) return value // Referenced group not found, return original value

    // Map field name to group property
    let fieldValue: string | null | undefined = null

    switch (fieldUpper) {
      case 'NAME':
        fieldValue = group.name
        break
      case 'DESCRIPTION':
        fieldValue = group.description
        break
      case 'ICON':
        fieldValue = group.icon
        break
      case 'COLOR':
        fieldValue = group.color
        break
      default:
        return value // Unknown field, return original value
    }

    // Recursively resolve in case the referenced field also has a reference
    return await resolveReferenceAsync(fieldValue ?? null)
  }

  return value
}

const cloneGroupItemsAsync = async (
  itemIds: string[],
  targetGroupId?: string | null,
  options: {
    includeHistory?: boolean
    referenceCredentials?: boolean
    cloneAppendix?: string
  } = {}
) => {
  const {
    includeHistory = false,
    referenceCredentials = true,
    cloneAppendix,
  } = options

  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')

  const { groups, syncGroupItemsAsync } = usePasswordGroupStore()
  const { readAsync, readKeyValuesAsync, readAttachmentsAsync, addAsync } =
    usePasswordItemStore()
  const targetGroup = groups.find((group) => group.id === targetGroupId)

  for (const itemId of itemIds) {
    // Check if it's a group
    const group = groups.find((g) => g.id === itemId)

    if (group) {
      // Clone group
      const groupName = cloneAppendix
        ? `${group.name} ${cloneAppendix}`
        : group.name || ''

      await addGroupAsync({
        id: crypto.randomUUID(),
        name: groupName,
        description: group.description,
        icon: group.icon,
        color: group.color,
        parentId: targetGroupId || null,
      })
    } else {
      // Clone item
      const originalItem = await readAsync(itemId)
      const keyValues = await readKeyValuesAsync(itemId)
      const attachments = await readAttachmentsAsync(itemId)

      if (originalItem) {
        const itemTitle = cloneAppendix
          ? `${originalItem.details.title} ${cloneAppendix}`
          : originalItem.details.title || ''

        const newDetails = {
          ...originalItem.details,
          id: crypto.randomUUID(),
          title: itemTitle,
        }

        // If referenceCredentials is true, replace username and password with references
        if (referenceCredentials) {
          // New reference format: {REF:FIELD@ITEM:uuid}
          newDetails.username = `{REF:USERNAME@ITEM:${itemId}}`
          newDetails.password = `{REF:PASSWORD@ITEM:${itemId}}`
        }

        await addAsync(newDetails, keyValues || [], targetGroup)

        // Copy attachments if includeHistory is true
        if (includeHistory && attachments && attachments.length > 0) {
          for (const attachment of attachments) {
            await haexhubStore.orm
              .insert(haexPasswordsItemBinaries)
              .values({
                id: crypto.randomUUID(),
                itemId: newDetails.id,
                binaryHash: attachment.binaryHash,
                fileName: attachment.fileName,
              })
          }
        }
      }
    }
  }

  await syncGroupItemsAsync()
}

const createTrashIfNotExistsAsync = async () => {
  const exists = await readGroupAsync(trashId)
  if (exists) return true

  return addGroupAsync({
    name: 'Trash',
    id: trashId,
    icon: 'mdi:trash-outline',
    parentId: null,
  })
}

const deleteGroupAsync = async (groupId: string, final: boolean = false) => {
  const haexhubStore = useHaexHubStore()
  if (!haexhubStore.orm) throw new Error('Database not initialized')

  if (final || groupId === trashId) {
    // With CASCADE DELETE in the schema, child groups and items will be automatically deleted
    return await haexhubStore.orm
      .delete(haexPasswordsGroups)
      .where(eq(haexPasswordsGroups.id, groupId))
  } else {
    if (await createTrashIfNotExistsAsync())
      await updateAsync({ id: groupId, parentId: trashId })
  }
}

const areGroupsEqual = (
  groupA: unknown | unknown[] | null,
  groupB: unknown | unknown[] | null
) => {
  if (groupA === null && groupB === null) return true

  if (Array.isArray(groupA) && Array.isArray(groupB)) {
    if (groupA.length === groupB.length) return true

    return groupA.some((group: unknown, index: number) => {
      return areObjectsEqual(group, groupA[index])
    })
  }
  return areObjectsEqual(groupA, groupB)
}

// Helper function for object comparison
function areObjectsEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object') return false
  if (a === null || b === null) return false

  const keysA = Object.keys(a as Record<string, unknown>)
  const keysB = Object.keys(b as Record<string, unknown>)

  if (keysA.length !== keysB.length) return false

  return keysA.every((key) => {
    const valA = (a as Record<string, unknown>)[key]
    const valB = (b as Record<string, unknown>)[key]
    return valA === valB
  })
}
