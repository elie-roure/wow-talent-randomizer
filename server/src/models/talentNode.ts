export class TalentNode {
  id: number;
  lockedBy: number[]; 
  unlocks: number[];
  displayRow: number;
  displayCol: number;
  ranks: any[];

  constructor(data: any) {
    this.id = data.id;
    this.lockedBy = data.locked_by ?? [];
    this.unlocks = data.unlocks ?? [];
    this.displayRow = data.display_row;
    this.displayCol = data.display_col;
    this.ranks = data.ranks ?? [];
  }
}
