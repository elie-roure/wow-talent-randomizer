import { NextFunction, Request, Response, Router } from 'express';
import { APEX_MAX_RANKS, BUDGETS, config, SUPPORTED_GAME_VERSION, SUPPORTED_LOCALES } from '../config';
import { BlizzardApiError } from '../services/blizzardClient';
import { listClasses } from '../services/classService';
import { getSpecTalentData, NotFoundError } from '../services/talentTreeService';
import { ApiMeta } from '../types';

const router = Router();

function localeOf(req: Request): string {
  const locale = String(req.query.locale ?? '');
  return SUPPORTED_LOCALES.includes(locale) ? locale : config.defaultLocale;
}

router.get('/meta', (_req, res) => {
  const meta: ApiMeta = {
    supportedVersion: SUPPORTED_GAME_VERSION,
    budgets: BUDGETS,
    apexMaxRanks: APEX_MAX_RANKS,
    region: config.region,
  };
  res.json(meta);
});

router.get('/classes', async (req, res, next) => {
  try {
    res.json(await listClasses(localeOf(req)));
  } catch (err) {
    next(err);
  }
});

router.get('/specs/:specId/talents', async (req, res, next) => {
  const specId = Number(req.params.specId);
  if (!Number.isInteger(specId) || specId <= 0) {
    res.status(400).json({ error: 'invalid_spec_id' });
    return;
  }
  try {
    res.json(await getSpecTalentData(specId, localeOf(req)));
  } catch (err) {
    next(err);
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof NotFoundError || (err instanceof BlizzardApiError && err.status === 404)) {
    res.status(404).json({ error: 'not_found', message: err.message });
    return;
  }
  console.error('[api]', err);
  res.status(502).json({ error: 'blizzard_api_error', message: String(err) });
});

export default router;
