/**
 * The project being worked on: saved on this device, with a file for backup.
 * No account, no server.
 */
import { useEffect, useState } from 'react';
import { defaultCatalog } from '../engine/defaults/catalog';
import { userChoice, userEntered } from '../engine/defaults/values';
import { vanity01 } from '../engine/fixtures/vanity-01';
import type { EndCondition, ProjectFile, VanityDesign } from '../engine/types';

const STORAGE_KEY = 'build-by-piece:project';

/** A new project starts as the first test cabinet. */
export const startingDesign: VanityDesign = vanity01;

function isDesign(value: unknown): value is VanityDesign {
  if (typeof value !== 'object' || value === null) return false;
  const d = value as Partial<VanityDesign>;
  const isLength = (m: unknown) => typeof m === 'object' && m !== null && typeof (m as { entered?: unknown }).entered === 'string';
  return d.projectType === 'vanity' && isLength(d.width) && isLength(d.depth) && isLength(d.height) && typeof d.overrides === 'object' && d.overrides !== null;
}

export function toProjectFile(design: VanityDesign): ProjectFile {
  return { format: 'build-by-piece-project', schemaVersion: 1, savedAt: new Date().toISOString(), design, catalog: defaultCatalog };
}

/** Reads a project file's text. Returns undefined if it is not one of ours. */
export function fromProjectText(text: string): VanityDesign | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    const file = parsed as Partial<ProjectFile>;
    return file.format === 'build-by-piece-project' && isDesign(file.design) ? file.design : undefined;
  } catch {
    return undefined;
  }
}

function load(): VanityDesign {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved && fromProjectText(saved)) || startingDesign;
  } catch {
    return startingDesign;
  }
}

export function useProject() {
  const [design, setDesign] = useState<VanityDesign>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toProjectFile(design)));
    } catch {
      // Private browsing or a full disk: the project still works, it just is not saved.
    }
  }, [design]);

  return { design, setDesign };
}

export const withSize = (design: VanityDesign, which: 'width' | 'depth' | 'height', entered: string): VanityDesign => ({
  ...design,
  [which]: userEntered(entered),
});

export const withEnd = (design: VanityDesign, side: 'left' | 'right', value: EndCondition): VanityDesign => ({
  ...design,
  overrides: { ...design.overrides, ends: { ...design.overrides.ends, [side]: userChoice(value) } },
});

type Tree = { readonly [key: string]: unknown };

function setAt(tree: Tree, keys: readonly string[], value: unknown): Tree {
  const [key, ...rest] = keys as [string, ...string[]];
  if (rest.length === 0) {
    if (value !== undefined) return { ...tree, [key]: value };
    const { [key]: _removed, ...others } = tree;
    return others;
  }
  const child = setAt((tree[key] as Tree | undefined) ?? {}, rest, value);
  if (Object.keys(child).length > 0) return { ...tree, [key]: child };
  const { [key]: _emptied, ...others } = tree;
  return others;
}

/** Changes one default to a length she typed, or (with no text) puts the app's choice back. */
export const withChange = (design: VanityDesign, path: string, entered: string | undefined): VanityDesign => ({
  ...design,
  overrides: setAt(design.overrides as Tree, path.split('.'), entered === undefined ? undefined : userEntered(entered)) as VanityDesign['overrides'],
});

/** True when this path is a default the user can change on the choices screen. */
export const isChangeable = (path: string): boolean => !['width', 'depth', 'height'].includes(path) && !path.startsWith('layout.');
