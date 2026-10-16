// Shapes returned by the REST API (mirrored in client/src/lib/types.ts).

export interface GameVersion {
  expansion: string;
  patch: string;
  maxLevel: number;
}

export interface ApiMeta {
  /** Version the talent rules were calibrated for. */
  supportedVersion: GameVersion;
  budgets: { class: number; spec: number; hero: number };
  apexMaxRanks: number;
  region: string;
}

export interface SpecSummary {
  id: number;
  name: string;
  icon: string | null;
  role: string;
}

export interface ClassSummary {
  id: number;
  name: string;
  icon: string | null;
  specs: SpecSummary[];
}

export interface TalentEntry {
  talentId: number;
  spellId: number | null;
  name: string;
  icon: string | null;
  castTime?: string;
  cooldown?: string;
  range?: string;
  powerCost?: string;
  /** One description per rank. */
  descriptions: string[];
}

export type NodeType = 'ACTIVE' | 'PASSIVE' | 'CHOICE';

export interface TalentNode {
  id: number;
  type: NodeType;
  row: number;
  col: number;
  x: number;
  y: number;
  maxRanks: number;
  lockedBy: number[];
  unlocks: number[];
  /** Several entries only for choice nodes. */
  entries: TalentEntry[];
  /** Granted for free to this specialization. */
  granted: boolean;
  isApex: boolean;
}

export interface Gate {
  /** Nodes whose row is greater than this value are locked behind the gate. */
  row: number;
  requiredPoints: number;
}

export interface HeroTree {
  id: number;
  name: string;
  icon: string | null;
  /** Index of this tree in the hero selection node (used by the export string). */
  selectionIndex: number;
  nodes: TalentNode[];
}

export interface SpecTalentData {
  gameVersion: string | null;
  locale: string;
  classId: number;
  className: string;
  classIcon: string | null;
  specId: number;
  specName: string;
  specIcon: string | null;
  role: string;
  treeId: number;
  /** All node ids of the class tree (every spec + hero trees), ascending: order of the export string. */
  nodeOrder: number[];
  selectionNodeId: number | null;
  budgets: { class: number; spec: number; hero: number };
  gates: { class: Gate[]; spec: Gate[] };
  classNodes: TalentNode[];
  specNodes: TalentNode[];
  heroTrees: HeroTree[];
}
