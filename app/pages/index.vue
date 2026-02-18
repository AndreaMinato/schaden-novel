<script setup lang="ts">
const { data: novels } = await useAsyncData('home-novels', async () => {
  const results = await Promise.all(
    NOVEL_SLUGS.map(async (slug) => {
      const chapters = await queryCollection(slug as any)
        .select('title', 'path', 'stem', 'pubDate')
        .order('pubDate', 'DESC')
        .limit(3)
        .all()
      return { slug: slug as string, name: getNovelName(slug as string), chapters }
    })
  )
  return results
    .filter(n => n.chapters.length > 0)
    .sort((a, b) => {
      const aDate = a.chapters[0]?.pubDate ?? 0
      const bDate = b.chapters[0]?.pubDate ?? 0
      return new Date(bDate as any).valueOf() - new Date(aDate as any).valueOf()
    })
})

const progress = ref<Record<string, string>>({})

onMounted(() => {
  progress.value = useReadingProgress().getAll()
})

const progressEntries = computed(() => Object.entries(progress.value))

function extractChapter(path: string): string {
  const segments = path.split('/')
  return segments[segments.length - 1] || ''
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">Schaden Novel</h1>

    <!-- Resume Reading Section (client-only) -->
    <ClientOnly>
      <section v-if="progressEntries.length > 0" class="mb-10">
        <h2 class="text-xl font-semibold mb-4">Continue Reading</h2>
        <ul class="space-y-2">
          <li v-for="[novel, path] in progressEntries" :key="novel">
            <NuxtLink
              :to="path"
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {{ getNovelName(novel) }} - Chapter {{ extractChapter(path) }}
            </NuxtLink>
          </li>
        </ul>
      </section>
      <section v-else class="mb-10">
        <h2 class="text-xl font-semibold mb-4">Continue Reading</h2>
        <p class="text-gray-500 dark:text-gray-400">Start reading to track progress</p>
      </section>
    </ClientOnly>

    <!-- Novel Sections -->
    <div v-if="novels && novels.length > 0" class="space-y-10">
      <section v-for="novel in novels" :key="novel.slug">
        <div class="flex items-baseline justify-between mb-3">
          <h2 class="text-xl font-semibold">
            <NuxtLink
              :to="`/novels/${novel.slug}`"
              class="hover:text-blue-600 dark:hover:text-blue-400"
            >
              {{ novel.name }}
            </NuxtLink>
          </h2>
          <NuxtLink
            :to="`/novels/${novel.slug}`"
            class="text-sm text-gray-500 dark:text-gray-400 hover:underline"
          >
            View all chapters
          </NuxtLink>
        </div>
        <ul class="space-y-1">
          <li v-for="ch in novel.chapters" :key="ch.path">
            <NuxtLink
              :to="`/novels${ch.path}`"
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {{ ch.title }}
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>

    <p v-else class="text-gray-500 dark:text-gray-400">
      No novels with content available yet.
    </p>
  </div>
</template>
