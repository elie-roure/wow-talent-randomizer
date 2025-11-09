import { TalentRank } from "./talentRank";

export class TalentNode {
  id: number;
  lockedBy: number[]; 
  unlocks: number[];
  displayRow: number;
  displayCol: number;
  ranks: TalentRank[];
  type : string;

  constructor(id : number,lockedBy : number[],unlocks : number[],displayRow : number,displayCol: number,ranks:TalentRank[], type : string ) {
    this.id = id;
    this.lockedBy = lockedBy ?? [];
    this.unlocks = unlocks ?? [];
    this.displayRow = displayRow;
    this.displayCol = displayCol;
    this.ranks = ranks ?? [];
    this.type = type;
  }
}
