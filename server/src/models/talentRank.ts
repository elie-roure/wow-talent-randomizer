import { PlayableClass } from "./playableClass";
import { Specialization } from "./specialization";

export class TalentRank {
  rank: number;
  talents : Array<{ talentId: number; talentName: string }>;


  constructor(rank: number, talents:  Array<{ talentId: number; talentName: string }>) {
    this.rank = rank;
    this.talents = talents ?? [];
  }
}