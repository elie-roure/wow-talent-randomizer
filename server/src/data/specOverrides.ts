/**
 * Per-specialization facts the Blizzard API does not expose, derived by decoding
 * real in-game export strings (patch 12.1.5, see SUPPORTED_GAME_VERSION in config.ts).
 *
 * - heroOrder: hero tree ids in the order of the hero selection node entries
 *   (the export string stores the chosen hero tree as an index into this list).
 * - granted: class/spec nodes granted for free to the specialization.
 * - excluded: nodes listed by the API that belong to another specialization
 *   (spec-specific variants sharing the same position in the tree).
 */
export interface SpecOverride {
  heroOrder: number[];
  granted: number[];
  excluded?: number[];
}

export const SPEC_OVERRIDES: Record<number, SpecOverride> = {
  // Mage
  62: { heroOrder: [40, 39], granted: [62121] },
  63: { heroOrder: [41, 39], granted: [62119], excluded: [94636] },
  64: { heroOrder: [41, 40], granted: [62117], excluded: [109956] },
  // Paladin
  65: { heroOrder: [50, 49], granted: [81597, 81600, 81632], excluded: [95234, 103853] },
  66: { heroOrder: [49, 48], granted: [81597, 81600, 81632], excluded: [110257, 103853] },
  70: { heroOrder: [50, 48], granted: [81510, 81600, 81603] },
  // Warrior
  71: { heroOrder: [62, 60], granted: [90327, 92537] },
  72: { heroOrder: [61, 60], granted: [90325, 92538] },
  73: { heroOrder: [62, 61], granted: [90261, 90330] },
  // Druid
  102: { heroOrder: [24, 23], granted: [82201, 82202, 82208] },
  103: { heroOrder: [21, 22], granted: [82199, 82222, 82223], excluded: [91046, 91047] },
  104: { heroOrder: [21, 24], granted: [82218, 82220, 82223], excluded: [91046, 91047] },
  105: { heroOrder: [23, 22], granted: [82205, 82217, 104084] },
  // Death Knight
  250: { heroOrder: [33, 31], granted: [76071] },
  251: { heroOrder: [33, 32], granted: [76081] },
  252: { heroOrder: [32, 31], granted: [76072] },
  // Hunter
  253: { heroOrder: [44, 43], granted: [102422], excluded: [94987] },
  254: { heroOrder: [44, 42], granted: [102422], excluded: [109961] },
  255: { heroOrder: [43, 42], granted: [102422] },
  // Priest
  256: { heroOrder: [20, 18], granted: [82713, 82717], excluded: [94684] },
  257: { heroOrder: [20, 19], granted: [82717, 82718], excluded: [94697] },
  258: { heroOrder: [19, 18], granted: [82701, 82713], excluded: [110008, 108724] },
  // Rogue
  259: { heroOrder: [53, 52], granted: [90740] },
  260: { heroOrder: [52, 51], granted: [90684] },
  261: { heroOrder: [53, 51], granted: [90697] },
  // Shaman
  262: { heroOrder: [56, 55], granted: [103598] },
  263: { heroOrder: [55, 54], granted: [109389] },
  264: { heroOrder: [56, 54], granted: [103588] },
  // Warlock
  265: { heroOrder: [58, 57], granted: [71933] },
  266: { heroOrder: [59, 57], granted: [71933] },
  267: { heroOrder: [59, 58], granted: [71933] },
  // Monk
  268: { heroOrder: [66, 65], granted: [101142, 109827] },
  269: { heroOrder: [64, 65], granted: [101142, 101186], excluded: [101233, 101240, 110067] },
  270: { heroOrder: [64, 66], granted: [101142, 101186], excluded: [110221, 110220, 101243] },
  // Demon Hunter
  577: { heroOrder: [35, 34], granted: [90942] },
  581: { heroOrder: [35, 124], granted: [90946] },
  1480: { heroOrder: [124, 126], granted: [108723] },
  // Evoker
  1467: { heroOrder: [37, 36], granted: [93305, 93312], excluded: [98931] },
  1468: { heroOrder: [38, 37], granted: [93306, 93341] },
  1473: { heroOrder: [38, 36], granted: [93304, 93305], excluded: [94939] },
};
