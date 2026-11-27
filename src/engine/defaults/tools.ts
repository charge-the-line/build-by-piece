/**
 * The tool list (docs/RULES.md, rule T1). Data only.
 *
 * The default ticks are the first user's own tools (her list of 27 Nov:
 * mitre saw, circular saw, jigsaw, pocket-hole jig, drills; a router is
 * being bought), so her plan needs no answers from her. Anyone else unticks what they lack on the Choices screen.
 */
import type { Choice, ToolId } from '../types';
import { defaultChoice } from './values';

export interface ToolInfo {
  readonly id: ToolId;
  readonly name: string;
  /** What ticking it changes, in plain words. */
  readonly changes: string;
  readonly tickedByDefault: boolean;
}

export const toolList: readonly ToolInfo[] = [
  { id: 'circularSaw', name: 'Circular saw with a straight edge', changes: 'Cuts the plywood.', tickedByDefault: true },
  { id: 'trackSaw', name: 'Track saw', changes: 'Lets the app make long cuts first on plywood when that saves a sheet.', tickedByDefault: false },
  { id: 'tableSaw', name: 'Table saw', changes: 'Lets you change board widths without a warning, and can cut panel grooves.', tickedByDefault: false },
  { id: 'mitreSaw', name: 'Mitre saw', changes: 'Cuts boards to length. Without one, the circular saw and a square do it.', tickedByDefault: true },
  { id: 'jigsaw', name: 'Jigsaw', changes: 'Cuts the opening for the pipes when there is no hole saw.', tickedByDefault: true },
  { id: 'holeSaw', name: 'Hole saw', changes: 'Cuts a neat round hole for each pipe.', tickedByDefault: false },
  { id: 'router', name: 'Router', changes: 'Cuts the recess that holds the panel in framed doors and drawer fronts.', tickedByDefault: true },
  { id: 'pocketHoleJig', name: 'Pocket-hole jig', changes: 'Every joint in the plan uses it.', tickedByDefault: true },
  { id: 'drill', name: 'Drill and driver', changes: 'Needed for every plan.', tickedByDefault: true },
  { id: 'bradNailer', name: 'Brad nailer', changes: 'Fixes thin panels. Without one, a hammer and small nails do it.', tickedByDefault: false },
  { id: 'sander', name: 'Sander', changes: 'Smooths faces and edges. Without one, a sanding block does it.', tickedByDefault: false },
  { id: 'clamps', name: 'Clamps', changes: 'Needed for every plan.', tickedByDefault: false },
  { id: 'measuring', name: 'Tape measure, square and level', changes: 'Needed for every plan.', tickedByDefault: true },
];

export const toolName = (id: ToolId): string => toolList.find((t) => t.id === id)!.name;

export const defaultTools = Object.fromEntries(
  toolList.map((tool) => [tool.id, defaultChoice(tool.tickedByDefault, tool.changes)]),
) as Record<ToolId, Choice<boolean>>;

/** On every plan, always required (rule T2). */
export const safetyGear: readonly { readonly id: string; readonly name: string; readonly usedFor: string }[] = [
  { id: 'safetyGlasses', name: 'Safety glasses', usedFor: 'Every cut and every hole.' },
  { id: 'earProtection', name: 'Ear protection', usedFor: 'Saws, the router and the sander.' },
  { id: 'dustMask', name: 'Dust mask', usedFor: 'Cutting and sanding.' },
];

/** Basic hand tools that stand in when a powered one is not ticked (rule T7). */
export const handTools = {
  hammer: 'Hammer and small nails',
  sandingBlock: 'Sanding block',
} as const;
