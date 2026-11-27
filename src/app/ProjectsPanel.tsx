import { useState } from 'react';

interface ProjectInfo {
  readonly id: string;
  readonly name: string;
  readonly size: string;
}

interface Props {
  readonly projects: readonly ProjectInfo[];
  readonly currentId: string;
  readonly onOpen: (id: string) => void;
  readonly onCreate: () => void;
  readonly onRename: (name: string) => void;
  readonly onRemove: (id: string) => void;
}

/** What she can start. Only the vanity is built so far; the rest show what is coming. */
const KINDS: readonly { readonly name: string; readonly ready: boolean; readonly picture: string }[] = [
  { name: 'Bathroom vanity', ready: true, picture: 'M6 14h36v22H6zM6 36v6h30v-6M24 14v22M10 20h10M28 20h10' },
  { name: 'Kitchen', ready: false, picture: 'M4 22h40v20H4zM4 6h40v10H4zM16 22v20M30 22v20' },
  { name: 'Laundry room', ready: false, picture: 'M6 8h36v34H6zM14 26a10 10 0 1 0 20 0a10 10 0 1 0-20 0M10 14h8' },
  { name: 'Mudroom', ready: false, picture: 'M8 6h32v36H8zM8 28h32M16 12v8M24 12v8M32 12v8' },
  { name: 'Built-ins', ready: false, picture: 'M6 6h36v36H6zM6 18h36M6 30h36M24 6v36' },
  { name: 'Closet', ready: false, picture: 'M8 6h32v36H8zM24 6v36M19 24h2M27 24h2' },
  { name: 'Custom cabinet', ready: false, picture: 'M10 10h28v28H10zM10 24h28M24 24v14' },
];

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
          {KINDS.map((kind) => (
            <li key={kind.name}>
              <button type="button" disabled={!kind.ready} onClick={onCreate}>
                <svg className="icon" viewBox="0 0 48 48" aria-hidden="true">
                  <path d={kind.picture} />
                </svg>
                <span>{kind.name}</span>
                {!kind.ready && <span className="hint">Not yet</span>}
              </button>
            </li>
          ))}
        </ul>
        <p className="hint">A new project keeps your tool list.</p>
      </section>
    </>
  );
}
