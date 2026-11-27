import { useEffect, useMemo, useState } from 'react';
import { defaultCatalog } from '../engine/defaults/catalog';
import { vanityDefaults } from '../engine/defaults/vanity';
import { generatePlan } from '../engine/generatePlan';
import { generateRun } from '../engine/run';
import { BuildTab } from './BuildTab';
import { ChoicesTab } from './ChoicesTab';
import { CutListTab } from './CutListTab';
import { CuttingTab } from './CuttingTab';
import { PrintPlan } from './PrintPlan';
import { ProjectsPanel } from './ProjectsPanel';
import { useProject } from './project';
import { ShoppingTab } from './ShoppingTab';
import { RunTab } from './RunTab';
import { SizeTab } from './SizeTab';

const TABS = [
  ['size', 'Size'],
  ['choices', 'Choices'],
  ['cut', 'Parts'],
  ['cutting', 'Cutting'],
  ['shop', 'Shop'],
  ['build', 'Build'],
] as const;

type Tab = (typeof TABS)[number][0];

export function App() {
  const { design, checked, setDesign, setChecked, replace, projects, currentId, open, create, rename, remove } = useProject();
  const [showProjects, setShowProjects] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [tab, setTab] = useState<Tab>('size');
  const plan = useMemo(() => (design.projectType === 'run' ? generateRun(design, vanityDefaults, defaultCatalog) : generatePlan(design, vanityDefaults, defaultCatalog)), [design]);

  // The printable plan is only built when asked for, then handed to the browser's print dialog.
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done, { once: true });
    window.print();
    return () => window.removeEventListener('afterprint', done);
  }, [printing]);

  const go = (next: Tab) => {
    setShowProjects(false);
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <main>
        <header>
          <img src="./icons/icon.svg" alt="" width="48" height="48" />
          <div>
            <h1>Build by Piece</h1>
            <button type="button" className="quiet projectButton" aria-expanded={showProjects} onClick={() => setShowProjects(!showProjects)}>
              {design.name} · {showProjects ? 'close' : 'change'}
            </button>
          </div>
        </header>
        {showProjects ? (
          <ProjectsPanel
            key={currentId}
            projects={projects}
            currentId={currentId}
            onOpen={open}
            onCreate={(type) => {
              create(type);
              go('size');
            }}
            onRename={rename}
            onRemove={remove}
          />
        ) : (
          <>
            {tab === 'size' && (design.projectType === 'run' ? <RunTab design={design} plan={plan} onChange={setDesign} /> : <SizeTab design={design} plan={plan} onChange={setDesign} />)}
            {tab === 'choices' && <ChoicesTab design={design} plan={plan} onChange={setDesign} checked={checked} onReplace={replace} />}
            {tab === 'cut' && <CutListTab plan={plan} />}
            {tab === 'cutting' && <CuttingTab design={design} plan={plan} onChange={setDesign} checked={checked} onCheck={setChecked} />}
            {tab === 'shop' && <ShoppingTab plan={plan} checked={checked} onCheck={setChecked} />}
            {tab === 'build' && <BuildTab key={currentId} plan={plan} checked={checked} onCheck={setChecked} onPrint={() => setPrinting(true)} />}
          </>
        )}
      </main>
      <nav aria-label="Screens">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" aria-current={tab === id && !showProjects ? 'page' : undefined} onClick={() => go(id)}>
            {label}
          </button>
        ))}
      </nav>
      {printing && plan.canGeneratePlan && <PrintPlan design={design} plan={plan} />}
    </>
  );
}
