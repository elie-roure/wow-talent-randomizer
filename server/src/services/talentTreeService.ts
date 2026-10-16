import { APEX_MAX_RANKS, BUDGETS } from '../config';
import { SPEC_OVERRIDES } from '../data/specOverrides';
import { Gate, HeroTree, NodeType, SpecTalentData, TalentEntry, TalentNode } from '../types';
import { getGameData } from './blizzardClient';
import { getIcon } from './mediaService';

// --- Raw Blizzard API shapes (only the fields we use) ---

type RawTooltip = {
  talent?: { id: number; name: string };
  spell_tooltip?: {
    spell?: { id: number; name: string };
    description?: string;
    cast_time?: string;
    cooldown?: string;
    range?: string;
    power_cost?: string | null;
  };
};

export type RawNode = {
  id: number;
  node_type: { type: string };
  ranks?: Array<{ rank: number; tooltip?: RawTooltip; choice_of_tooltips?: RawTooltip[] }>;
  display_row: number;
  display_col: number;
  raw_position_x: number;
  raw_position_y: number;
  locked_by?: number[];
  unlocks?: number[];
};

type RawHeroTree = {
  id: number;
  name: string;
  hero_talent_nodes: RawNode[];
  playable_specializations: Array<{ id: number }>;
};

export type RawSpecTree = {
  restriction_lines?: Array<{ required_points: number; restricted_row: number; is_for_class: boolean }>;
  class_talent_nodes: RawNode[];
  spec_talent_nodes: RawNode[];
  hero_talent_trees?: RawHeroTree[];
};

type RawFullTree = { talent_nodes: Array<{ id: number }> };

type RawSpecialization = {
  id: number;
  name: string;
  role?: { type: string };
  playable_class: { id: number; name: string };
  spec_talent_tree?: { key: { href: string } };
};

// --- Normalization ---

function toEntry(tooltip: RawTooltip, descriptions: string[]): TalentEntry {
  const spell = tooltip.spell_tooltip;
  return {
    talentId: tooltip.talent?.id ?? 0,
    spellId: spell?.spell?.id ?? null,
    name: tooltip.talent?.name ?? spell?.spell?.name ?? '?',
    icon: null,
    castTime: spell?.cast_time,
    cooldown: spell?.cooldown,
    range: spell?.range,
    powerCost: spell?.power_cost ?? undefined,
    descriptions,
  };
}

function toEntries(raw: RawNode): TalentEntry[] {
  const ranks = raw.ranks ?? [];
  const choices = ranks[0]?.choice_of_tooltips;
  if (choices?.length) {
    return choices.map((c) => toEntry(c, [c.spell_tooltip?.description ?? '']));
  }
  const first = ranks.find((r) => r.tooltip)?.tooltip;
  if (!first) return [];
  return [toEntry(first, ranks.map((r) => r.tooltip?.spell_tooltip?.description ?? ''))];
}

function toNode(raw: RawNode): TalentNode {
  const type = (['ACTIVE', 'PASSIVE', 'CHOICE'].includes(raw.node_type.type)
    ? raw.node_type.type
    : 'PASSIVE') as NodeType;
  return {
    id: raw.id,
    type,
    row: raw.display_row,
    col: raw.display_col,
    x: raw.raw_position_x,
    y: raw.raw_position_y,
    maxRanks: Math.max(1, raw.ranks?.length ?? 1),
    lockedBy: raw.locked_by ?? [],
    unlocks: raw.unlocks ?? [],
    entries: toEntries(raw),
    granted: false,
    isApex: false,
  };
}

/**
 * Keeps only one node per tree position. Spec-specific variants share a position:
 * prefer the one the API also lists in `preferred` (a quirk that flags the valid variant),
 * otherwise the lowest id.
 */
function dedupeByPosition(nodes: TalentNode[], preferred: Set<number>): TalentNode[] {
  const byPosition = new Map<string, TalentNode>();
  for (const node of [...nodes].sort((a, b) => a.id - b.id)) {
    const key = `${node.row}:${node.col}`;
    const current = byPosition.get(key);
    if (!current || (!preferred.has(current.id) && preferred.has(node.id))) byPosition.set(key, node);
  }
  return nodes.filter((n) => byPosition.get(`${n.row}:${n.col}`) === n);
}

/** Drops links pointing outside the tree. */
function cleanLinks(nodes: TalentNode[]): TalentNode[] {
  const ids = new Set(nodes.map((n) => n.id));
  return nodes.map((n) => ({
    ...n,
    lockedBy: [...new Set(n.lockedBy)].filter((id) => ids.has(id)),
    unlocks: [...new Set(n.unlocks)].filter((id) => ids.has(id)),
  }));
}

function toGates(raw: RawSpecTree, forClass: boolean): Gate[] {
  return (raw.restriction_lines ?? [])
    .filter((l) => l.is_for_class === forClass)
    .map((l) => ({ row: l.restricted_row, requiredPoints: l.required_points }))
    .sort((a, b) => a.row - b.row);
}

