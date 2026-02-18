<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const progress = ref<Record<string, string>>({})

onMounted(() => {
  progress.value = useReadingProgress().getAll()
})

function extractChapter(path: string): string {
  const segments = path.split('/')
  return segments[segments.length - 1] || ''
}

const items = computed<DropdownMenuItem[][]>(() => {
  const entries = Object.entries(progress.value)
  if (entries.length === 0) {
    return [[{ label: 'Start reading to track progress', disabled: true }]]
  }
  return [
    entries.map(([novel, path]) => ({
      label: `${getNovelName(novel)} - Chapter ${extractChapter(path)}`,
      to: path,
    })),
  ]
})
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      icon="i-lucide-book-open"
      label="Continue Reading"
      variant="ghost"
      color="neutral"
      size="sm"
    />
  </UDropdownMenu>
</template>
