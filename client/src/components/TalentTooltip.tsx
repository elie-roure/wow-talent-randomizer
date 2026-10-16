import type { TalentEntry, TalentNode } from '../lib/types'
import { floatingStyle } from './floating'

interface Props {
  node: TalentNode
  rect: DOMRect
  rank: number
  choice: number | undefined
  lockReason: string | null
  canRemove: boolean
}

function Meta({ entry }: { entry: TalentEntry }) {
  const parts = [entry.castTime, entry.range, entry.cooldown, entry.powerCost].filter(Boolean)
  return parts.length ? <p className="tooltip-meta">{parts.join(' · ')}</p> : null
}

function EntryDetails({ entry, rank, maxRanks }: { entry: TalentEntry; rank: number; maxRanks: number }) {
  const current = entry.descriptions[Math.max(0, Math.min(rank, entry.descriptions.length) - 1)] ?? ''
  const next = rank > 0 && rank < maxRanks ? entry.descriptions[rank] : undefined
  return (
    <>
      <Meta entry={entry} />
      <p className="tooltip-description">{current}</p>
      {next && next !== current && (
        <>
          <p className="tooltip-next-title">Rang suivant :</p>
          <p className="tooltip-description">{next}</p>
        </>
      )}
    </>
  )
}

export default function TalentTooltip({ node, rect, rank, choice, lockReason, canRemove }: Props) {
  const isChoice = node.type === 'CHOICE'
  const chosen = isChoice && rank > 0 ? node.entries[choice ?? 0] : null
  const shown = chosen ? [chosen] : node.entries

  return (
    <div className="tooltip" style={floatingStyle(rect, 320)} role="tooltip">
      {shown.map((entry, i) => (
        <div key={entry.talentId} className={i > 0 ? 'tooltip-option' : undefined}>
          <h3 className="tooltip-title">
            {entry.icon && <img src={entry.icon} alt="" />}
            {entry.name}
          </h3>
          {i === 0 && (
            <p className="tooltip-rank">
              {node.granted ? 'Accordé' : `Rang ${rank}/${node.maxRanks}`}
              {node.isApex && ' · Talent Apex'}
              {isChoice && !chosen && ' · Choix'}
            </p>
          )}
          <EntryDetails entry={entry} rank={chosen ? 1 : rank} maxRanks={node.maxRanks} />
        </div>
      ))}

      {node.isApex && (
        <p className="tooltip-hint">
          Les Apex se renforcent à chaque rang (4 au total). Seul le premier rang est décrit par l'API.
        </p>
      )}
      {lockReason ? (
        <p className="tooltip-lock">{lockReason}</p>
      ) : (
        <p className="tooltip-hint">
          {rank < node.maxRanks ? 'Clic gauche : ajouter un point' : isChoice ? 'Clic gauche : changer de choix' : 'Rang maximum'}
          {rank > 0 && (canRemove ? ' · Clic droit : retirer' : ' · Requis par d’autres talents')}
        </p>
      )}
    </div>
  )
}
