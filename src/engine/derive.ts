/**
 * Values that remember where they came from.
 *
 * A Val is one number with its label, status and source. An Expr is values
 * added and subtracted (whole-number multiples only, so the result is always
 * a whole number of ticks). Turning an Expr into a Derivation records the
 * rule, the plain-English formula and every input, so each part can show how
 * its size was worked out, and a test can add the inputs back up.
 */
import type { Derivation, DerivationInput, InputOrigin, InputStatus, Ticks } from './types';
import { asTicks } from './units';

export interface Val {
  readonly label: string;
  readonly value: Ticks;
  readonly status: InputStatus;
  readonly origin: InputOrigin;
  readonly checkAt?: 'cutting';
  readonly source: string;
}

type Term = readonly [times: number, val: Val];
export type Addend = Val | Expr | readonly [times: number, value: Val | Expr];

/** A whole-number combination of values, e.g. W - 2t. */
export class Expr {
  private constructor(readonly terms: readonly Term[]) {}

  static of(...addends: readonly Addend[]): Expr {
    const merged = new Map<Val, number>();
    const add = (times: number, item: Val | Expr) => {
      if (item instanceof Expr) {
        for (const [k, v] of item.terms) add(times * k, v);
      } else {
        merged.set(item, (merged.get(item) ?? 0) + times);
      }
    };
    for (const addend of addends) {
      if (addend instanceof Expr) add(1, addend);
      else if (Array.isArray(addend)) add(addend[0] as number, addend[1] as Val | Expr);
      else add(1, addend as Val);
    }
    return new Expr([...merged].filter(([, times]) => times !== 0).map(([val, times]) => [times, val] as const));
  }

  get value(): Ticks {
    return asTicks(this.terms.reduce((total, [times, val]) => total + times * val.value, 0));
  }
}

const sum = Expr.of;
export { sum };

function toInput(val: Val, times?: number): DerivationInput {
  return {
    label: val.label,
    value: val.value,
    status: val.status,
    origin: val.origin,
    source: val.source,
    ...(val.checkAt ? { checkAt: val.checkAt } : {}),
    ...(times === undefined ? {} : { times }),
  };
}

/** A derivation whose result is exactly its inputs added up. */
export function derive(ruleId: string, formula: string, expr: Expr | Val): Derivation {
  const e = expr instanceof Expr ? expr : Expr.of(expr);
  return {
    kind: 'sum',
    ruleId,
    formula,
    inputs: e.terms.map(([times, val]) => toInput(val, times)),
    result: e.value,
  };
}

/** A derivation whose result follows a stated rule rather than a plain sum. */
export function deriveByRule(ruleId: string, formula: string, inputs: readonly Val[], result: Ticks): Derivation {
  return { kind: 'rule', ruleId, formula, inputs: inputs.map((val) => toInput(val)), result };
}

const combinedStatus = (inputs: readonly DerivationInput[]): InputStatus =>
  inputs.some((i) => i.status === 'assumed') ? 'assumed' : 'confirmed';

const combinedOrigin = (inputs: readonly DerivationInput[]): InputOrigin =>
  inputs.every((i) => i.origin === 'user') ? 'user' : 'appDefault';

/** Gives a worked-out value a name so later formulas can use it ("box width"). */
export function named(label: string, derivation: Derivation): Val {
  return {
    label,
    value: derivation.result,
    status: combinedStatus(derivation.inputs),
    origin: combinedOrigin(derivation.inputs),
    source: `rule ${derivation.ruleId}`,
    ...(derivation.inputs.some((i) => i.checkAt) ? { checkAt: 'cutting' as const } : {}),
  };
}

export const statusOf = (derivations: readonly Derivation[]): InputStatus =>
  combinedStatus(derivations.flatMap((d) => d.inputs));

export const needsCheck = (derivations: readonly Derivation[]): boolean =>
  derivations.some((d) => d.inputs.some((i) => i.checkAt !== undefined));
