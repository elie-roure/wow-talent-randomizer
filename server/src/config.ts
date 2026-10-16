import path from 'path';

export const config = {
  port: Number(process.env.PORT) || 3000,
  region: process.env.BNET_REGION || 'eu',
  defaultLocale: process.env.BNET_LOCALE || 'fr_FR',
  clientId: process.env.BNET_CLIENT_ID || '',
  clientSecret: process.env.BNET_CLIENT_SECRET || '',
  // Static game data only changes with patches: cache it on disk for a week by default.
  cacheDir: process.env.CACHE_DIR || path.join(__dirname, '..', 'cache'),
  cacheTtlMs: (Number(process.env.CACHE_TTL_HOURS) || 24 * 7) * 3600 * 1000,
  // Built client served in production (see Dockerfile).
  publicDir: process.env.PUBLIC_DIR || path.join(__dirname, '..', 'public'),
};

export const SUPPORTED_LOCALES = [
  'fr_FR',
  'en_US',
  'en_GB',
  'de_DE',
  'es_ES',
  'it_IT',
  'pt_BR',
  'ru_RU',
  'ko_KR',
  'zh_TW',
];

/**
 * Game version the talent rules were calibrated for: budgets, apex ranks and
 * SPEC_OVERRIDES (data/specOverrides.ts). Update all of them together for a new patch.
 */
export const SUPPORTED_GAME_VERSION = {
  expansion: 'Midnight',
  patch: '12.1.5',
  maxLevel: 90,
};

// Talent points available at max level (Midnight, level 90).
export const BUDGETS = { class: 34, spec: 34, hero: 13 };

// Apex talents (Midnight) are tiered nodes: 1 keystone + 2 ranks + 1 capstone.
// The Blizzard API only describes their first rank, so the real cost is set here.
export const APEX_MAX_RANKS = 4;
