import { Router, Request, Response } from 'express';
import { fetchBlizzardData } from '../services/bnetService';

const router = Router();

// Proxy route to fetch WoW talent tree index from Blizzard API using client_credentials token
// Exposed under /data/wow/playable-class/index
router.get('/wow/playable-class/index', async (_req: Request, res: Response) => {
  try {
    const region = process.env.BNET_REGION || 'eu';
    const namespace = `static-${region}`;
    let result = [];

    // Fetch playable class index
    const dataClass = await fetchBlizzardData('/data/wow/playable-class/index', { region, namespace, locale: 'fr_FR' });

    if (dataClass && Array.isArray(dataClass['classes'])) {
      for (const playableClass of dataClass['classes']) {

        // Enrich each playable class with its media asset
        const dataMedia = await fetchBlizzardData(`/data/wow/media/playable-class/${playableClass.id}`, { region, namespace, locale: 'fr_FR' });
        playableClass.media = dataMedia['assets'][0]['value'];

        // Fetch specialization 
        let specializations = [];
        const dataSpecialization = await fetchBlizzardData(`/data/wow/playable-class/${playableClass.id}`, { region, namespace, locale: 'fr_FR' });

        // Fetch each specialization's media asset
        if (dataSpecialization && Array.isArray(dataSpecialization['specializations'])) {
          for (const specialization of dataSpecialization['specializations']) {
            const dataSpecMedia = await fetchBlizzardData(`/data/wow/media/playable-specialization/${specialization.id}`, { region, namespace, locale: 'fr_FR' });
            specialization.media = dataSpecMedia['assets'][0]['value'];
            specializations.push(specialization);
          }
          playableClass.specializations = specializations;
          result.push(playableClass);
        }
      }
    }
    res.json(result);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch playable-class index:', err);
    res.status(500).json({ error: 'failed_fetching_playable_class', message: String(err) });
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
