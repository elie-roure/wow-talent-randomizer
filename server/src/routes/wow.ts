import { Router, Request, Response } from 'express';
import { fetchBlizzardData } from '../services/bnetService';
import { PlayableClass } from '../models/playableClass';
import { enrichPlayableClass } from '../services/classService';
import { getTalentTreeBySpecId } from '../services/talentTreeService';

const router = Router();

// Proxy route to fetch WoW talent tree index from Blizzard API using client_credentials token
// Exposed under /data/wow/playable-class/index
router.get('/wow/playable-class/index', async (_req: Request, res: Response) => {
  try {
    const region = process.env.BNET_REGION || 'eu';
    const namespace = `static-${region}`;

    const dataClass = await fetchBlizzardData('/data/wow/playable-class/index', {
      region,
      namespace,
      locale: 'fr_FR',
    });

    const result: PlayableClass[] = [];

    if (Array.isArray(dataClass?.classes)) {
      for (const rawClass of dataClass.classes) {
        const enrichedClass = await enrichPlayableClass(rawClass, region, namespace);
        result.push(enrichedClass);
      }
    }

    res.json(result);
  } catch (err: any) {
    console.error('Failed to fetch playable-class index:', err);
    res.status(500).json({ error: 'failed_fetching_playable_class', message: String(err) });
  }
});




router.get('/wow/talent-tree/spec/:specId', async (req: Request, res: Response) => {
  try {
    const { specId } = req.params;
    const region = process.env.BNET_REGION || 'eu';
    const namespace = `static-${region}`;

    const talentTree = await getTalentTreeBySpecId(specId, region, namespace);
    res.json(talentTree);
  } catch (err: any) {
    console.error('Failed to fetch talent tree:', err);
    res.status(500).json({ error: 'failed_fetching_talent_tree', message: String(err) });
  }
});




// Exposed under /data/wow/talent-tree/index
router.get('/wow/talent-tree/index', async (_req: Request, res: Response) => {
  try {
    const region = process.env.BNET_REGION || 'eu';
    const namespace = `static-${region}`;
    const data = await fetchBlizzardData('/data/wow/talent-tree/index', { region, namespace, locale: 'en_US' });
    res.json(data);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch talent-tree index:', err);
    res.status(500).json({ error: 'failed_fetching_talent_tree', message: String(err) });
  }
});

export default router;
