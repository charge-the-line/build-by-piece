import { describe, expect, it } from 'vitest';
import { asTicks, formatLength, parseLength } from '../units';
import { inches } from './helpers';

const ticks = (entered: string, unit: 'in' | 'mm' = 'in') => {
  const parsed = parseLength(entered, unit);
  return parsed.ok ? parsed.ticks : parsed.reason;
};

describe('units (rules U1-U3)', () => {
  it('parses fractional inches, decimal inches and millimetres to whole ticks', () => {
    expect(ticks('60')).toBe(60 * 4064);
    expect(ticks('79 1/2')).toBe(79 * 4064 + 2032);
    expect(ticks('79.5')).toBe(79 * 4064 + 2032);
    expect(ticks('23/32')).toBe(23 * 127);
    expect(ticks('1524', 'mm')).toBe(1524 * 160);
    expect(ticks('1524.5', 'mm')).toBe(1524 * 160 + 80);
  });

  it('represents 1/32" as 127 ticks and 1 mm as 160 ticks exactly', () => {
    expect(ticks('1/32')).toBe(127);
    expect(ticks('1', 'mm')).toBe(160);
    expect(ticks('25.4', 'mm')).toBe(ticks('1'));
  });

  it('accepts the unit mark people tend to type', () => {
    expect(ticks('60"')).toBe(ticks('60'));
    expect(ticks(' 60 1/2 in ')).toBe(ticks('60.5'));
    expect(ticks('30 mm', 'mm')).toBe(30 * 160);
  });

  it('rejects a fraction whose bottom number is not 2, 4, 8, 16 or 32, such as 79 2/3 or 79 3/5', () => {
    for (const entry of ['79 2/3', '79 1/3', '79 3/5', '1/64', '5/12']) {
      const parsed = parseLength(entry, 'in');
      expect(parsed.ok, entry).toBe(false);
      if (!parsed.ok) expect(parsed.reason).toMatch(/tape measure/);
    }
  });

  it('rejects entries that are not lengths', () => {
    for (const entry of ['', 'abc', '-5', '0', '5/4', '1/2/3', '60 1/2 3']) {
      expect(parseLength(entry, 'in').ok, entry).toBe(false);
    }
    expect(parseLength('1/2', 'mm').ok).toBe(false);
  });

  it('rounds a decimal-inch entry that is not on a tick to the nearest tick and reports the rounding', () => {
    expect(parseLength('0.1', 'in')).toEqual({ ok: true, ticks: 406, exact: false });
    expect(parseLength('0.5', 'in')).toEqual({ ok: true, ticks: 2032, exact: true });
    expect(parseLength('0.01', 'mm')).toEqual({ ok: true, ticks: 2, exact: false });
  });

  it('refuses a length that is not a whole number of ticks', () => {
    expect(() => asTicks(1.5)).toThrow();
  });

  it('prints inches as proper fractions on the chosen tape increment, such as 79 1/2"', () => {
    expect(formatLength(inches('79 1/2')).text).toBe('79 1/2"');
    expect(formatLength(inches('13 1/8')).text).toBe('13 1/8"');
    expect(formatLength(inches('3/4')).text).toBe('3/4"');
    expect(formatLength(inches('30')).text).toBe('30"');
    expect(formatLength(inches('23/32'), '1/32in').text).toBe('23/32"');
  });

  it('says when a printed length had to be rounded to a tape mark', () => {
    expect(formatLength(inches('23/32'))).toEqual({ text: '3/4"', rounded: true });
    expect(formatLength(inches('3/4'))).toEqual({ text: '3/4"', rounded: false });
  });

  it('prints millimetres whole, with commas from 1,000 up', () => {
    expect(formatLength(inches('60'), '1mm')).toEqual({ text: '1,524 mm', rounded: false });
    expect(formatLength(asTicks(1200 * 4064)).text).toBe('1,200"');
  });
});
