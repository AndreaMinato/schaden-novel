<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'

const route = useRoute()

// Reactive route params (critical for SPA navigation)
const novel = computed(() => route.params.novel as string)
const slug = computed(() => (route.params.slug as string[]).join('/'))
const contentPath = computed(() => `/${novel.value}/${slug.value}`)

// Body cache for instant navigation (LRU, 5 entries, in-memory only)
const { getOrFetch, prefetch } = useBodyCache()

// 1. Metadata from SQLite (fast, local WASM query -- OK to await)
const { data: chapter, error: metaError } = await useAsyncData(
  () => `chapter-${novel.value}-${slug.value}`,
  () => queryCollection(novel.value as any)
    .select('title', 'path', 'stem')
    .path(contentPath.value)
    .first(),
  { watch: [novel, slug] }
)

// 2. Body from static JSON via cache (do NOT await, show skeleton)
const { data: bodyData, status: bodyStatus, error: bodyError, refresh: retryBody } = useAsyncData(
  () => `body-${novel.value}-${slug.value}`,
  async () => {
    const url = bodyUrl(novel.value, slug.value)
    try {
      return await getOrFetch(url)
    } catch (e) {
      // Silent auto-retry after 2s
      await new Promise(resolve => setTimeout(resolve, 2000))
      return await getOrFetch(url)
    }
  },
  { watch: [novel, slug] }
)

// 3. Chapter navigation (reactive, non-blocking)
const { prev, next } = useChapterNav(novel, contentPath)

// 3b. Prefetch next chapter body after current loads
watch([bodyStatus, next], ([status, nextChapter]) => {
  if (status === 'success' && nextChapter) {
    const nextSlug = nextChapter.path.split('/').slice(2).join('/')
    prefetch(bodyUrl(novel.value, nextSlug))
  }
})

// 4. Reading progress: save on every chapter navigation + initial mount
watch(contentPath, (path) => {
  useReadingProgress().save(novel.value, `/novels${path}`)
})
onMounted(() => {
  useReadingProgress().save(novel.value, `/novels${contentPath.value}`)
})

// 5. Breadcrumbs (from metadata, shows immediately)
const breadcrumbItems = computed<BreadcrumbItem[]>(() => [
  { label: novel.value.toUpperCase(), to: `/novels/${novel.value}` },
  { label: chapter.value?.title || `Chapter ${slug.value}` },
])

// 6. Keyboard shortcuts (Cmd+Arrow)
const toast = useToast()
defineShortcuts({
  meta_arrowleft: () => {
    if (prev.value) {
      navigateTo(`/novels${prev.value.path}`)
    } else {
      toast.add({ title: 'First chapter', color: 'neutral', duration: 2000 })
    }
  },
  meta_arrowright: () => {
    if (next.value) {
      navigateTo(`/novels${next.value.path}`)
    } else {
      toast.add({ title: 'Last chapter', color: 'neutral', duration: 2000 })
    }
  },
})
</script>

<template>
  <div class="max-w-[65ch] mx-auto px-4 sm:px-6 py-8">
    <!-- Breadcrumb title -->
    <UBreadcrumb :items="breadcrumbItems" class="mb-4" />

    <!-- Top navigation -->
    <nav class="flex justify-between items-center mb-8">
      <UButton
        :to="prev ? `/novels${prev.path}` : undefined"
        :disabled="!prev"
        icon="i-lucide-chevron-left"
        variant="outline"
        label="Previous"
        size="sm"
      />
      <UButton
        :to="next ? `/novels${next.path}` : undefined"
        :disabled="!next"
        icon="i-lucide-chevron-right"
        trailing
        variant="outline"
        label="Next"
        size="sm"
      />
    </nav>

    <!-- Chapter body area -->
    <article class="prose prose-lg dark:prose-invert max-w-none leading-relaxed">
      <!-- Loading skeleton (READ-02) -->
      <div v-if="bodyStatus === 'pending'" class="space-y-4 py-4">
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-[90%]" />
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-[75%]" />
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-[60%]" />
        <USkeleton class="h-4 w-[90%]" />
        <USkeleton class="h-4 w-[75%]" />
      </div>

      <!-- Body content (instant swap from skeleton, no animation) -->
      <ContentRenderer v-else-if="bodyData" :value="bodyData" />

      <!-- Error state with retry (inline, minimal tone) -->
      <div v-else-if="bodyError || metaError" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Failed to load chapter.</p>
        <UButton label="Retry" variant="outline" size="sm" class="mt-2" @click="retryBody()" />
      </div>
    </article>

    <!-- Bottom navigation -->
    <nav class="flex justify-between items-center mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
      <UButton
        :to="prev ? `/novels${prev.path}` : undefined"
        :disabled="!prev"
        icon="i-lucide-chevron-left"
        variant="outline"
        label="Previous"
        size="sm"
      />
      <UButton
        :to="next ? `/novels${next.path}` : undefined"
        :disabled="!next"
        icon="i-lucide-chevron-right"
        trailing
        variant="outline"
        label="Next"
        size="sm"
      />
    </nav>
  </div>
</template>
