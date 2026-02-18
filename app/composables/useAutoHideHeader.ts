export function useAutoHideHeader() {
  const isVisible = ref(true)
  let lastScrollY = 0
  let ticking = false

  function onScroll() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      const currentY = window.scrollY
      if (currentY < 60) {
        isVisible.value = true
      } else {
        isVisible.value = currentY < lastScrollY
      }
      lastScrollY = currentY
      ticking = false
    })
  }

  onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
  onUnmounted(() => window.removeEventListener('scroll', onScroll))

  return { isVisible }
}
