/**
 * Layout: sizes every opening in the face frame and checks that the
 * openings and frame pieces add up (docs/RULES.md, rules L1-L5, U4).
 */
import { derive, deriveByRule, Expr, named, sum, type Val } from './derive';
import type { Resolved, ResolvedBay, SizeValue } from './resolve';
import type { ColorRole, Derivation, FrontStyle, SumDiagram, Ticks, ValidationIssue } from './types';
import { asTicks, formatLength, incrementTicks } from './units';

export interface LaidOpening {
  readonly id: string;
  readonly bayId: string;
  readonly kind: 'door' | 'drawer';
  readonly label: string;
  readonly style: FrontStyle;
  readonly width: Val;
  readonly widthDerivation: Derivation;
  readonly height: Val;
  readonly heightDerivation: Derivation;
  /** From the left end of the face frame to the opening. */
  readonly left: Expr;
  /** From the top of the face frame to the opening. */
  readonly top: Expr;
}

export interface LaidBay {
  readonly bay: ResolvedBay;
  readonly width: Val;
  readonly left: Expr;
  readonly openings: readonly LaidOpening[];
}

export interface LayoutResult {
  readonly bays?: readonly LaidBay[];
  readonly issues: readonly ValidationIssue[];
}

interface Slot {
  readonly size: SizeValue;
  /** e.g. "Left drawers: opening width". */
  readonly label: string;
}

interface Sized {
  readonly val: Val;
  readonly derivation: Derivation;
}

type SizeOutcome =
  | { readonly ok: true; readonly sized: readonly Sized[] }
  | { readonly ok: false; readonly fixed: readonly (Sized | undefined)[]; readonly difference: Ticks; readonly noRoom: boolean };

/**
 * Sizes a run of openings that must exactly fill `space`.
 * Fixed openings keep their size; "fill" openings share what is left (L3, U4).
 */
function sizeOpenings(r: Resolved, slots: readonly Slot[], space: Expr): SizeOutcome {
  const fixed: (Sized | undefined)[] = slots.map(({ size, label }) => {
    switch (size.by) {
      case 'opening': {
        const derivation = derive('L5', 'the opening size as entered', size.value!);
        return { val: named(label, derivation), derivation };
      }
      case 'front': {
        const derivation = derive('L5', 'front size minus 2 x overlay', sum(size.value!, [-2, r.V]));
        return { val: named(label, derivation), derivation };
      }
      case 'frontBoard': {
        const derivation = derive('L4', 'width of the front board as sold, minus 2 x overlay', sum(r.slabBoard.width, [-2, r.V]));
        return { val: named(label, derivation), derivation };
      }
      case 'fill':
        return undefined;
    }
  });

  const fixedTotal = fixed.reduce((total, f) => total + (f?.val.value ?? 0), 0);
  const fillCount = fixed.filter((f) => f === undefined).length;
  const left = space.value - fixedTotal;

  if (fillCount === 0) {
    if (left !== 0) return { ok: false, fixed, difference: asTicks(left), noRoom: false };
    return { ok: true, sized: fixed as Sized[] };
  }

  const mark = incrementTicks(r.options.tapeIncrement);
  const share = Math.floor(left / fillCount / mark) * mark;
  if (share <= 0) return { ok: false, fixed, difference: asTicks(left), noRoom: true };

  const inputs = [...space.terms.map(([, val]) => val), ...fixed.flatMap((f) => (f ? [f.val] : []))];
  let fillsSeen = 0;
  const sized = slots.map(({ label }, index): Sized => {
    const known = fixed[index];
    if (known) return known;
    fillsSeen += 1;
    const isLast = fillsSeen === fillCount;
    const result = asTicks(isLast ? left - share * (fillCount - 1) : share);
    const formula =
      fillCount === 1
        ? 'all the space left after the frame pieces and the other openings'
        : `an equal share of the space left after the frame pieces and fixed openings (${fillCount} openings share it)`;
    const derivation = deriveByRule('L3', formula, inputs, result);
    return { val: named(label, derivation), derivation };
  });
  return { ok: true, sized };
}

const text = (ticks: Ticks, r: Resolved) => formatLength(ticks, r.options.tapeIncrement).text;

function mismatchIssue(
  r: Resolved,
  rule: 'L1' | 'L2',
  where: string,
  outcome: Extract<SizeOutcome, { ok: false }>,
  diagram: SumDiagram,
  inputPaths: readonly string[],
): ValidationIssue {
  const across = rule === 'L1';
  const total = across ? 'cabinet width' : 'box height';
  const gap = text(asTicks(Math.abs(outcome.difference)), r);
  const explanation = outcome.noRoom
    ? `${where}: the frame pieces and fixed openings leave no room for the openings that share the leftover space.`
    : outcome.difference > 0
      ? `${where}: the frame pieces and openings add up to ${text(asTicks(diagram.total - outcome.difference), r)}, but the ${total} is ${text(diagram.total, r)}. That leaves ${gap} unexplained.`
      : `${where}: the frame pieces and openings add up to ${text(asTicks(diagram.total - outcome.difference), r)}, which is ${gap} more than the ${total} of ${text(diagram.total, r)}.`;
  return {
    code: across ? 'LAYOUT_WIDTH_MISMATCH' : 'LAYOUT_HEIGHT_MISMATCH',
    ruleId: rule,
    severity: 'error',
    partIds: [],
    inputPaths,
    explanation,
    suggestedFix: across
      ? 'Let the door openings share the leftover width, or change the opening sizes so they add up.'
      : 'Let one opening in this column share the leftover height, or change the sizes so they add up.',
    diagram,
  };
}

