<script setup lang="ts">
const { isVisible } = useAutoHideHeader()
</script>

<template>
  <div>
    <header
      class="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-in-out"
      :class="{ '-translate-y-full': !isVisible }"
    >
      <div class="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <NuxtLink to="/" class="text-lg font-semibold">Schaden</NuxtLink>
          <nav class="flex items-center gap-4 text-sm">
            <NuxtLink to="/" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Home</NuxtLink>
            <NuxtLink to="/novels" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Novels</NuxtLink>
          </nav>
        </div>
        <ClientOnly>
          <ResumeDropdown />
        </ClientOnly>
      </div>
    </header>
    <main class="pt-14">
      <slot />
    </main>
  </div>
</template>
