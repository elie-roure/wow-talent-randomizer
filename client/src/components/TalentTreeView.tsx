import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import {
  activeRank,
  addRank,
  blockingGate,
  canAddRank,
  canRemoveRank,
  isMaxed,
  isUnlocked,
  pointsAbove,
  pointsSpent,
  removeRank,
  type Build,
  type Tree,
} from '../lib/talents'
import type { TalentNode } from '../lib/types'
import TalentTooltip from './TalentTooltip'
import ChoicePicker from './ChoicePicker'
import './TalentTreeView.css'

// Raw Blizzard coordinates are ~600 units apart between two columns.
const SCALE = 0.095
const PADDING = 34

type NodeState = 'maxed' | 'partial' | 'available' | 'locked'

interface Anchor {
  node: TalentNode
  rect: DOMRect
}

interface Props {
  title: string
  icon?: string | null
  tree: Tree
  build: Build
  onChange: (build: Build) => void
  actions?: ReactNode
}

export default function TalentTreeView({ title, icon, tree, build, onChange, actions }: Props) {
  const [hovered, setHovered] = useState<Anchor | null>(null)
  const [picking, setPicking] = useState<Anchor | null>(null)
  const [rejectedId, setRejectedId] = useState<number | null>(null)

  const layout = useMemo(() => {
    const xs = tree.nodes.map((n) => n.x)
    const ys = tree.nodes.map((n) => n.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const pos = new Map(
      tree.nodes.map((n) => [n.id, { left: (n.x - minX) * SCALE + PADDING, top: (n.y - minY) * SCALE + PADDING }]),
    )
    // Vertical position of a (possibly fractional) row, interpolated from the nodes of each row.
    const rowTop = new Map<number, number>()
    for (const n of tree.nodes) rowTop.set(n.row, Math.min(rowTop.get(n.row) ?? Infinity, pos.get(n.id)!.top))
    const gateTop = (row: number) => {
      const above = rowTop.get(Math.floor(row))
      const below = rowTop.get(Math.ceil(row))
      return above !== undefined && below !== undefined ? (above + below) / 2 : (above ?? below ?? 0)
    }
    return {
      pos,
      gateTop,
      width: (Math.max(...xs) - minX) * SCALE + PADDING * 2,
      height: (Math.max(...ys) - minY) * SCALE + PADDING * 2,
    }
  }, [tree])

  const spent = pointsSpent(build, tree)

  const stateOf = (node: TalentNode): NodeState => {
    const rank = activeRank(build, node)
    if (rank >= node.maxRanks) return 'maxed'
    if (rank > 0) return 'partial'
    return isUnlocked(build, tree, node) ? 'available' : 'locked'
  }

  const reject = (node: TalentNode) => {
    setRejectedId(node.id)
    window.setTimeout(() => setRejectedId((id) => (id === node.id ? null : id)), 400)
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>, node: TalentNode) => {
    const rank = activeRank(build, node)
    if (node.type === 'CHOICE' && !node.granted && (rank > 0 || canAddRank(build, tree, node))) {
      setHovered(null)
      setPicking({ node, rect: event.currentTarget.getBoundingClientRect() })
      return
    }
    if (canAddRank(build, tree, node)) onChange(addRank(build, node))
    else reject(node)
  }

  const handleContextMenu = (event: MouseEvent<HTMLButtonElement>, node: TalentNode) => {
    event.preventDefault()
    if (canRemoveRank(build, tree, node)) onChange(removeRank(build, node))
    else if (activeRank(build, node) > 0) reject(node)
  }

  const handlePick = (node: TalentNode, index: number) => {
    setPicking(null)
    if ((build.ranks[node.id] ?? 0) > 0) onChange({ ...build, choices: { ...build.choices, [node.id]: index } })
    else onChange(addRank(build, node, index))
  }

  const lockReason = (node: TalentNode): string | null => {
    if (node.granted) return 'Accordé gratuitement par la spécialisation'
    const gate = blockingGate(build, tree, node)
    if (gate) {
      const missing = gate.requiredPoints - pointsAbove(build, tree, gate.row)
      return `Dépensez encore ${missing} point${missing > 1 ? 's' : ''} plus haut dans l'arbre`
    }
    if (!isUnlocked(build, tree, node)) return 'Requiert un talent relié au rang maximum'
    return null
  }

  return (
    <section className={`tree tree-${tree.kind}`}>
      <header className="tree-header">
        <h2 className="tree-title">
          {icon && <img src={icon} alt="" />}
          {title}
        </h2>
        <span className={`tree-points ${spent === tree.budget ? 'is-full' : ''}`}>
          {spent} / {tree.budget}
        </span>
        {actions}
      </header>

      <div className="tree-scroll">
        <div className="tree-canvas" style={{ width: layout.width, height: layout.height }}>
          <svg className="tree-links" width={layout.width} height={layout.height} aria-hidden>
            {tree.nodes.flatMap((parent) =>
              parent.unlocks.map((childId) => {
                const child = tree.byId.get(childId)
                if (!child) return null
                const a = layout.pos.get(parent.id)!
                const b = layout.pos.get(child.id)!
                const state =
                  isMaxed(build, parent) && activeRank(build, child) > 0
                    ? 'active'
                    : isMaxed(build, parent)
                      ? 'available'
                      : 'locked'
                return (
                  <line
                    key={`${parent.id}-${child.id}`}
                    className={`link link-${state}`}
                    x1={a.left}
                    y1={a.top}
                    x2={b.left}
                    y2={b.top}
                  />
                )
              }),
            )}
          </svg>

          {tree.gates.map((gate) => {
            const done = pointsAbove(build, tree, gate.row)
            const open = done >= gate.requiredPoints
            return (
              <div
                key={gate.row}
                className={`gate ${open ? 'is-open' : ''}`}
                style={{ top: layout.gateTop(gate.row) }}
              >
                <span className="gate-label">
                  {open ? '✓' : '🔒'} {Math.min(done, gate.requiredPoints)} / {gate.requiredPoints}
                </span>
              </div>
            )
          })}

          {tree.nodes.map((node) => {
            const { left, top } = layout.pos.get(node.id)!
            const rank = activeRank(build, node)
            const state = stateOf(node)
            const choice = build.choices[node.id]
            const chosen = node.type === 'CHOICE' && rank > 0 ? node.entries[choice ?? 0] : null
            return (
              <button
                key={node.id}
                type="button"
                className={[
                  'node',
                  `node-${node.type.toLowerCase()}`,
                  `node-${state}`,
                  node.isApex ? 'node-apex' : '',
                  node.granted ? 'node-granted' : '',
                  rejectedId === node.id ? 'node-rejected' : '',
                ].join(' ')}
                style={{ left, top }}
                onClick={(e) => handleClick(e, node)}
                onContextMenu={(e) => handleContextMenu(e, node)}
                onMouseEnter={(e) => setHovered({ node, rect: e.currentTarget.getBoundingClientRect() })}
                onMouseLeave={() => setHovered(null)}
                aria-label={`${node.entries.map((e) => e.name).join(' / ')} (${rank}/${node.maxRanks})`}
              >
                <span className="node-frame">
                  <span className="node-icon">
                    {chosen || node.entries.length === 1 ? (
                      <img src={(chosen ?? node.entries[0]).icon ?? undefined} alt="" draggable={false} />
                    ) : (
                      node.entries.slice(0, 2).map((entry) => (
                        <img
                          key={entry.talentId}
                          className="node-icon-half"
                          src={entry.icon ?? undefined}
                          alt=""
                          draggable={false}
                        />
                      ))
                    )}
                  </span>
                </span>
                {!node.granted && (
                  <span className="node-rank">
                    {rank}/{node.maxRanks}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {hovered && !picking && (
        <TalentTooltip
          node={hovered.node}
          rect={hovered.rect}
          rank={activeRank(build, hovered.node)}
          choice={build.choices[hovered.node.id]}
          lockReason={lockReason(hovered.node)}
          canRemove={canRemoveRank(build, tree, hovered.node)}
        />
      )}

      {picking && (
        <ChoicePicker
          node={picking.node}
          rect={picking.rect}
          selected={(build.ranks[picking.node.id] ?? 0) > 0 ? build.choices[picking.node.id] : undefined}
          onPick={(index) => handlePick(picking.node, index)}
          onClose={() => setPicking(null)}
        />
      )}
    </section>
  )
}
