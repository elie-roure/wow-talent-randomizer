import { config } from '../config';
import { cached } from './cache';
import { BlizzardApiError, getGameData } from './blizzardClient';

type MediaDocument = { assets?: Array<{ key: string; value: string }> };

/** Returns the icon URL of a media document, or null when Blizzard has none. */
export function getIcon(mediaPath: string): Promise<string | null> {
  return cached(`${config.region}:icon:${mediaPath}`, async () => {
    try {
      const media = await getGameData<MediaDocument>(mediaPath);
      return media.assets?.find((a) => a.key === 'icon')?.value ?? media.assets?.[0]?.value ?? null;
    } catch (err) {
      if (err instanceof BlizzardApiError && err.status === 404) return null;
      throw err;
    }
  });
}
