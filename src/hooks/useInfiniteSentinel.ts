import { useEffect, useRef } from 'react'

export function useInfiniteSentinel(enabled: boolean, onVisible: () => void) {
  const ref = useRef<HTMLDivElement | null>(null)
  const onVisibleRef = useRef(onVisible)
  useEffect(() => {
    onVisibleRef.current = onVisible
  }, [onVisible])
  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onVisibleRef.current()
      },
      { rootMargin: '480px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [enabled])
  return ref
}
