<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'

const route = useRoute()
const novel = route.params.novel as string
const slug = (route.params.slug as string[]).join('/')

// Content path is /{novel}/{slug}, NOT the full route path /novels/{novel}/{slug}
const contentPath = `/${novel}/${slug}`

const { data: chapter } = await useAsyncData(
  `chapter-${novel}-${slug}`,
  () => queryCollection(novel as any)
    .path(contentPath)
    .first()
)

if (!chapter.value) {
  throw createError({ statusCode: 404, message: 'Chapter not found' })
}

// Chapter navigation (ascending sort: prev = lower index, next = higher index)
const { prev, next } = await useChapterNav(novel, contentPath)

// Reading progress: save route path on mount so Phase 3 can resume directly
onMounted(() => {
  useReadingProgress().save(novel, `/novels${contentPath}`)
})

// Breadcrumb
const breadcrumbItems = computed<BreadcrumbItem[]>(() => [
  { label: novel.toUpperCase(), to: `/novels/${novel}` },
  { label: chapter.value?.title || `Chapter ${slug}` },
])

// Keyboard shortcuts (Cmd+Arrow)
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

    <!-- Chapter prose -->
    <article class="prose prose-lg dark:prose-invert max-w-none leading-relaxed">
      <ContentRenderer v-if="chapter" :value="chapter" />
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
