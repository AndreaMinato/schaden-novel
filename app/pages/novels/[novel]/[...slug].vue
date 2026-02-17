<script setup lang="ts">
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
</script>

<template>
  <div v-if="chapter">
    <h1>{{ chapter.title }}</h1>
    <ContentRenderer :value="chapter" />
  </div>
</template>
