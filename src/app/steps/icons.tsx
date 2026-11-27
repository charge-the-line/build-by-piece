import type { ReactNode } from 'react';
import { toolList } from '../../engine/defaults/tools';

/**
 * Simple line pictures of the tools, so a step can show what to pick up
 * without making her read. Each is drawn on a 48 x 48 grid.
 */
const shapes: Readonly<Record<string, ReactNode>> = {
  drill: (
    <>
      <rect x="8" y="12" width="24" height="12" rx="3" />
      <path d="M32 18h10M20 24l-3 16h8l-1-16" />
    </>
  ),
  pocketHoleJig: (
    <>
      <rect x="8" y="14" width="32" height="22" rx="3" />
      <path d="M16 14l6 16M26 14l6 16" />
    </>
  ),
  clamps: <path d="M34 8H14v32h20M34 8v8M34 40v-8M22 24h18M40 20v8" />,
  glue: (
    <>
      <path d="M18 20h12v20H18zM21 20l2-10h2l2 10" />
      <path d="M21 30h6" />
    </>
  ),
  measuring: (
    <>
      <rect x="8" y="12" width="22" height="22" rx="4" />
      <path d="M30 30h12v4H30M36 30v-3M40 30v-3" />
    </>
  ),
  circularSaw: (
    <>
      <circle cx="24" cy="28" r="12" />
      <path d="M8 40h32M24 16v-6h12" />
      <circle cx="24" cy="28" r="2" />
    </>
  ),
  trackSaw: (
    <>
      <circle cx="24" cy="24" r="10" />
      <path d="M4 38h40M4 42h40M24 14v-6h10" />
    </>
  ),
  tableSaw: (
    <>
      <path d="M6 22h36M10 22v18M38 22v18" />
      <path d="M16 22a8 8 0 0 1 16 0" />
    </>
  ),
  mitreSaw: (
    <>
      <circle cx="26" cy="22" r="10" />
      <path d="M6 40h36M26 12l10-6M14 40l6-10" />
    </>
  ),
  jigsaw: (
    <>
      <path d="M10 14h22a6 6 0 0 1 6 6v6H10z" />
      <path d="M8 26h32M18 26v14M18 30l3 2-3 2 3 2-3 2" />
    </>
  ),
  holeSaw: (
    <>
      <path d="M12 22h24v12H12zM24 22V8" />
      <path d="M12 34l3 4 3-4 3 4 3-4 3 4 3-4 3 4 3-4" />
    </>
  ),
  router: (
    <>
      <rect x="16" y="8" width="16" height="20" rx="3" />
      <path d="M8 22h8M32 22h8M10 32h28M24 32v8M21 40h6" />
    </>
  ),
  bradNailer: <path d="M8 14h26v10H22l-2 16h-8l2-16H8zM34 16h6v6h-6M38 22v14" />,
  hammer: <path d="M10 12h18v8H10zM28 14h8v4h-8M19 20v22" />,
  sander: (
    <>
      <path d="M10 26h28v8H10zM16 26v-8h16v8" />
      <path d="M8 38h32" />
    </>
  ),
  sandingBlock: (
    <>
      <rect x="10" y="20" width="28" height="12" rx="2" />
      <path d="M8 36h32M14 40h4M22 40h4M30 40h4" />
    </>
  ),
  brush: <path d="M18 6h12v14H18zM16 20h16v6H16zM18 26v16M22 26v16M26 26v16M30 26v16" />,
  hingeBit: (
    <>
      <path d="M24 6v18M14 24h20v8H14z" />
      <path d="M14 32l2 6M34 32l-2 6M24 32v8" />
    </>
  ),
  screw: <path d="M16 10h16l-4 6h-8zM24 16v24M20 22l8 3M20 28l8 3M20 34l8 3" />,
  nail: <path d="M18 10h12M24 10v28l-2 4" />,
  slide: (
    <>
      <rect x="4" y="18" width="40" height="5" />
      <rect x="10" y="25" width="34" height="5" />
    </>
  ),
  hinge: (
    <>
      <circle cx="16" cy="24" r="9" />
      <path d="M25 18h16v12H25M33 21v6" />
    </>
  ),
};

const names: Readonly<Record<string, string>> = {
  ...Object.fromEntries(toolList.map((t) => [t.id, t.name])),
  measuring: 'Tape, square, level',
  circularSaw: 'Circular saw',
  glue: 'Wood glue',
  hammer: 'Hammer and nails',
  sandingBlock: 'Sanding block',
  brush: 'Brush',
  hingeBit: 'Hinge-boring bit',
  drill: 'Drill',
};

export const toolLabel = (id: string): string => names[id] ?? id;

export function Icon({ id }: { id: string }) {
  return (
    <svg className="icon" viewBox="0 0 48 48" aria-hidden="true">
      {shapes[id] ?? <circle cx="24" cy="24" r="14" />}
    </svg>
  );
}
