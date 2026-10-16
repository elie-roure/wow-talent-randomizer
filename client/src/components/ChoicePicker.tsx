import { useEffect } from 'react'
import type { TalentNode } from '../lib/types'
import { floatingStyle } from './floating'

interface Props {
  node: TalentNode
  rect: DOMRect
  selected: number | undefined
  onPick: (index: number) => void
  onClose: () => void
}

export default function ChoicePicker({ node, rect, selected, onPick, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="picker-backdrop"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="picker" style={floatingStyle(rect, 360)} onClick={(e) => e.stopPropagation()} role="dialog">
        <p className="picker-title">Choisis un talent</p>
        {node.entries.map((entry, index) => (
          <button
            key={entry.talentId}
            type="button"
            className={`picker-option ${selected === index ? 'is-selected' : ''}`}
            onClick={() => onPick(index)}
            autoFocus={index === 0}
          >
            {entry.icon && <img src={entry.icon} alt="" />}
            <span>
              <strong>{entry.name}</strong>
              <small>{entry.descriptions[0]}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
