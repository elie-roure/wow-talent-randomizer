import type { Gate, SpecTalentData, TalentNode } from './types'

export type TreeKind = 'class' | 'spec' | 'hero'

/** A talent loadout: purchased ranks per node and the chosen entry of choice nodes. */
export interface Build {
  heroTreeId: number | null
  ranks: Record<number, number>
  choices: Record<number, number>
}

export interface Tree {
  kind: TreeKind
  nodes: TalentNode[]
  byId: Map<number, TalentNode>
  gates: Gate[]
  budget: number
}

export function emptyBuild(heroTreeId: number | null = null): Build {
  return { heroTreeId, ranks: {}, choices: {} }
}

function makeTree(kind: TreeKind, nodes: TalentNode[], gates: Gate[], budget: number): Tree {
  return { kind, nodes, byId: new Map(nodes.map((n) => [n.id, n])), gates, budget }
}

/** The three trees of a build: class, spec and the selected hero tree (if any). */
export function getTrees(data: SpecTalentData, heroTreeId: number | null): Tree[] {
  const trees = [
    makeTree('class', data.classNodes, data.gates.class, data.budgets.class),
    makeTree('spec', data.specNodes, data.gates.spec, data.budgets.spec),
  ]
  const hero = data.heroTrees.find((h) => h.id === heroTreeId)
  if (hero) trees.push(makeTree('hero', hero.nodes, [], data.budgets.hero))
  return trees
}

export function purchasedRanks(build: Build, node: TalentNode): number {
  return node.granted ? 0 : (build.ranks[node.id] ?? 0)
}

/** Rank shown in game: granted nodes count as fully ranked. */
export function activeRank(build: Build, node: TalentNode): number {
  return node.granted ? node.maxRanks : purchasedRanks(build, node)
}

export function isMaxed(build: Build, node: TalentNode): boolean {
  return activeRank(build, node) >= node.maxRanks
}

export function pointsSpent(build: Build, tree: Tree): number {
  return tree.nodes.reduce((sum, n) => sum + purchasedRanks(build, n), 0)
}

/** Points spent in the rows above a gate. */
export function pointsAbove(build: Build, tree: Tree, row: number): number {
  return tree.nodes.reduce((sum, n) => (n.row < row ? sum + purchasedRanks(build, n) : sum), 0)
}

/** The first gate still closed for this node, if any. */
export function blockingGate(build: Build, tree: Tree, node: TalentNode): Gate | null {
  return (
    tree.gates.find((g) => node.row > g.row && pointsAbove(build, tree, g.row) < g.requiredPoints) ??
    null
  )
}

/** Prerequisites met: a root node, or at least one parent fully ranked, and no closed gate. */
export function isUnlocked(build: Build, tree: Tree, node: TalentNode): boolean {
  const parentOk =
    node.lockedBy.length === 0 ||
    node.lockedBy.some((id) => {
      const parent = tree.byId.get(id)
      return parent !== undefined && isMaxed(build, parent)
    })
  return parentOk && blockingGate(build, tree, node) === null
}

export function canAddRank(build: Build, tree: Tree, node: TalentNode): boolean {
  return (
    !node.granted &&
    purchasedRanks(build, node) < node.maxRanks &&
    pointsSpent(build, tree) < tree.budget &&
    isUnlocked(build, tree, node)
  )
}

/** Every purchased node is reachable and no tree exceeds its budget. */
export function isTreeValid(build: Build, tree: Tree): boolean {
  if (pointsSpent(build, tree) > tree.budget) return false
  return tree.nodes.every((n) => purchasedRanks(build, n) === 0 || isUnlocked(build, tree, n))
}

export function addRank(build: Build, node: TalentNode, choiceIndex?: number): Build {
  const rank = (build.ranks[node.id] ?? 0) + 1
  const choices =
    node.type === 'CHOICE' ? { ...build.choices, [node.id]: choiceIndex ?? build.choices[node.id] ?? 0 } : build.choices
  return { ...build, ranks: { ...build.ranks, [node.id]: rank }, choices }
}

export function removeRank(build: Build, node: TalentNode): Build {
  const rank = (build.ranks[node.id] ?? 0) - 1
  const ranks = { ...build.ranks }
  const choices = { ...build.choices }
  if (rank > 0) {
    ranks[node.id] = rank
  } else {
    delete ranks[node.id]
    delete choices[node.id]
  }
  return { ...build, ranks, choices }
}

/** A rank can be removed only if the rest of the tree stays valid. */
export function canRemoveRank(build: Build, tree: Tree, node: TalentNode): boolean {
  if (purchasedRanks(build, node) === 0) return false
  return isTreeValid(removeRank(build, node), tree)
}

/** Removes every purchased rank of a tree. */
export function resetTree(build: Build, tree: Tree): Build {
  const ranks = { ...build.ranks }
  const choices = { ...build.choices }
  for (const node of tree.nodes) {
    delete ranks[node.id]
    delete choices[node.id]
  }
  return { ...build, ranks, choices }
}

export function switchHeroTree(build: Build, data: SpecTalentData, heroTreeId: number): Build {
  const current = data.heroTrees.find((h) => h.id === build.heroTreeId)
  const cleared = current ? resetTree(build, makeTree('hero', current.nodes, [], 0)) : build
  return { ...cleared, heroTreeId }
}

// --- Randomizer ---

export type Random = () => number

/** Deterministic PRNG (mulberry32), handy for tests and reproducible builds. */
export function seededRandom(seed: number): Random {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(items: T[], random: Random): T {
  return items[Math.floor(random() * items.length)]
}

/** Spends all the points of one tree at random, keeping the build valid at every step. */
export function randomizeTree(build: Build, tree: Tree, random: Random = Math.random): Build {
  let best = resetTree(build, tree)
  for (let attempt = 0; attempt < 20; attempt++) {
    let current = resetTree(build, tree)
    for (;;) {
      const candidates = tree.nodes.filter((n) => canAddRank(current, tree, n))
      if (candidates.length === 0) break
      const node = pick(candidates, random)
      const choice = node.type === 'CHOICE' ? Math.floor(random() * node.entries.length) : undefined
      current = addRank(current, node, choice)
    }
    if (pointsSpent(current, tree) >= tree.budget) return current
    if (pointsSpent(current, tree) > pointsSpent(best, tree)) best = current
  }
  return best
}

export interface RandomizeOptions {
  /** Keep this hero tree instead of picking one at random. */
  heroTreeId?: number | null
  random?: Random
}

/** A complete random build: random hero tree, then every tree filled at random. */
export function randomizeBuild(data: SpecTalentData, options: RandomizeOptions = {}): Build {
  const random = options.random ?? Math.random
  const heroTreeId =
    options.heroTreeId ?? (data.heroTrees.length ? pick(data.heroTrees, random).id : null)
  let build = emptyBuild(heroTreeId)
  for (const tree of getTrees(data, heroTreeId)) build = randomizeTree(build, tree, random)
  return build
}
