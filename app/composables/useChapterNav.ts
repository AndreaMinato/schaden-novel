import type { Ref, ComputedRef } from 'vue'

export function useChapterNav(
  novel: Ref<string> | ComputedRef<string>,
  currentPath: Ref<string> | ComputedRef<string>
) {
  const { data: rawChapters } = useAsyncData(
    () => `nav-${toValue(novel)}`,
    () => queryCollection(toValue(novel) as any)
      .select('title', 'path', 'stem')
      .all(),
    { watch: [novel] }
  )

  const sortedChapters = computed(() => {
    if (!rawChapters.value) return []
    return [...rawChapters.value].sort((a, b) =>
      a.stem.localeCompare(b.stem, undefined, { numeric: true, sensitivity: 'base' })
    )
  })

  const currentIndex = computed(() =>
    sortedChapters.value.findIndex(ch => ch.path === toValue(currentPath))
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
