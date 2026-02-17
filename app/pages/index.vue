<script setup lang="ts">
const { data: chapters } = await useAsyncData(
  'home-lrg-chapters',
  () => queryCollection('lrg')
    .select('title', 'path', 'stem')
    .order('stem', 'ASC')
    .limit(10)
    .all()
)
</script>

<template>
  <div>
    <h1>Schaden Novel</h1>
    <p>Infrastructure validation — {{ chapters?.length ?? 0 }} recent lrg chapters loaded</p>
    <ul v-if="chapters">
      <li v-for="ch in chapters" :key="ch.path">
        <NuxtLink :to="`/novels${ch.path}`">{{ ch.title }}</NuxtLink>
      </li>
    </ul>
  </div>
</template>
