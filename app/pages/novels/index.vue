<script setup lang="ts">
const { data: novelStats } = await useAsyncData('catalog', async () => {
  const results = await Promise.all(
    NOVEL_SLUGS.map(async (slug) => {
      const count = await queryCollection(slug as any).count()
      return { slug: slug as string, name: getNovelName(slug as string), count }
    })
  )
  return results
    .filter(n => n.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
})
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">Novels</h1>

    <ul v-if="novelStats && novelStats.length > 0" class="space-y-4">
      <li v-for="novel in novelStats" :key="novel.slug">
        <NuxtLink
          :to="`/novels/${novel.slug}`"
          class="flex items-baseline justify-between py-2 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <span class="text-lg font-medium">{{ novel.name }}</span>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ novel.count }} chapters</span>
        </NuxtLink>
      </li>
    </ul>

    <p v-else class="text-gray-500 dark:text-gray-400">
      No novels available yet.
    </p>
  </div>
</template>
