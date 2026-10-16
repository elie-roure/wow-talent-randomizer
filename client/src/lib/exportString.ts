/**
 * In-game talent loadout import/export strings.
 *
 * Format documented by Blizzard in Blizzard_ClassTalentImportExport.lua:
 *   header  : serialization version (8 bits), spec id (16 bits), tree hash (128 bits, zero = skip check)
 *   per node, for every node of the class tree in ascending id order:
 *     selected (1) [ purchased (1) [ partially ranked (1) [ ranks (6) ] choice node (1) [ entry index (2) ] ] ]
 * Values are packed least-significant bit first into 6-bit characters (ExportUtil.lua).
 */
import { emptyBuild, type Build } from './talents'
import type { SpecTalentData, TalentNode } from './types'

export const SERIALIZATION_VERSION = 2

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const BITS_PER_CHAR = 6

class BitWriter {
  private chars: string[] = []
  private current = 0
  private used = 0

  write(bitWidth: number, value: number): void {
    if (value < 0 || value >= 2 ** bitWidth) throw new Error(`Value ${value} does not fit in ${bitWidth} bits`)
    for (let i = 0; i < bitWidth; i++) {
      this.current |= ((value >> i) & 1) << this.used
      if (++this.used === BITS_PER_CHAR) this.flush()
    }
  }

  private flush(): void {
    this.chars.push(ALPHABET[this.current])
    this.current = 0
    this.used = 0
  }

  toString(): string {
    if (this.used > 0) this.flush()
    return this.chars.join('')
  }
}

class BitReader {
  private values: number[]
  private position = 0

  constructor(text: string) {
    this.values = [...text].map((c) => {
      const value = ALPHABET.indexOf(c)
      if (value < 0) throw new InvalidExportStringError(`Caractère invalide : "${c}"`)
      return value
    })
  }

  get totalBits(): number {
    return this.values.length * BITS_PER_CHAR
  }

  read(bitWidth: number): number {
    if (this.position + bitWidth > this.totalBits) throw new InvalidExportStringError('Chaîne tronquée')
    let value = 0
    for (let i = 0; i < bitWidth; i++, this.position++) {
      const bit = (this.values[Math.floor(this.position / BITS_PER_CHAR)] >> this.position % BITS_PER_CHAR) & 1
      value |= bit << i
    }
    return value
  }
}

export class InvalidExportStringError extends Error {}

function nodesOf(data: SpecTalentData, heroTreeId: number | null): Map<number, TalentNode> {
  const hero = data.heroTrees.find((h) => h.id === heroTreeId)
  return new Map([...data.classNodes, ...data.specNodes, ...(hero?.nodes ?? [])].map((n) => [n.id, n]))
}

export function encodeBuild(data: SpecTalentData, build: Build): string {
  const writer = new BitWriter()
  writer.write(8, SERIALIZATION_VERSION)
  writer.write(16, data.specId)
  for (let i = 0; i < 16; i++) writer.write(8, 0)

  const hero = data.heroTrees.find((h) => h.id === build.heroTreeId)
  const nodes = nodesOf(data, build.heroTreeId)

  for (const id of data.nodeOrder) {
    if (id === data.selectionNodeId && hero) {
      writer.write(1, 1) // selected
      writer.write(1, 1) // purchased
      writer.write(1, 0) // fully ranked
      writer.write(1, 1) // choice node
      writer.write(2, hero.selectionIndex)
      continue
    }

    const node = nodes.get(id)
    const ranks = node ? (build.ranks[id] ?? 0) : 0
    if (node?.granted) {
      writer.write(1, 1) // selected
      writer.write(1, 0) // granted, not purchased
    } else if (node && ranks > 0) {
      writer.write(1, 1)
      writer.write(1, 1)
      const partial = ranks < node.maxRanks
      writer.write(1, partial ? 1 : 0)
      if (partial) writer.write(6, ranks)
      const isChoice = node.type === 'CHOICE'
      writer.write(1, isChoice ? 1 : 0)
      if (isChoice) writer.write(2, build.choices[id] ?? 0)
    } else {
      writer.write(1, 0)
    }
  }
  return writer.toString()
}

export interface DecodedHeader {
  version: number
  specId: number
}

export function decodeHeader(text: string): DecodedHeader {
  const reader = new BitReader(text.trim())
  return { version: reader.read(8), specId: reader.read(16) }
}

/** Reads an export string back into a build for this specialization. */
export function decodeBuild(data: SpecTalentData, text: string): Build {
  const reader = new BitReader(text.trim())
  const version = reader.read(8)
  const specId = reader.read(16)
  if (version !== SERIALIZATION_VERSION) {
    throw new InvalidExportStringError('Chaîne invalide ou issue d’une version du jeu non supportée')
  }
  if (specId !== data.specId) {
    throw new InvalidExportStringError(`Cette chaîne correspond à une autre spécialisation (${specId})`)
  }
  for (let i = 0; i < 16; i++) reader.read(8)

  type NodeState = { purchased: boolean; ranks: number | null; choice: number | null }
  const states = new Map<number, NodeState>()
  for (const id of data.nodeOrder) {
    if (!reader.read(1)) continue
    const purchased = reader.read(1) === 1
    let ranks: number | null = null
    let choice: number | null = null
    if (purchased) {
      if (reader.read(1)) ranks = reader.read(6)
      if (reader.read(1)) choice = reader.read(2)
    }
    states.set(id, { purchased, ranks, choice })
  }

  const selection = data.selectionNodeId !== null ? states.get(data.selectionNodeId) : undefined
  const hero = data.heroTrees.find((h) => h.selectionIndex === selection?.choice) ?? null
  const build = emptyBuild(hero?.id ?? null)

  for (const [id, node] of nodesOf(data, build.heroTreeId)) {
    const state = states.get(id)
    if (!state?.purchased || node.granted) continue
    build.ranks[id] = Math.min(state.ranks ?? node.maxRanks, node.maxRanks)
    if (node.type === 'CHOICE') build.choices[id] = Math.min(state.choice ?? 0, node.entries.length - 1)
  }
  return build
}
