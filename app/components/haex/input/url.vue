<template>
  <div class="space-y-2">
    <UiLabel>{{ t('url') }}</UiLabel>
    <UiInputGroup>
      <UiInputGroupInput
        v-model.trim="model"
        type="url"
        :placeholder="t('url')"
        :readonly="readonly"
        v-bind="$attrs"
      />
      <UiInputGroupButton
        v-if="!readonly"
        :icon="isLoadingFavicon ? Loader2 : Image"
        variant="ghost"
        :disabled="!model?.length || isLoadingFavicon"
        :class="{ 'animate-spin': isLoadingFavicon }"
        @click.prevent="fetchFaviconAsync"
      />
      <UiInputGroupButton
        :icon="ExternalLink"
        variant="ghost"
        :disabled="!model?.length"
        @click.prevent="openUrl"
      />
      <UiInputGroupButton
        :icon="copied ? Check : Copy"
        variant="ghost"
        @click.prevent="handleCopy"
      />
    </UiInputGroup>
  </div>
</template>

<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import { Copy, Check, ExternalLink, Image, Loader2 } from "lucide-vue-next";

const model = defineModel<string | null>();

defineProps<{
  readonly?: boolean;
}>();

const emit = defineEmits<{
  faviconFetched: [iconName: string];
}>();

const { t } = useI18n();
const { copy, copied } = useClipboard();
const isLoadingFavicon = ref(false);

const handleCopy = async () => {
  if (model.value) {
    await copy(model.value);
  }
};

const openUrl = async () => {
  if (!model.value) return;

  const haexhubStore = useHaexHubStore();
  if (!haexhubStore.client) {
    console.error('HaexHub client not available');
    return;
  }

  try {
    await haexhubStore.client.web.openAsync(model.value);
  } catch (error) {
    console.error('Failed to open URL:', error);
  }
};

const fetchFaviconAsync = async () => {
  if (!model.value) return;

  const haexhubStore = useHaexHubStore();
  if (!haexhubStore.client) {
    console.error('HaexHub client not available');
    return;
  }

  try {
    isLoadingFavicon.value = true;

    // Extract domain from URL
    const url = new URL(model.value);
    const domain = url.hostname;
    const origin = url.origin;

    // Try to fetch favicon to verify URL is accessible
    // DuckDuckGo's icon service doesn't have CORS restrictions
    const faviconSources = [
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `${origin}/favicon.ico`,
      `${origin}/favicon.png`,
    ];

    for (const faviconUrl of faviconSources) {
      try {
        const response = await haexhubStore.client.web.fetchAsync(faviconUrl);

        // Check if response is successful (status 200-299)
        if (response.status >= 200 && response.status < 300) {
          // Favicon found and accessible
          break;
        }
      } catch (error) {
        // Try next source
        continue;
      }
    }

    // Set icon based on domain (regardless of favicon availability)
    emit('faviconFetched', getFallbackIconForDomain(domain));
  } catch (error) {
    console.error('Error fetching favicon:', error);

    // Still try to set a fallback icon based on domain
    try {
      const url = new URL(model.value);
      emit('faviconFetched', getFallbackIconForDomain(url.hostname));
    } catch {
      // Ignore if URL parsing fails
    }
  } finally {
    isLoadingFavicon.value = false;
  }
};

// Helper function to suggest an icon based on domain
const getFallbackIconForDomain = (domain: string): string => {
  const domainLower = domain.toLowerCase();

  // Common domain to icon mappings
  if (domainLower.includes('github')) return 'github';
  if (domainLower.includes('gmail') || domainLower.includes('google')) return 'mail';
  if (domainLower.includes('twitter') || domainLower.includes('x.com')) return 'twitter';
  if (domainLower.includes('facebook')) return 'facebook';
  if (domainLower.includes('linkedin')) return 'linkedin';
  if (domainLower.includes('instagram')) return 'instagram';
  if (domainLower.includes('youtube')) return 'youtube';
  if (domainLower.includes('amazon')) return 'shopping-cart';
  if (domainLower.includes('netflix')) return 'tv';
  if (domainLower.includes('spotify')) return 'music';
  if (domainLower.includes('apple')) return 'apple';
  if (domainLower.includes('microsoft')) return 'windows';
  if (domainLower.includes('dropbox') || domainLower.includes('drive')) return 'cloud';
  if (domainLower.includes('slack')) return 'message-square';
  if (domainLower.includes('discord')) return 'message-circle';
  if (domainLower.includes('reddit')) return 'message-square';
  if (domainLower.includes('stackoverflow')) return 'code';
  if (domainLower.includes('paypal') || domainLower.includes('bank')) return 'credit-card';

  // Default to globe icon
  return 'globe';
};
</script>

<i18n lang="yaml">
de:
  url: URL

en:
  url: URL
</i18n>
