// Mirrors server/src/types.ts (REST API contract).

export interface GameVersion {
  expansion: string
  patch: string
  maxLevel: number
}

export interface ApiMeta {
  /** Version the talent rules were calibrated for. */
  supportedVersion: GameVersion
  budgets: { class: number; spec: number; hero: number }
  apexMaxRanks: number
  region: string
}

export interface SpecSummary {
  id: number
  name: string
  icon: string | null
  role: string
}

export interface ClassSummary {
  id: number
  name: string
  icon: string | null
  specs: SpecSummary[]
}

export interface TalentEntry {
  talentId: number
  spellId: number | null
  name: string
  icon: string | null
  castTime?: string
  cooldown?: string
  range?: string
  powerCost?: string
  descriptions: string[]
}

export type NodeType = 'ACTIVE' | 'PASSIVE' | 'CHOICE'

export interface TalentNode {
  id: number
  type: NodeType
  row: number
  col: number
  x: number
  y: number
  maxRanks: number
  lockedBy: number[]
  unlocks: number[]
  entries: TalentEntry[]
  granted: boolean
  isApex: boolean
}

export interface Gate {
  row: number
  requiredPoints: number
}

export interface HeroTree {
  id: number
  name: string
  icon: string | null
  selectionIndex: number
  nodes: TalentNode[]
}

export interface SpecTalentData {
  gameVersion: string | null
  locale: string
  classId: number
  className: string
  classIcon: string | null
  specId: number
  specName: string
  specIcon: string | null
  role: string
  treeId: number
  nodeOrder: number[]
  selectionNodeId: number | null
  budgets: { class: number; spec: number; hero: number }
  gates: { class: Gate[]; spec: Gate[] }
  classNodes: TalentNode[]
  specNodes: TalentNode[]
  heroTrees: HeroTree[]
}
