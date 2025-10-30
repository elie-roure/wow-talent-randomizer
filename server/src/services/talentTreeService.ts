import { fetchBlizzardData } from '../services/bnetService';
import { TalentTree } from '../models/talentTree';
import { TalentNode } from '../models/talentNode';

export async function getTalentTreeBySpecId(specId: string, region: string, namespace: string, locale = 'fr_FR') {
  const specialization = await fetchBlizzardData(`/data/wow/playable-specialization/${specId}`, {
    region,
    namespace,
    locale,
  });

  if (!specialization?.spec_talent_tree?.key?.href) {
    throw new Error('Talent tree URL not found in specialization data');
  }

  const match = specialization.spec_talent_tree.key.href.match(/talent-tree\/(\d+)(?:\/|$)/);
  const talentTreeId = match ? Number(match[1]) : null;

  if (!talentTreeId) {
    throw new Error('Talent tree ID could not be extracted');
  }

  const talentTreeData = await fetchBlizzardData(`/data/wow/talent-tree/${talentTreeId}/playable-specialization/${specId}`, {
    region,
    namespace,
    locale,
  });


  const restrictionsLineClass = talentTreeData.restriction_lines.filter(line => line.is_for_class).sort((a, b) => a.restricted_row - b.restricted_row).map((line: any) => ({
    restricted_row: line.restricted_row,
    required_points: line.required_points,
  }));

  const restrictionsLineSpec = talentTreeData.restriction_lines.filter(line => !line.is_for_class).sort((a, b) => a.restricted_row - b.restricted_row).map((line: any) => ({
    restricted_row: line.restricted_row,
    required_points: line.required_points,
  }));

  const talentNodesClass = talentTreeData.class_talent_nodes
  .filter((node: any) => node.locked_by || node.unlocks)
  .map((node: any) => new TalentNode(node));

  const talentNodesSpec = talentTreeData.spec_talent_nodes
  .filter((node: any) => node.locked_by || node.unlocks)
  .map((node: any) => new TalentNode(node));

  //return talentNodesClass;
  return new TalentTree(talentTreeData, restrictionsLineClass, restrictionsLineSpec, talentNodesClass, talentNodesSpec);
}
