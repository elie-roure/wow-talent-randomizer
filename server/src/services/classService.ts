import { getGameData } from './blizzardClient';
import { getIcon } from './mediaService';
import { ClassSummary, SpecSummary } from '../types';

type Ref = { id: number; name: string };
type ClassIndex = { classes: Ref[] };
type ClassDocument = { id: number; name: string; specializations?: Ref[] };
type SpecDocument = { id: number; name: string; role?: { type: string } };

async function getSpecSummary(ref: Ref, locale: string): Promise<SpecSummary> {
  const [spec, icon] = await Promise.all([
    getGameData<SpecDocument>(`/data/wow/playable-specialization/${ref.id}`, locale),
    getIcon(`/data/wow/media/playable-specialization/${ref.id}`),
  ]);
  return { id: spec.id, name: spec.name, icon, role: spec.role?.type ?? 'DAMAGE' };
}

async function getClassSummary(ref: Ref, locale: string): Promise<ClassSummary> {
  const [cls, icon] = await Promise.all([
    getGameData<ClassDocument>(`/data/wow/playable-class/${ref.id}`, locale),
    getIcon(`/data/wow/media/playable-class/${ref.id}`),
  ]);
  const specs = await Promise.all((cls.specializations ?? []).map((s) => getSpecSummary(s, locale)));
  return { id: cls.id, name: cls.name, icon, specs: specs.sort((a, b) => a.id - b.id) };
}

export async function listClasses(locale: string): Promise<ClassSummary[]> {
  const index = await getGameData<ClassIndex>('/data/wow/playable-class/index', locale);
  const classes = await Promise.all(index.classes.map((c) => getClassSummary(c, locale)));
  return classes.sort((a, b) => a.name.localeCompare(b.name, locale.replace('_', '-')));
}
