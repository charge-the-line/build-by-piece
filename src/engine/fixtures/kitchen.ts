/**
 * Test fixtures: the four kitchen cabinets at standard sizes (section K).
 *
 * These are made-up test sizes, not measurements of a real kitchen. Each is
 * only a cabinet kind and three numbers; everything else comes from the
 * defaults for that kind.
 */
import { cabinetKind } from '../defaults/cabinets';
import { userEntered } from '../defaults/values';
import type { CabinetType, VanityDesign } from '../types';

/** A new cabinet of a kind, at its starting sizes or at a given width. */
export function newCabinet(type: CabinetType, id: string, width?: string): VanityDesign {
  const kind = cabinetKind(type);
  return {
    projectType: 'vanity',
    cabinet: type,
    id,
    name: kind.name,
    width: userEntered(width ?? kind.start.width),
    depth: userEntered(kind.start.depth),
    height: userEntered(kind.start.height),
    overrides: {},
  };
}

/** 18" base cabinet: one drawer over one door. */
export const base01 = newCabinet('base', 'base-01');
/** 30" base cabinet: wide enough to need two doors, each with a drawer above. */
export const base02 = newCabinet('base', 'base-02', '30');
/** 18" drawer base: three drawers. */
export const drawerBase01 = newCabinet('drawerBase', 'drawer-base-01');
/** 36" sink base: two doors under two fixed panels. */
export const sinkBase01 = newCabinet('sinkBase', 'sink-base-01');
/** 30" x 12" x 30" upper cabinet: two doors, two shelves. */
export const upper01 = newCabinet('upper', 'upper-01');
