/**
 * The cabinet library (docs/RULES.md, section K). Data, plus the rule that
 * proposes a layout for a cabinet of a given width.
 */
import type { Bay, CabinetType, Overrides, StackItem, VanityOptions } from '../types';
import { proposedVanityLayout } from './vanity';
import { appDefault, defaultChoice } from './values';

export interface CabinetKind {
  readonly type: CabinetType;
  readonly name: string;
  /** One line under the picture on the "start something new" screen. */
  readonly blurb: string;
  /** K1: the sizes a new one starts with, as text she can change. */
  readonly start: { readonly width: string; readonly depth: string; readonly height: string };
  /** Sits on the 2x4 platform (K2). A wall cabinet does not. */
  readonly hasPlatform: boolean;
  /** Needs openings for pipes (step A8). */
  readonly hasPlumbing: boolean;
  /** Only made as part of a kitchen with a corner (section N), never on its own. */
  readonly onlyAtACorner?: boolean;
  /** Defaults that differ from the vanity's. */
  readonly options: Overrides<VanityOptions>;
}

const kitchenTop: Overrides<VanityOptions> = {
  countertop: { description: 'Kitchen countertop, installed by others', thickness: appDefault('1 1/2', 'A standard kitchen countertop. Only used to estimate the finished height.') },
};

export const cabinetKinds: readonly CabinetKind[] = [
  { type: 'vanity', name: 'Bathroom vanity', blurb: 'Drawers, two doors, drawers.', start: { width: '60', depth: '21', height: '30' }, hasPlatform: true, hasPlumbing: true, options: {} },
  { type: 'base', name: 'Base cabinet', blurb: 'A drawer over a door, with a shelf.', start: { width: '18', depth: '24', height: '31' }, hasPlatform: true, hasPlumbing: false, options: kitchenTop },
  { type: 'drawerBase', name: 'Drawer base', blurb: 'A stack of three drawers.', start: { width: '18', depth: '24', height: '31' }, hasPlatform: true, hasPlumbing: false, options: kitchenTop },
  { type: 'sinkBase', name: 'Sink base', blurb: 'Doors, with room for the sink.', start: { width: '36', depth: '24', height: '31' }, hasPlatform: true, hasPlumbing: true, options: kitchenTop },
  { type: 'cornerBase', name: 'Corner base cabinet', blurb: 'Runs into the corner. A door, with a shelf.', start: { width: '18', depth: '24', height: '31' }, hasPlatform: true, hasPlumbing: false, onlyAtACorner: true, options: kitchenTop },
  { type: 'upper', name: 'Upper cabinet', blurb: 'Hangs on the wall. Doors and shelves.', start: { width: '30', depth: '12', height: '30' }, hasPlatform: false, hasPlumbing: false, options: {} },
];

export const cabinetKind = (type: CabinetType | undefined): CabinetKind => cabinetKinds.find((k) => k.type === (type ?? 'vanity'))!;

const drawer = (id: string, small: boolean): StackItem => ({
  id,
  kind: 'drawer',
  style: small ? defaultChoice('slab', 'Too short for a framed front.') : defaultChoice('shaker', 'Matches the doors.'),
  height: small ? { by: 'frontBoard' } : { by: 'fill' },
});

const door = (id: string, hinge: 'left' | 'right'): StackItem => ({
  id,
  kind: 'door',
  style: defaultChoice('shaker', 'Framed door with a flat centre panel.'),
  height: { by: 'fill' },
  hingeSide: defaultChoice(hinge, 'Neighbouring doors open away from each other.'),
});

const fixedPanel = (id: string): StackItem => ({
  id,
  kind: 'falseFront',
  style: defaultChoice('slab', 'A flat board, the same size as a drawer front.'),
  height: { by: 'frontBoard' },
});

/**
 * K4: how many door-wide spaces a cabinet needs so that no opening is wider
 * than the widest door allowed. Whole-number maths on ticks.
 */
export function doorSpaces(width: number, stile: number, maxDoor: number): number {
  let spaces = 1;
  while (width - (spaces + 1) * stile > spaces * maxDoor && spaces < 8) spaces += 1;
  return spaces;
}

/** L0 and K3-K7: the layout the app proposes for a cabinet of this kind and width. */
export function proposeLayout(type: CabinetType, width: number, stile: number, maxDoor: number, blindSide?: 'left' | 'right'): readonly Bay[] {
  if (type === 'vanity') return proposedVanityLayout;
  if (type === 'drawerBase') {
    return [{ kind: 'stack', id: 'bay-1', width: { by: 'fill' }, items: [drawer('bay-1-drawer-1', true), drawer('bay-1-drawer-2', false), drawer('bay-1-drawer-3', false)] }];
  }
  const spaces = doorSpaces(width, stile, maxDoor);
  return Array.from({ length: spaces }, (_, i): Bay => {
    const id = `bay-${i + 1}`;
    // Doors open away from each other; a single door is hinged on the left.
    // N3: beside a corner, a single door is hinged on the side away from the corner, so she can reach in.
    const hinge = spaces === 1 && blindSide === 'left' ? 'right' : i % 2 === 0 ? 'left' : 'right';
    const top = type === 'base' ? [drawer(`${id}-drawer-1`, true)] : type === 'sinkBase' ? [fixedPanel(`${id}-panel`)] : [];
    return { kind: 'stack', id, width: { by: 'fill' }, items: [...top, door(`${id}-door`, hinge)] };
  });
}
