<script setup lang="ts">
const route = useRoute()
const novel = route.params.novel as string

const { data: chapters } = await useAsyncData(
  `listing-${novel}`,
  () => queryCollection(novel as any)
    .select('title', 'path', 'stem')
    .order('stem', 'ASC')
    .all()
)
</script>

<template>
  <div>
    <h1>{{ novel }} — {{ chapters?.length ?? 0 }} chapters</h1>
    <ul v-if="chapters">
      <li v-for="ch in chapters" :key="ch.path">
        <NuxtLink :to="`/novels${ch.path}`">{{ ch.title }}</NuxtLink>
      </li>
    </ul>
    <p v-else>No chapters found for "{{ novel }}"</p>
  </div>
</template>