export function layOut(r: Resolved): LayoutResult {
  const issues: ValidationIssue[] = [];
  const { S, RT, RB, RD, W, H } = r;
  const bayCount = r.bays.length;

  // --- Across (rule L1) ----------------------------------------------------
  const widthSpace = sum(W, [-(bayCount + 1), S]);
  const widthSlots = r.bays.map((bay) => ({ size: bay.width, label: `${bay.label} opening width` }));
  const widths = sizeOpenings(r, widthSlots, widthSpace);

  if (!widths.ok) {
    const segments: SumDiagram['segments'][number][] = [];
    r.bays.forEach((bay, i) => {
      segments.push({ label: 'frame piece', length: S.value, colorRole: 'faceFrame' });
      const fixed = widths.fixed[i];
      if (fixed) segments.push({ label: `${bay.label} opening`, length: fixed.val.value, colorRole: roleOf(bay) });
    });
    segments.push({ label: 'frame piece', length: S.value, colorRole: 'faceFrame' });
    issues.push(
      mismatchIssue(
        r,
        'L1',
        'Across the cabinet',
        widths,
        { direction: 'horizontal', totalLabel: 'cabinet width', total: W.value, segments, difference: widths.difference },
        ['width', ...r.bays.map((bay) => `layout.${bay.id}.width`)],
      ),
    );
  }

  // --- Up and down (rule L2) ----------------------------------------------
  const heights = r.bays.map((bay) => {
    const drawers = bay.kind === 'drawerColumn' ? bay.drawers : [];
    const slots: Slot[] =
      bay.kind === 'door'
        ? [{ size: bay.height, label: `${bay.label} opening height` }]
        : drawers.map((d, n) => ({ size: d.height, label: `${bay.label}, drawer ${n + 1} opening height` }));
    const space = sum(H, [-1, RT], [-1, RB], [-(Math.max(slots.length, 1) - 1), RD]);
    const outcome = sizeOpenings(r, slots, space);
    if (!outcome.ok) {
      const segments: SumDiagram['segments'][number][] = [{ label: 'top frame piece', length: RT.value, colorRole: 'faceFrame' }];
      slots.forEach((slot, n) => {
        if (n > 0) segments.push({ label: 'piece between drawers', length: RD.value, colorRole: 'faceFrame' });
        const fixed = outcome.fixed[n];
        if (fixed) segments.push({ label: slot.label.replace(' height', ''), length: fixed.val.value, colorRole: roleOf(bay) });
      });
      segments.push({ label: 'bottom frame piece', length: RB.value, colorRole: 'faceFrame' });
      const paths =
        bay.kind === 'door' ? [`layout.${bay.id}.height`] : drawers.map((d) => `layout.${bay.id}.${d.id}.height`);
      issues.push(
        mismatchIssue(
          r,
          'L2',
          bay.label,
          outcome,
          { direction: 'vertical', totalLabel: 'box height', total: H.value, segments, difference: outcome.difference },
          ['height', ...paths],
        ),
      );
    }
    return outcome;
  });

  if (!widths.ok || heights.some((h) => !h.ok)) return { issues };

  // --- Positions -----------------------------------------------------------
  const bays: LaidBay[] = [];
  r.bays.forEach((bay, i) => {
    const width = widths.sized[i]!;
    const left = sum([i + 1, S], ...bays.map((b) => b.width));
    const sized = (heights[i] as Extract<SizeOutcome, { ok: true }>).sized;
    const openings: LaidOpening[] = [];
    sized.forEach((height, n) => {
      const top = sum(RT, [n, RD], ...openings.map((o) => o.height));
      const isDoor = bay.kind === 'door';
      const drawer = bay.kind === 'drawerColumn' ? bay.drawers[n]! : undefined;
      openings.push({
        id: drawer ? drawer.id : bay.id,
        bayId: bay.id,
        kind: isDoor ? 'door' : 'drawer',
        label: isDoor ? bay.label : `${bay.label}, drawer ${n + 1}`,
        style: bay.kind === 'door' ? bay.style : drawer!.style,
        width: width.val,
        widthDerivation: width.derivation,
        height: height.val,
        heightDerivation: height.derivation,
        left,
        top,
      });
    });
    bays.push({ bay, width: width.val, left, openings });
  });

  return { bays, issues };
}

function roleOf(bay: ResolvedBay): ColorRole {
  return bay.kind === 'door' ? 'door' : 'drawerFront';
}
