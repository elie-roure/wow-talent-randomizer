import { normalizeSpecTree, RawNode, RawSpecTree } from '../src/services/talentTreeService';
import { APEX_MAX_RANKS } from '../src/config';

function node(id: number, row: number, col: number, extra: Partial<RawNode> = {}): RawNode {
  return {
    id,
    node_type: { type: 'PASSIVE' },
    ranks: [{ rank: 1, tooltip: { talent: { id: id * 10, name: `T${id}` } } }],
    display_row: row,
    display_col: col,
    raw_position_x: col * 600,
    raw_position_y: row * 600,
    ...extra,
  };
}

// Elemental Shaman (262) has overrides: hero order [56, 55], granted class node 103598.
const raw: RawSpecTree = {
  restriction_lines: [
    { required_points: 8, restricted_row: 5.5, is_for_class: true },
    { required_points: 20, restricted_row: 8.5, is_for_class: false },
  ],
  class_talent_nodes: [
    node(99845, 1, 8, { node_type: { type: 'CHOICE' }, ranks: [{ rank: 1 }] }), // hero selection node
    node(103598, 2, 4, { unlocks: [2] }),
    node(2, 3, 4, { locked_by: [103598, 999] }),
  ],
  spec_talent_nodes: [
    node(10, 2, 15, { unlocks: [11] }),
    node(11, 3, 15, { locked_by: [10] }),
    node(110402, 12, 17), // apex
    node(5501, 2, 10), // hero node also listed in the spec tree
  ],
  hero_talent_trees: [
    {
      id: 55,
      name: 'Stormbringer',
      playable_specializations: [{ id: 262 }, { id: 263 }],
      hero_talent_nodes: [node(5501, 1, 21, { unlocks: [5502] }), node(5502, 2, 21, { locked_by: [5501] })],
    },
    {
      id: 56,
      name: 'Farseer',
      playable_specializations: [{ id: 262 }],
      hero_talent_nodes: [node(5601, 1, 21), node(5602, 1, 21)], // same position: one is dropped
    },
    { id: 54, name: 'Totemic', playable_specializations: [{ id: 263 }], hero_talent_nodes: [node(5401, 1, 21)] },
  ],
};

describe('normalizeSpecTree', () => {
  const data = normalizeSpecTree(262, raw, { talent_nodes: [{ id: 3 }, { id: 1 }, { id: 2 }] });

  it('finds the hero selection node and hides it', () => {
    expect(data.selectionNodeId).toBe(99845);
    expect(data.classNodes.map((n) => n.id)).toEqual([103598, 2]);
  });

  it('keeps hero nodes out of the spec tree', () => {
    expect(data.specNodes.map((n) => n.id)).toEqual([10, 11, 110402]);
  });

  it('marks granted nodes and drops dangling links', () => {
    expect(data.classNodes.find((n) => n.id === 103598)?.granted).toBe(true);
    expect(data.classNodes.find((n) => n.id === 2)?.lockedBy).toEqual([103598]);
  });

  it('detects the apex talent', () => {
    const apex = data.specNodes.find((n) => n.id === 110402);
    expect(apex?.isApex).toBe(true);
    expect(apex?.maxRanks).toBe(APEX_MAX_RANKS);
  });

  it('orders hero trees like the selection node and grants their first node', () => {
    expect(data.heroTrees.map((h) => [h.id, h.selectionIndex])).toEqual([
      [56, 0],
      [55, 1],
    ]);
    expect(data.heroTrees[0].nodes.map((n) => n.id)).toEqual([5601]);
    expect(data.heroTrees[1].nodes.find((n) => n.id === 5501)?.granted).toBe(true);
  });

  it('splits gates per tree and sorts the export node order', () => {
    expect(data.gates.class).toEqual([{ row: 5.5, requiredPoints: 8 }]);
    expect(data.gates.spec).toEqual([{ row: 8.5, requiredPoints: 20 }]);
    expect(data.nodeOrder).toEqual([1, 2, 3]);
  });
});
