<script setup lang="ts">
const route = useRoute()
const novel = route.params.novel as string

const { data: chapter } = await useAsyncData(
  `chapter-${novel}-${(route.params.slug as string[]).join('-')}`,
  () => queryCollection(novel as any)
    .path(route.path)
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
