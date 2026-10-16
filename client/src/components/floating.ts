import type { CSSProperties } from 'react'

/** Fixed position next to an anchor element, flipped to stay inside the viewport. */
export function floatingStyle(rect: DOMRect, width: number, gap = 10): CSSProperties {
  const margin = 8
  const fitsRight = rect.right + gap + width + margin <= window.innerWidth
  const left = fitsRight ? rect.right + gap : Math.max(margin, rect.left - gap - width)
  return {
    position: 'fixed',
    width: Math.min(width, window.innerWidth - margin * 2),
    left: Math.min(left, window.innerWidth - margin - Math.min(width, window.innerWidth - margin * 2)),
    top: Math.max(margin, Math.min(rect.top, window.innerHeight - 260)),
  }
}
