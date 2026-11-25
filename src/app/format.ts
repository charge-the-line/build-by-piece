import { colorRoles } from '../engine/colorRoles';
import { defaultCatalog } from '../engine/defaults/catalog';
import type { ColorRole, Ticks } from '../engine/types';
import { formatLength } from '../engine/units';

/** Tape-measure text for an exact length. The app never formats a length any other way. */
export const fmt = (ticks: Ticks): string => formatLength(ticks).text;

export const colorOf = (role: ColorRole) => colorRoles.find((c) => c.role === role)!;

export const materialName = (id: string): string => defaultCatalog.stock.find((s) => s.id === id)?.name ?? id;

/** Plain words for the choices the engine reports. */
const CHOICE_WORDS: Readonly<Record<string, string>> = {
  wall: 'against a wall',
  exposed: 'open to view',
  slab: 'flat front',
  shaker: 'framed front',
};

export const choiceWords = (value: string | number | boolean): string => CHOICE_WORDS[String(value)] ?? String(value);
