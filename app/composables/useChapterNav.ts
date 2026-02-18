export async function useChapterNav(novel: string, currentPath: string) {
  const { data: rawChapters } = await useAsyncData(
    `nav-${novel}`,
    () => queryCollection(novel as any)
      .select('title', 'path', 'stem')
      .all()
  )

  const sortedChapters = computed(() => {
    if (!rawChapters.value) return []
    return [...rawChapters.value].sort((a, b) =>
      a.stem.localeCompare(b.stem, undefined, { numeric: true, sensitivity: 'base' })
    )
  })

  const currentIndex = computed(() =>
    sortedChapters.value.findIndex(ch => ch.path === currentPath)
  )

  const prev = computed(() =>
    currentIndex.value > 0
      ? sortedChapters.value[currentIndex.value - 1]
      : null
  )

  const next = computed(() =>
    currentIndex.value < sortedChapters.value.length - 1
      ? sortedChapters.value[currentIndex.value + 1]
      : null
  )

  return { prev, next, chapters: sortedChapters }
}
