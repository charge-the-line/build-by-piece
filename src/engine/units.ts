/**
 * Exact lengths (docs/RULES.md, rules U1-U3).
 *
 * Every length is a whole number of ticks. Text typed by a person is parsed
 * here with integer arithmetic only, and ticks are turned back into
 * tape-measure text here. Nothing else in the engine converts units.
 */
import type { LengthUnit, TapeIncrement, Ticks } from './types';

export const TICKS_PER_INCH = 4064;
export const TICKS_PER_MM = 160;

/** Bottom numbers that exist on a tape measure. */
const TAPE_FRACTIONS = [2, 4, 8, 16, 32];

/** Marks a number as a length, refusing anything that is not a whole number of ticks. */
export function asTicks(value: number): Ticks {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`A length must be a whole number of ticks, got ${value}`);
  }
  return value as Ticks;
}

export type ParseResult =
  | { readonly ok: true; readonly ticks: Ticks; /** False when the entry had to be rounded to a tick. */ readonly exact: boolean }
  | { readonly ok: false; readonly reason: string };

const fail = (reason: string): ParseResult => ({ ok: false, reason });

/** Rounds a / b to the nearest whole number, halves up, using integers only. */
function divideRounded(a: number, b: number): { quotient: number; exact: boolean } {
  const floor = Math.floor(a / b);
  const remainder = a - floor * b;
  return { quotient: remainder * 2 >= b ? floor + 1 : floor, exact: remainder === 0 };
}

/** Parses what a person typed: "60 1/2", "60.5", "23/32" (inches) or "1524.5" (mm). */
export function parseLength(entered: string, unit: LengthUnit): ParseResult {
  const text = entered
    .trim()
    .replace(/(?:"|”|″|\s*in\.?|\s*mm)$/i, '')
    .trim();
  if (text === '') return fail('Enter a number.');

  const perUnit = unit === 'in' ? TICKS_PER_INCH : TICKS_PER_MM;

  const fraction = /^(?:(\d{1,5})[\s-]+)?(\d{1,3})\s*\/\s*(\d{1,3})$/.exec(text);
  if (fraction) {
    if (unit !== 'in') return fail('Type millimetres as a plain number, such as 1524 or 1524.5.');
    const whole = Number(fraction[1] ?? '0');
    const top = Number(fraction[2]);
    const bottom = Number(fraction[3]);
    if (!TAPE_FRACTIONS.includes(bottom)) {
      return fail(
        `A tape measure is marked in halves, quarters, eighths, sixteenths and thirty-seconds. ${top}/${bottom} is not on it.`,
      );
    }
    if (top >= bottom) return fail(`In ${top}/${bottom} the top number must be smaller than the bottom number.`);
    const ticks = whole * TICKS_PER_INCH + top * (TICKS_PER_INCH / bottom);
    if (ticks === 0) return fail('The length must be more than zero.');
    return { ok: true, ticks: asTicks(ticks), exact: true };
  }

  const decimal = /^(\d{1,5})(?:\.(\d{1,6}))?$/.exec(text);
  if (!decimal) {
    return fail(
      unit === 'in'
        ? 'Type inches like 60, 60 1/2 or 60.5.'
        : 'Type millimetres as a plain number, such as 1524 or 1524.5.',
    );
  }
  const digits = decimal[2] ?? '';
  const scaled = Number(`${decimal[1]}${digits}`);
  const { quotient, exact } = divideRounded(scaled * perUnit, 10 ** digits.length);
  if (quotient === 0) return fail('The length must be more than zero.');
  return { ok: true, ticks: asTicks(quotient), exact };
}

/** How many ticks one mark of the chosen tape is. */
export function incrementTicks(increment: TapeIncrement): Ticks {
  switch (increment) {
    case '1/16in':
      return asTicks(TICKS_PER_INCH / 16);
    case '1/32in':
      return asTicks(TICKS_PER_INCH / 32);
    case '1mm':
      return asTicks(TICKS_PER_MM);
  }
}

const withCommas = (n: number) => n.toLocaleString('en-US');

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

export interface FormattedLength {
  /** Tape-measure text such as 79 1/2" or 1,524 mm. */
  readonly text: string;
  /** True when the exact length is between two marks and was rounded for printing. */
  readonly rounded: boolean;
}

/** Turns ticks into text that exists on a tape measure (rule U3). */
export function formatLength(ticks: Ticks, increment: TapeIncrement = '1/16in'): FormattedLength {
  const sign = ticks < 0 ? '-' : '';
  const step = incrementTicks(increment);
  const { quotient: marks, exact } = divideRounded(Math.abs(ticks), step);

  if (increment === '1mm') {
    return { text: `${sign}${withCommas(marks)} mm`, rounded: !exact };
  }

  const perInch = TICKS_PER_INCH / step;
  const whole = Math.floor(marks / perInch);
  const top = marks % perInch;
  if (top === 0) return { text: `${sign}${withCommas(whole)}"`, rounded: !exact };
  const divisor = greatestCommonDivisor(top, perInch);
  const fraction = `${top / divisor}/${perInch / divisor}`;
  return { text: `${sign}${whole === 0 ? '' : `${withCommas(whole)} `}${fraction}"`, rounded: !exact };
}
