/**
 * What has been bought, cut and built, as ticks saved with the project.
 * Each tick has a key; these are the keys a plan can have.
 */
import type { CutDiagram, CutStep, MaterialLine, PlanResult, Step } from '../engine/types';

export const doneKey = (step: Step) => `${step.id}:done`;
export const cutKey = (diagram: CutDiagram, step: CutStep) => `cut:${diagram.id}:${step.number}`;
export const boughtMaterialKey = (line: MaterialLine) => `buy:wood:${line.materialId}:${line.stockLength ?? 'sheet'}`;
export const boughtKey = (kind: 'hardware' | 'supply' | 'tool', id: string) => `buy:${kind}:${id}`;

export interface Tally {
  readonly done: number;
  readonly total: number;
}

const tally = (keys: readonly string[], checked: Readonly<Record<string, boolean>>): Tally => ({ done: keys.filter((k) => checked[k]).length, total: keys.length });

export function progressOf(plan: PlanResult, checked: Readonly<Record<string, boolean>>): { bought: Tally; cut: Tally; built: Tally } {
  const buyKeys = [
    ...plan.materials.map(boughtMaterialKey),
    ...plan.hardware.map((h) => boughtKey('hardware', h.hardwareId)),
    ...plan.supplies.map((s) => boughtKey('supply', s.id)),
    ...plan.tools.filter((t) => t.status === 'buyOrBorrow' || t.kind === 'bit').map((t) => boughtKey('tool', t.id)),
  ];
  // A piece counts as cut when its own step is ticked; section and strip cuts lead up to it.
  const cutKeys = plan.cutDiagrams.flatMap((d) => d.steps.filter((s) => s.kind === 'piece').map((s) => cutKey(d, s)));
  return { bought: tally(buyKeys, checked), cut: tally(cutKeys, checked), built: tally(plan.steps.map(doneKey), checked) };
}
