/**
 * Defaults for a run of cabinets along one wall (docs/RULES.md, section R).
 * Data only.
 */
import type { ApplianceType, Measurement, RunDesign } from '../types';
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
