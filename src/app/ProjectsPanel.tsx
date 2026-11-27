import { useState } from 'react';
import { cabinetKinds } from '../engine/defaults/cabinets';
import type { CabinetType } from '../engine/types';

interface ProjectInfo {
  readonly id: string;
  readonly name: string;
  readonly size: string;
}

interface Props {
  readonly projects: readonly ProjectInfo[];
  readonly currentId: string;
  readonly onOpen: (id: string) => void;
  readonly onCreate: (type: CabinetType | 'run') => void;
  readonly onRename: (name: string) => void;
  readonly onRemove: (id: string) => void;
}

/** A simple front view of each cabinet, drawn on a 48 x 48 grid. */
export const CABINET_PICTURES: Readonly<Record<CabinetType, string>> = {
  vanity: 'M4 14h40v22H4zM8 36v6h32v-6M14 14v22M34 14v22M24 14v22M4 22h10M34 22h10',
  base: 'M12 8h24v30H12zM14 38v6h20v-6M12 16h24M21 12h6M32 24v6',
  drawerBase: 'M12 8h24v30H12zM14 38v6h20v-6M12 16h24M12 27h24M21 12h6M21 21h6M21 32h6',
  sinkBase: 'M6 8h36v30H6zM8 38v6h32v-6M6 16h36M24 16v22M20 26v4M28 26v4M18 4h12v4',
  upper: 'M8 6h32v30H8zM24 6v30M20 24v6M28 24v6M4 2h40',
};

/** Other kinds of project Ashley asked for, which the app cannot build yet. */
const LATER: readonly string[] = ['A whole room', 'Laundry room', 'Mudroom', 'Built-ins', 'Closet', 'Custom cabinet'];

export function ProjectsPanel({ projects, currentId, onOpen, onCreate, onRename, onRemove }: Props) {
  const current = projects.find((p) => p.id === currentId)!;
  const [name, setName] = useState(current.name);
  const [removing, setRemoving] = useState<string>();

  return (
    <>
      <section>
        <h2>Your projects</h2>
        <ul className="projectList">
          {projects.map((p) => (
            <li key={p.id}>
              <button type="button" aria-current={p.id === currentId ? 'true' : undefined} onClick={() => onOpen(p.id)}>
                <strong>{p.name}</strong>
                <span>{p.size}</span>
              </button>
              {projects.length > 1 &&
                (removing === p.id ? (
                  <button type="button" onClick={() => onRemove(p.id)}>
                    Yes, delete it
                  </button>
                ) : (
                  <button type="button" className="quiet" onClick={() => setRemoving(p.id)}>
                    Delete
                  </button>
                ))}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Name of this project</h2>
        <div className="field">
          <label htmlFor="projectName">Name</label>
          <input id="projectName" type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && onRename(name.trim())} />
        </div>
      </section>

      <section>
        <h2>Start something new</h2>
        <ul className="kinds">
          {cabinetKinds.map((kind) => (
            <li key={kind.type}>
              <button type="button" onClick={() => onCreate(kind.type)}>
                <svg className="icon" viewBox="0 0 48 48" aria-hidden="true">
                  <path d={CABINET_PICTURES[kind.type]} />
                </svg>
                <span>{kind.name}</span>
                <span className="hint">{kind.blurb}</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => onCreate('run')}>
              <svg className="icon" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M2 14h44v22H2zM14 14v22M26 14v22M38 14v22M4 36v6h40v-6" />
              </svg>
              <span>Kitchen run</span>
              <span className="hint">Several cabinets along one wall.</span>
            </button>
          </li>
          {LATER.map((name) => (
            <li key={name}>
              <button type="button" disabled>
                <span>{name}</span>
                <span className="hint">Not yet</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="hint">A new project keeps your tool list.</p>
      </section>
    </>
  );
}
