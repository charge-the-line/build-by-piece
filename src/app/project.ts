/**
 * The project being worked on: saved on this device, with a file for backup.
 * No account, no server.
 */
import { useEffect, useState } from 'react';
import { defaultCatalog } from '../engine/defaults/catalog';
import { userChoice, userEntered } from '../engine/defaults/values';
import { vanity01 } from '../engine/fixtures/vanity-01';
import type { Approach, EndCondition, PanelMethod, ProjectFile, ToolId, VanityDesign } from '../engine/types';

const STORAGE_KEY = 'build-by-piece:project';

/** A new project starts as the first test cabinet. */
export const startingDesign: VanityDesign = vanity01;

function isDesign(value: unknown): value is VanityDesign {
  if (typeof value !== 'object' || value === null) return false;
  const d = value as Partial<VanityDesign>;
  const isLength = (m: unknown) => typeof m === 'object' && m !== null && typeof (m as { entered?: unknown }).entered === 'string';
  return d.projectType === 'vanity' && isLength(d.width) && isLength(d.depth) && isLength(d.height) && typeof d.overrides === 'object' && d.overrides !== null;
}

export type Checked = Readonly<Record<string, boolean>>;

export function toProjectFile(design: VanityDesign, checked: Checked = {}): ProjectFile {
  return { format: 'build-by-piece-project', schemaVersion: 1, savedAt: new Date().toISOString(), design, catalog: defaultCatalog, checked };
}

interface Project {
  readonly design: VanityDesign;
  readonly checked: Checked;
}

/** Reads a project file's text. Returns undefined if it is not one of ours. */
export function fromProjectText(text: string): Project | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    const file = parsed as Partial<ProjectFile>;
    if (file.format !== 'build-by-piece-project' || !isDesign(file.design)) return undefined;
    const checked = typeof file.checked === 'object' && file.checked !== null ? file.checked : {};
    return { design: file.design, checked };
  } catch {
    return undefined;
  }
}

/** Every project on this device, and which one is open. */
interface Shelf {
  readonly currentId: string;
  readonly projects: readonly Project[];
}

const SHELF_KEY = 'build-by-piece:projects';

function loadShelf(): Shelf {
  const fresh: Shelf = { currentId: startingDesign.id, projects: [{ design: startingDesign, checked: {} }] };
  try {
    const saved = localStorage.getItem(SHELF_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as { currentId?: unknown; projects?: unknown };
      const projects = (Array.isArray(parsed.projects) ? parsed.projects : [])
        .filter((p): p is Project => typeof p === 'object' && p !== null && isDesign((p as Project).design))
        .map((p) => ({ design: p.design, checked: typeof p.checked === 'object' && p.checked !== null ? p.checked : {} }));
      const first = projects[0];
      if (first) {
        const currentId = projects.some((p) => p.design.id === parsed.currentId) ? (parsed.currentId as string) : first.design.id;
        return { currentId, projects };
      }
    }
    // From before there could be more than one project.
    const single = localStorage.getItem(STORAGE_KEY);
    const old = single ? fromProjectText(single) : undefined;
    return old ? { currentId: old.design.id, projects: [old] } : fresh;
  } catch {
    return fresh;
  }
}

export function useProject() {
  const [shelf, setShelf] = useState<Shelf>(loadShelf);
  const project = shelf.projects.find((p) => p.design.id === shelf.currentId) ?? shelf.projects[0]!;

  useEffect(() => {
    try {
      localStorage.setItem(SHELF_KEY, JSON.stringify(shelf));
    } catch {
      // Private browsing or a full disk: the projects still work, they just are not saved.
    }
  }, [shelf]);

  const update = (change: (p: Project) => Project) =>
    setShelf((s) => ({ ...s, projects: s.projects.map((p) => (p.design.id === s.currentId ? change(p) : p)) }));

  return {
    design: project.design,
    checked: project.checked,
    setDesign: (design: VanityDesign) => update((p) => ({ ...p, design })),
    setChecked: (key: string, value: boolean) => update((p) => ({ ...p, checked: { ...p.checked, [key]: value } })),
    /** Replaces the open project, as when a backup file is opened or it is started over. Keeps its place on the shelf. */
    replace: (next: Project) => update((p) => ({ design: { ...next.design, id: p.design.id }, checked: next.checked })),

    projects: shelf.projects.map((p) => ({ id: p.design.id, name: p.design.name, size: `${p.design.width.entered}" × ${p.design.depth.entered}" × ${p.design.height.entered}"` })),
    currentId: project.design.id,
    open: (id: string) => setShelf((s) => ({ ...s, currentId: id })),
    rename: (name: string) => update((p) => ({ ...p, design: { ...p.design, name } })),
    /** A new vanity. It keeps the open project's tools and approach, so the tool list is only set up once. */
    create: () =>
      setShelf((s) => {
        const taken = new Set(s.projects.map((p) => p.design.id));
        let n = s.projects.length + 1;
        while (taken.has(`project-${n}`)) n += 1;
        const { tools, approach } = project.design.overrides;
        const design: VanityDesign = {
          ...startingDesign,
          id: `project-${n}`,
          name: `Bathroom vanity ${n}`,
          overrides: { ...startingDesign.overrides, ...(tools ? { tools } : {}), ...(approach ? { approach } : {}) },
        };
        return { currentId: design.id, projects: [...s.projects, { design, checked: {} }] };
      }),
    remove: (id: string) =>
      setShelf((s) => {
        const projects = s.projects.filter((p) => p.design.id !== id);
        if (projects.length === 0) return s; // always keep one
        return { currentId: s.currentId === id ? projects[0]!.design.id : s.currentId, projects };
      }),
  };
}

export const withSize = (design: VanityDesign, which: 'width' | 'depth' | 'height', entered: string): VanityDesign => ({
  ...design,
  [which]: userEntered(entered),
});

export const withEnd = (design: VanityDesign, side: 'left' | 'right', value: EndCondition): VanityDesign => ({
  ...design,
  overrides: { ...design.overrides, ends: { ...design.overrides.ends, [side]: userChoice(value) } },
});

/** Ticks or unticks one tool. */
export const withTool = (design: VanityDesign, tool: ToolId, has: boolean): VanityDesign => ({
  ...design,
  overrides: { ...design.overrides, tools: { ...design.overrides.tools, [tool]: userChoice(has) } },
});

/** Picks how the plan chooses its methods (rule T9). */
export const withApproach = (design: VanityDesign, approach: Approach): VanityDesign => ({
  ...design,
  overrides: { ...design.overrides, approach: userChoice(approach) },
});

/** Picks how framed fronts hold their panel, or hands the choice back to the app. */
export function withPanelMethod(design: VanityDesign, method: 'auto' | PanelMethod): VanityDesign {
  const { panelMethod: _dropped, ...fronts } = design.overrides.fronts ?? {};
  return { ...design, overrides: { ...design.overrides, fronts: method === 'auto' ? fronts : { ...fronts, panelMethod: userChoice(method) } } };
}

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
