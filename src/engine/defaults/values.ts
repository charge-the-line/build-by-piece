/**
 * Small helpers for writing values as data. No maths happens here: lengths
 * stay as text until the engine parses them (docs/RULES.md, rule U2).
 */
import type { Choice, Measurement } from '../types';

/** A value the app decided. Visible to the user and changeable (rule G1). */
export const appDefault = (entered: string, note: string): Measurement => ({
  entered,
  unit: 'in',
  status: 'assumed',
  origin: 'appDefault',
  note,
});

/** A default standing in for a real-world fact she should check before cutting (rule G3). */
export const checkAtCutting = (entered: string, note: string): Measurement => ({
  ...appDefault(entered, note),
  checkAt: 'cutting',
});

/** A published standard size, such as a 2x4 being 1 1/2" x 3 1/2". */
export const standardSize = (entered: string): Measurement => ({
  entered,
  unit: 'in',
  status: 'confirmed',
  origin: 'appDefault',
  note: 'standard size',
});

/** A value the user typed. */
export const userEntered = (entered: string, note?: string): Measurement => ({
  entered,
  unit: 'in',
  status: 'confirmed',
  origin: 'user',
  ...(note === undefined ? {} : { note }),
});

export const defaultChoice = <T>(value: T, note: string): Choice<T> => ({
  value,
  status: 'assumed',
  origin: 'appDefault',
  note,
});

export const userChoice = <T>(value: T, note?: string): Choice<T> => ({
  value,
  status: 'confirmed',
  origin: 'user',
  ...(note === undefined ? {} : { note }),
});
