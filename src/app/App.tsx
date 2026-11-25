import { useMemo, useState } from 'react';
import { defaultCatalog } from '../engine/defaults/catalog';
import { vanityDefaults } from '../engine/defaults/vanity';
import { generatePlan } from '../engine/generatePlan';
import { ChoicesTab } from './ChoicesTab';
import { CutListTab } from './CutListTab';
import { useProject } from './project';
import { ShoppingTab } from './ShoppingTab';
import { SizeTab } from './SizeTab';

const TABS = [
  ['size', 'Size'],
  ['choices', 'Choices'],
  ['cut', 'Cut list'],
  ['shop', 'Shopping'],
] as const;

type Tab = (typeof TABS)[number][0];

export function App() {
  const { design, setDesign } = useProject();
  const [tab, setTab] = useState<Tab>('size');
  const plan = useMemo(() => generatePlan(design, vanityDefaults, defaultCatalog), [design]);

  const go = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <main>
        <header>
          <img src="./icons/icon.svg" alt="" width="48" height="48" />
          <h1>Build by Piece</h1>
        </header>
        {tab === 'size' && <SizeTab design={design} plan={plan} onChange={setDesign} />}
        {tab === 'choices' && <ChoicesTab design={design} plan={plan} onChange={setDesign} />}
        {tab === 'cut' && <CutListTab plan={plan} />}
        {tab === 'shop' && <ShoppingTab plan={plan} />}
      </main>
      <nav aria-label="Screens">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
