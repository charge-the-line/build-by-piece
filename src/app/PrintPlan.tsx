import type { PlanResult, VanityDesign } from '../engine/types';
import { CutListTab } from './CutListTab';
import { CuttingTab } from './CuttingTab';
import { FrontView } from './FrontView';
import { ShoppingTab } from './ShoppingTab';
import { StepView } from './steps/StepView';

/** Everything on paper: sizes, shopping, cut list, cutting diagrams and every step. */
export function PrintPlan({ design, plan }: { design: VanityDesign; plan: PlanResult }) {
  return (
    <div className="printPlan">
      <h1>Build by Piece: {design.name}</h1>
      <p>
        {design.width.entered}" wide × {design.depth.entered}" deep × {design.height.entered}" high. Width is the whole cabinet; depth is wall to
        the front of the face frame; height is the box without the platform or top.
      </p>
      <FrontView plan={plan} />
      <ShoppingTab plan={plan} />
      <CutListTab plan={plan} forPrint />
      <CuttingTab design={design} plan={plan} onChange={() => undefined} forPrint />
      {plan.steps.map((step) => (
        <StepView key={step.id} plan={plan} step={step} />
      ))}
    </div>
  );
}
