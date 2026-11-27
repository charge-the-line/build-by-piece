/**
 * Defaults for a run of cabinets along one wall (docs/RULES.md, section R).
 * Data only.
 */
import type { ApplianceType, Measurement, RunDesign, RunItem } from '../types';
import type { EndCondition, RunItem as Item } from '../types';
import { appDefault, checkAtCutting, userChoice, userEntered } from './values';

export interface ApplianceKind {
  readonly type: ApplianceType;
  readonly name: string;
  /** R2: the space it starts with. The real appliance decides, so she is asked to check it. */
  readonly width: Measurement;
}

export const applianceKinds: readonly ApplianceKind[] = [
  { type: 'range', name: 'Space for a range', width: checkAtCutting('30', 'A common range width. Measure yours.') },
  { type: 'dishwasher', name: 'Space for a dishwasher', width: checkAtCutting('24', 'A common dishwasher width. Measure yours.') },
  { type: 'fridge', name: 'Space for a fridge', width: checkAtCutting('36', 'A common fridge width. Measure yours.') },
];

export const applianceKind = (type: ApplianceType): ApplianceKind => applianceKinds.find((k) => k.type === type)!;

/** W3: the row of upper cabinets starts at these, and she can change each. */
export const upperRow = {
  depth: appDefault('12', 'A standard upper cabinet depth.'),
  height: appDefault('30', 'The most common upper cabinet height.'),
  aboveCounter: appDefault('18', 'The standard gap between a countertop and the upper cabinets.'),
  ceiling: appDefault('96', 'A standard 8 ft ceiling. Only used to check the upper cabinets fit.'),
} as const;

/** W1: what the app puts above each thing in the bottom row, unless she changes it. */
export const proposedAbove = {
  base: { choice: 'upper', reason: 'Doors line up top and bottom.' },
  cornerBase: { choice: 'upper', reason: 'The upper cabinets turn the corner too.' },
  drawerBase: { choice: 'upper', reason: 'Doors line up top and bottom.' },
  sinkBase: { choice: 'none', reason: 'Most sinks sit under a window, so nothing goes above.' },
  dishwasher: { choice: 'upper', reason: 'The dishwasher is under the counter.' },
  range: { choice: 'none', reason: 'Room for a hood.' },
  fridge: { choice: 'none', reason: 'The fridge fills the height.' },
} as const;

/** W1: what is above one thing in the bottom row: her change if she made one, otherwise the app's proposal. */
export function aboveFor(item: RunItem, uppers: RunDesign['uppers']): { choice: 'upper' | 'none'; proposed: boolean; reason: string } {
  const proposal = proposedAbove[item.kind === 'cabinet' ? item.cabinet : item.appliance];
  const changed = uppers?.above?.[item.id];
  return { choice: changed ?? proposal.choice, proposed: changed === undefined || changed === proposal.choice, reason: proposal.reason };
}

/** R8: a cabinet outside these widths is refused. */
export const runLimits = {
  narrowest: appDefault('9', 'Narrower than this is not worth building as a cabinet.'),
  widest: appDefault('48', 'Wider than this sags and is hard to lift.'),
} as const;

/**
 * The made-up test wall: 120" long, a wall at the left and open at the
 * right, holding a drawer base, a sink base, a dishwasher space and a base
 * cabinet. Also what a new run starts as.
 */
export const startingRun: RunDesign = {
  projectType: 'run',
  id: 'run-01',
  name: 'Kitchen run',
  length: userEntered('120'),
  depth: userEntered('24'),
  height: userEntered('31'),
  items: [
    { id: 'item-1', kind: 'cabinet', cabinet: 'drawerBase' },
    { id: 'item-2', kind: 'cabinet', cabinet: 'sinkBase' },
    { id: 'item-3', kind: 'appliance', appliance: 'dishwasher' },
    { id: 'item-4', kind: 'cabinet', cabinet: 'base' },
  ],
  overrides: { ends: { left: userChoice('wall'), right: userChoice('exposed') } },
};

/** Section N: what the app decides about a corner. */
export const cornerDefaults = {
  /** N3: the corner cabinet starts this wide; part of it is hidden. */
  cabinetWidth: appDefault('45', 'Wide enough for the hidden part and one door.'),
  /** N4: the gap strip is this board, at the width it is sold, so nothing is cut lengthwise (M5). */
  stripMaterial: 'oak-1x4',
  /** The far end of the second wall, until she says otherwise. */
  end: 'exposed' as EndCondition,
} as const;

/** The item id the app uses for the corner cabinet it adds (N3). */
export const CORNER_ITEM = 'corner';

/**
 * A made-up kitchen with a corner, shaped like Ashley's: a sink wall with a
 * dishwasher, and a range wall on the right. The sizes are not hers.
 */
export const startingCorner: RunDesign = {
  projectType: 'run',
  id: 'corner-01',
  name: 'Kitchen with a corner',
  length: userEntered('150'),
  depth: userEntered('24'),
  height: userEntered('31'),
  items: [
    { id: 'item-1', kind: 'cabinet', cabinet: 'drawerBase' },
    { id: 'item-2', kind: 'cabinet', cabinet: 'sinkBase' },
    { id: 'item-3', kind: 'appliance', appliance: 'dishwasher' },
    { id: 'item-4', kind: 'cabinet', cabinet: 'base' },
  ] satisfies Item[],
  corner: {
    side: 'right',
    length: userEntered('126'),
    items: [
      { id: 'item-1', kind: 'cabinet', cabinet: 'base' },
      { id: 'item-2', kind: 'appliance', appliance: 'range' },
      { id: 'item-3', kind: 'cabinet', cabinet: 'base' },
    ],
  },
  overrides: { ends: { left: userChoice('exposed'), right: userChoice('exposed') } },
};
