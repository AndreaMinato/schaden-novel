<script setup lang="ts">
const route = useRoute()
const novel = route.params.novel as string

const { data: rawChapters } = await useAsyncData(
  `listing-${novel}`,
  () => queryCollection(novel as any)
    .select('title', 'path', 'stem')
    .all()
)

const chapters = computed(() => {
  if (!rawChapters.value) return []
  return [...rawChapters.value].sort((a, b) =>
    b.stem.localeCompare(a.stem, undefined, { numeric: true, sensitivity: 'base' })
  )
})
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-1">{{ novel.toUpperCase() }}</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">{{ chapters.length }} chapters</p>
    <ul class="space-y-1">
      <li v-for="ch in chapters" :key="ch.path">
        <NuxtLink
          :to="`/novels${ch.path}`"
          class="block py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {{ ch.title }}
        </NuxtLink>
      </li>
    </ul>
    <p v-if="!chapters.length" class="text-gray-500">No chapters found.</p>
  </div>
</template>
