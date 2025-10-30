import { fetchBlizzardData } from '../services/bnetService';
import { Specialization } from '../models/specialization';
import { PlayableClass } from '../models/playableClass';

export async function enrichSpecialization(spec: any, region: string, namespace: string): Promise<Specialization> {
  const media = await fetchBlizzardData(`/data/wow/media/playable-specialization/${spec.id}`, {
    region,
    namespace,
    locale: 'fr_FR',
  });
  return new Specialization(spec, media.assets[0].value);
}

export async function enrichPlayableClass(rawClass: any, region: string, namespace: string): Promise<PlayableClass> {
  const media = await fetchBlizzardData(`/data/wow/media/playable-class/${rawClass.id}`, {
    region,
    namespace,
    locale: 'fr_FR',
  });

  const specData = await fetchBlizzardData(`/data/wow/playable-class/${rawClass.id}`, {
    region,
    namespace,
    locale: 'fr_FR',
  });

  const specializations: Specialization[] = [];
  if (specData?.specializations) {
    for (const spec of specData.specializations) {
      const enrichedSpec = await enrichSpecialization(spec, region, namespace);
      specializations.push(enrichedSpec);
    }
  }

  return new PlayableClass(rawClass, media.assets[0].value, specializations);
}

