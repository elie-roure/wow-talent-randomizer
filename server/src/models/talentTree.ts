import { PlayableClass } from "./playableClass";
import { Specialization } from "./specialization";

export class TalentTree {
  id: number;
  restrictionsLineClass: Array<{ restricted_row: number; required_points: number }>;
  restrictionsLineSpec: Array<{ restricted_row: number; required_points: number }>;
  talentNodesClass: Array<any>;
  talentNodesSpec: Array<any>;


  constructor(data: any, restrictionsLineClass: Array<{ restricted_row: number; required_points: number }>, 
    restrictionsLineSpec: Array<{ restricted_row: number; required_points: number }>,
    talentNodesClass: Array<any>,
    talentNodesSpec: Array<any>
  ) {
    this.id = data.id;
    this.restrictionsLineClass = restrictionsLineClass;
    this.restrictionsLineSpec = restrictionsLineSpec;
    this.talentNodesClass = talentNodesClass;
    this.talentNodesSpec = talentNodesSpec;
  }
}