/** Pure transformation of the Blizzard documents into the API shape (icons excluded). */
export function normalizeSpecTree(
  specId: number,
  raw: RawSpecTree,
  fullTree: RawFullTree,
): Pick<SpecTalentData, 'nodeOrder' | 'selectionNodeId' | 'budgets' | 'gates' | 'classNodes' | 'specNodes' | 'heroTrees'> {
  const override = SPEC_OVERRIDES[specId];
  const excluded = new Set(override?.excluded ?? []);
  const granted = new Set(override?.granted ?? []);

  const rawHeroTrees = raw.hero_talent_trees ?? [];
  const heroNodeIds = new Set(rawHeroTrees.flatMap((h) => h.hero_talent_nodes.map((n) => n.id)));
  const preferred = new Set([...raw.class_talent_nodes, ...raw.spec_talent_nodes].map((n) => n.id));

  // The hero selection node is a choice node without tooltip at the top of the class tree.
  const selectionNode = raw.class_talent_nodes.find(
    (n) => n.node_type.type === 'CHOICE' && toEntries(n).length === 0,
  );

  const prepare = (nodes: RawNode[]) =>
    cleanLinks(
      dedupeByPosition(
        nodes
          .filter((n) => !heroNodeIds.has(n.id) && !excluded.has(n.id))
          .map(toNode)
          .filter((n) => n.entries.length > 0),
        preferred,
      ),
    ).map((n) => ({ ...n, granted: granted.has(n.id) }));

  const classNodes = prepare(raw.class_talent_nodes);
  const specNodes = prepare(raw.spec_talent_nodes);

  // Apex talent: the isolated node at the bottom of the spec tree.
  const maxSpecRow = Math.max(...specNodes.map((n) => n.row));
  for (const node of specNodes) {
    if (node.row === maxSpecRow && node.lockedBy.length === 0 && node.unlocks.length === 0) {
      node.isApex = true;
      node.maxRanks = APEX_MAX_RANKS;
    }
  }

  const specHeroTrees = rawHeroTrees.filter((h) => h.playable_specializations.some((p) => p.id === specId));
  const heroOrder = override?.heroOrder ?? specHeroTrees.map((h) => h.id).sort((a, b) => b - a);

  const heroTrees: HeroTree[] = specHeroTrees
    .map((h) => {
      const nodes = cleanLinks(
        dedupeByPosition(
          h.hero_talent_nodes
            .filter((n) => !excluded.has(n.id))
            .map(toNode)
            .filter((n) => n.entries.length > 0),
          preferred,
        ),
      );
      // The first node of a hero tree is granted when the tree is selected.
      const topRow = Math.min(...nodes.map((n) => n.row));
      for (const node of nodes) node.granted = node.row === topRow;
      return {
        id: h.id,
        name: h.name,
        icon: null,
        selectionIndex: heroOrder.indexOf(h.id),
        nodes,
      };
    })
    .filter((h) => h.selectionIndex >= 0)
    .sort((a, b) => a.selectionIndex - b.selectionIndex);

  return {
    nodeOrder: fullTree.talent_nodes.map((n) => n.id).sort((a, b) => a - b),
    selectionNodeId: selectionNode?.id ?? null,
    budgets: { ...BUDGETS },
    gates: { class: toGates(raw, true), spec: toGates(raw, false) },
    classNodes,
    specNodes,
    heroTrees,
  };
}

async function attachIcons(nodes: TalentNode[]): Promise<void> {
  const entries = nodes.flatMap((n) => n.entries).filter((e) => e.spellId);
  await Promise.all(
    entries.map(async (e) => {
      e.icon = await getIcon(`/data/wow/media/spell/${e.spellId}`);
    }),
  );
}

export class NotFoundError extends Error {}

export async function getSpecTalentData(specId: number, locale: string): Promise<SpecTalentData> {
  const spec = await getGameData<RawSpecialization>(`/data/wow/playable-specialization/${specId}`, locale);
  const href = spec.spec_talent_tree?.key.href ?? '';
  const treeId = Number(href.match(/talent-tree\/(\d+)/)?.[1]);
  if (!treeId) throw new NotFoundError(`No talent tree for specialization ${specId}`);
  const gameVersion = href.match(/namespace=static-([\d.]+)/)?.[1] ?? null;

  const [raw, fullTree, specIcon, classIcon] = await Promise.all([
    getGameData<RawSpecTree>(`/data/wow/talent-tree/${treeId}/playable-specialization/${specId}`, locale),
    getGameData<RawFullTree>(`/data/wow/talent-tree/${treeId}`, locale),
    getIcon(`/data/wow/media/playable-specialization/${specId}`),
    getIcon(`/data/wow/media/playable-class/${spec.playable_class.id}`),
  ]);

  const data = normalizeSpecTree(specId, raw, fullTree);
  await attachIcons([...data.classNodes, ...data.specNodes, ...data.heroTrees.flatMap((h) => h.nodes)]);
  for (const hero of data.heroTrees) {
    hero.icon = hero.nodes.find((n) => n.granted)?.entries[0]?.icon ?? null;
  }

  return {
    gameVersion,
    locale,
    classId: spec.playable_class.id,
    className: spec.playable_class.name,
    classIcon,
    specId: spec.id,
    specName: spec.name,
    specIcon,
    role: spec.role?.type ?? 'DAMAGE',
    treeId,
    ...data,
  };
}
