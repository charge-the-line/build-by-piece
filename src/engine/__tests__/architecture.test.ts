/**
 * Guards the rule that src/engine is pure TypeScript: no UI, DOM or network.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const engineDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const files = sourceFiles(engineDir);
const importPattern = /(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
const forbiddenGlobals = /\b(document|window|navigator|localStorage|fetch|XMLHttpRequest)\b\s*[.(]/;

describe('engine purity', () => {
  it('finds engine source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('imports nothing from outside src/engine', () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const match of readFileSync(file, 'utf8').matchAll(importPattern)) {
        const target = match[1] ?? '';
        const inside = target.startsWith('.') && !relative(engineDir, resolve(dirname(file), target)).startsWith('..');
        if (!inside) offenders.push(`${relative(engineDir, file)} imports ${target}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('uses no browser or network globals', () => {
    const offenders = files.filter((file) => forbiddenGlobals.test(readFileSync(file, 'utf8')));
    expect(offenders.map((file) => relative(engineDir, file))).toEqual([]);
  });

  it('keeps .tsx (UI) files out of the engine', () => {
    expect(files.filter((file) => file.endsWith('.tsx'))).toEqual([]);
  });
});
