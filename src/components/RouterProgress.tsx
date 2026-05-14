'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function RouterProgress() {
  const pathname = usePathname()
  const [width, setWidth] = useState(0)
  const [opacity, setOpacity] = useState(0)
  const isNavigating = useRef(false)
  const startedAt = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const hideRef = useRef<ReturnType<typeof setTimeout>>()

  function start() {
    clearInterval(intervalRef.current)
    clearTimeout(hideRef.current)
    isNavigating.current = true
    startedAt.current = Date.now()
    setOpacity(1)
    setWidth(20)
    intervalRef.current = setInterval(() => {
      setWidth((w) => {
        if (w >= 82) { clearInterval(intervalRef.current); return w }
        return w + Math.random() * 10
      })
    }, 350)
  }

  function finish() {
    clearInterval(intervalRef.current)
    isNavigating.current = false
    setWidth(100)
    hideRef.current = setTimeout(() => {
      setOpacity(0)
      setTimeout(() => setWidth(0), 300)
    }, 200)
  }

  // Complete bar whenever pathname changes (navigation done)
  useEffect(() => {
    if (!isNavigating.current) return
    const elapsed = Date.now() - startedAt.current
    const wait = Math.max(0, 200 - elapsed)
    const t = setTimeout(finish, wait)
    return () => clearTimeout(t)
  }, [pathname])

  // Listen for clicks on any internal anchor
  useEffect(() => {
    function onAnchorClick(e: MouseEvent) {
      const a = (e.target as Element).closest('a')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return
      if (href === window.location.pathname + window.location.search) return
      start()
    }
    document.addEventListener('click', onAnchorClick)
    return () => {
      document.removeEventListener('click', onAnchorClick)
      clearInterval(intervalRef.current)
      clearTimeout(hideRef.current)
    }
  }, [])

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none"
      style={{ opacity, transition: 'opacity 0.3s' }}
    >
      <div
        className="h-full bg-orange-500"
        style={{
          width: `${width}%`,
          transition: width === 100 ? 'width 0.2s ease' : 'width 0.4s ease',
          boxShadow: '0 0 8px #f97316',
        }}
      />
    </div>
  )
}
