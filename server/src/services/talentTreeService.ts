import { fetchBlizzardData } from '../services/bnetService';
import { TalentTree } from '../models/talentTree';
import { TalentNode } from '../models/talentNode';
import { TalentRank } from '../models/talentRank';

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
   .map((node: any) => {
      const ranks = node.ranks.map((rank: any) => {
        let talents: Array<{ talentId: number; talentName: string }> = [];
        if (rank.tooltip?.talent) {
          talents.push({
            talentId:  rank.tooltip.talent.id,
            talentName: rank.tooltip.talent.name,
          });

        } else if (rank.choice_of_tooltips?.length > 0 && rank.choice_of_tooltips[0]?.talent) {
          rank.choice_of_tooltips.forEach((tooltip: any) => {
            if (tooltip?.talent) {
              talents.push({
                talentId: tooltip.talent.id,
                talentName: tooltip.talent.name,
              });
            }
          });
        }

        // Si aucun talent n'a été trouvé, on ajoute une valeur par défaut
        if (talents.length === 0) {
          talents.push({
            talentId: -1,
            talentName: "Unknown",
          });
        }


        return new TalentRank(rank.rank, talents);
      });

      return new TalentNode(
        node.id,
        node.locked_by,
        node.unlocks,
        node.display_row,
        node.display_col,
        ranks,
        node.node_type.type
      );
    });

  const talentNodesSpec = talentTreeData.spec_talent_nodes
    .filter((node: any) => node.locked_by || node.unlocks)
    .map((node: any) => {
      const ranks = node.ranks.map((rank: any) => {
        let talents: Array<{ talentId: number; talentName: string }> = [];
        if (rank.tooltip?.talent) {
          talents.push({
            talentId: 0,
            talentName: rank.tooltip.talent.name,
          });

        } else if (rank.choice_of_tooltips?.length > 0 && rank.choice_of_tooltips[0]?.talent) {
          rank.choice_of_tooltips.forEach((tooltip: any) => {
            if (tooltip?.talent) {
              talents.push({
                talentId: 0,
                talentName: tooltip.talent.name,
              });
            }
          });
        }

        // Si aucun talent n'a été trouvé, on ajoute une valeur par défaut
        if (talents.length === 0) {
          talents.push({
            talentId: -1,
            talentName: "Unknown",
          });
        }


        return new TalentRank(rank.rank, talents);
      });

      return new TalentNode(
        node.id,
        node.locked_by,
        node.unlocks,
        node.display_row,
        node.display_col,
        ranks,
        node.node_type.type
      );
    });


  //return talentNodesClass;
  return new TalentTree(talentTreeData, restrictionsLineClass, restrictionsLineSpec, talentNodesClass, talentNodesSpec);
}
