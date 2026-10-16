import { describe, expect, it } from 'vitest'
import specsJson from './__fixtures__/specs.json'
import stringsJson from './__fixtures__/exportStrings.json'
import { decodeBuild, decodeHeader, encodeBuild, InvalidExportStringError } from './exportString'
import {
  addRank,
  canAddRank,
  canRemoveRank,
  emptyBuild,
  getTrees,
  isTreeValid,
  pointsSpent,
  randomizeBuild,
  seededRandom,
  type Build,
} from './talents'
import type { SpecTalentData } from './types'

const specs = specsJson as unknown as Record<string, SpecTalentData>
const strings = stringsJson as Record<string, string[]>
const ELEMENTAL = specs['262']

function expectValid(data: SpecTalentData, build: Build) {
  for (const tree of getTrees(data, build.heroTreeId)) {
    expect(isTreeValid(build, tree), `${data.specName} ${tree.kind} tree`).toBe(true)
  }
}

describe('export strings', () => {
  it('re-encodes in-game Elemental strings exactly', () => {
    for (const text of strings['262']) {
      expect(encodeBuild(ELEMENTAL, decodeBuild(ELEMENTAL, text))).toBe(text)
    }
  })

  it.each(Object.keys(strings))('decodes real builds of spec %s into valid, complete builds', (specId) => {
    const data = specs[specId]
    for (const text of strings[specId]) {
      const build = decodeBuild(data, text)
      expect(build.heroTreeId).not.toBeNull()
      expectValid(data, build)
      const [cls, spec, hero] = getTrees(data, build.heroTreeId)
      expect(pointsSpent(build, cls)).toBe(data.budgets.class)
      expect(pointsSpent(build, spec)).toBeLessThanOrEqual(data.budgets.spec)
      expect(pointsSpent(build, hero)).toBe(data.budgets.hero)
      // Our own encoding round-trips.
      expect(decodeBuild(data, encodeBuild(data, build))).toEqual(build)
    }
  })

  it('writes the version and spec id in the header', () => {
    const text = encodeBuild(ELEMENTAL, emptyBuild())
    expect(decodeHeader(text)).toEqual({ version: 2, specId: 262 })
  })

  it('rejects strings of another specialization', () => {
    const holy = specs['65']
    expect(() => decodeBuild(holy, strings['262'][0])).toThrow(InvalidExportStringError)
  })

  it('rejects garbage', () => {
    expect(() => decodeBuild(ELEMENTAL, 'C$$$')).toThrow(InvalidExportStringError)
    expect(() => decodeBuild(ELEMENTAL, 'CYQ')).toThrow(InvalidExportStringError)
  })
})

describe('tree rules', () => {
  const [classTree] = getTrees(ELEMENTAL, null)
  const roots = classTree.nodes.filter((n) => n.lockedBy.length === 0 && !n.granted)
  const child = classTree.nodes.find((n) => n.lockedBy.length > 0 && n.row === roots[0].row + 1)!

  it('only allows roots on an empty tree', () => {
    const build = emptyBuild()
    expect(roots.every((n) => canAddRank(build, classTree, n))).toBe(true)
    expect(canAddRank(build, classTree, child)).toBe(false)
  })

  it('unlocks children of granted nodes', () => {
    const granted = classTree.nodes.find((n) => n.granted)!
    const grantedChild = classTree.byId.get(granted.unlocks[0])!
    expect(canAddRank(emptyBuild(), classTree, grantedChild)).toBe(true)
  })

  it('refuses to remove a node other talents depend on', () => {
    const parent = classTree.byId.get(child.lockedBy[0])!
    let build = emptyBuild()
    while ((build.ranks[parent.id] ?? 0) < parent.maxRanks) build = addRank(build, parent)
    build = addRank(build, child)
    const otherParents = child.lockedBy.filter((id) => id !== parent.id)
    if (otherParents.length === 0) expect(canRemoveRank(build, classTree, parent)).toBe(false)
    expect(canRemoveRank(build, classTree, child)).toBe(true)
  })

  it('enforces gates', () => {
    const gate = classTree.gates[0]
    const gated = classTree.nodes.find((n) => n.row > gate.row)!
    // Fill the parent chain without reaching the gate: the node stays locked.
    expect(canAddRank(emptyBuild(), classTree, gated)).toBe(false)
  })
})

describe('randomizer', () => {
  it.each(Object.keys(specs))('always produces valid, complete builds for spec %s', (specId) => {
    const data = specs[specId]
    const random = seededRandom(Number(specId))
    for (let i = 0; i < 100; i++) {
      const build = randomizeBuild(data, { random })
      expectValid(data, build)
      for (const tree of getTrees(data, build.heroTreeId)) {
        expect(pointsSpent(build, tree)).toBe(tree.budget)
      }
      expect(decodeBuild(data, encodeBuild(data, build))).toEqual(build)
    }
  })

  it('keeps the requested hero tree', () => {
    const heroTreeId = ELEMENTAL.heroTrees[1].id
    expect(randomizeBuild(ELEMENTAL, { heroTreeId, random: seededRandom(1) }).heroTreeId).toBe(heroTreeId)
  })

  it('is reproducible with a seed', () => {
    const a = randomizeBuild(ELEMENTAL, { random: seededRandom(42) })
    const b = randomizeBuild(ELEMENTAL, { random: seededRandom(42) })
    expect(a).toEqual(b)
  })
})
