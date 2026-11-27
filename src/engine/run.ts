/**
 * A run of cabinets along one wall (docs/RULES.md, section R).
 *
 * The run shares its length out between its cabinets, has each cabinet
 * planned by the usual rules, then adds what belongs to the run as a whole:
 * one platform and toe kick per stretch, shared cutting diagrams, one
 * shopping list, and the steps that set the cabinets in place.
 *
 * A row of upper cabinets follows the bottom row (section W): the same
 * widths, hung at one height, on the same lists and diagrams.
 */
import { cutDiagrams, shoppingList } from './cutting';
import { cabinetKind } from './defaults/cabinets';
import { aboveFor, applianceKind, CORNER_ITEM, cornerDefaults, runLimits, upperRow } from './defaults/run';
import { defaultChoice, userChoice } from './defaults/values';
import { deriveByRule, needsCheck, statusOf, type Val } from './derive';
import { generatePlan } from './generatePlan';
import { contact, screwsAlong } from './geometry';
import { effectiveOptions, resolveVanity, type BoardValues, type Resolved } from './resolve';
import type {
  Derivation,
  EndCondition,
  FloorBox,
  HardwareLine,
  MaterialCatalog,
  Part,
  PartId,
  PieceRef,
  Placement,
  PlanResult,
  PlanTool,
  Point3,
  ResolvedInput,
  RunAbove,
  RunCabinet,
  RunDesign,
  RunItem,
  RunSpace,
  Step,
  StepPiece,
  SumDiagram,
  SupplyLine,
  Ticks,
  ValidationIssue,
  VanityDesign,
  VanityOptions,
} from './types';
import { asTicks, formatLength, parseLength } from './units';
import { lengthOf } from './vanity';

const blocked = (inputs: readonly ResolvedInput[], issues: readonly ValidationIssue[]): PlanResult => ({
  inputs,
  issues,
  canGeneratePlan: false,
  openings: [],
  parts: [],
  cutDiagrams: [],
  materials: [],
  hardware: [],
  tools: [],
  supplies: [],
  placements: [],
  steps: [],
});

const key = (ref: PieceRef) => `${ref.partId}#${ref.copy}`;

type Phase = 'buildBase' | 'buildUpper' | 'installBase' | 'installUpper' | 'fit';

/** Where one wall stands in the project. A single run is wall 1 with no corner. */
interface WallContext {
  readonly wall: 1 | 2;
  /** How many cabinets, uppers and run parts were numbered before this wall (N8). */
  readonly first: { readonly cabinet: number; readonly upper: number; readonly runPart: number };
  readonly corner?: {
    /** Which end of this wall, as she faces it, is at the corner. */
    readonly side: 'left' | 'right';
    /** N2: this wall's cabinets run into the corner, or start in front of the other wall's. */
    readonly role: 'into' | 'front';
    /** Whether the other wall has an upper cabinet at the corner (N7). */
    readonly otherHasUpper: boolean;
  };
}

/** One wall's plan, with what is needed to put two walls together. */
interface WallPlan extends PlanResult {
  readonly extras?: {
    readonly phaseOf: ReadonlyMap<string, Phase>;
    /** Everything standing once this wall's base cabinets, or its uppers, are in. */
    readonly installedBase: readonly PieceRef[];
    readonly installedUpper: readonly PieceRef[];
    readonly depth: Ticks;
    readonly cutting: Parameters<typeof cutDiagrams>[2];
  };
}

function planWall(run: RunDesign, defaults: VanityOptions, catalog: MaterialCatalog, wall: WallContext): WallPlan {
  const corner = wall.corner;
  const RUN = wall.wall === 2 ? 'run2' : 'run';
  const numberOf = (id: string) => Number(id.slice(1));
  const issues: ValidationIssue[] = [];
  const inputs: ResolvedInput[] = [];
  const text = (ticks: number) => formatLength(asTicks(ticks)).text;
  const error = (code: string, ruleId: string, explanation: string, suggestedFix: string, inputPaths: readonly string[], diagram?: SumDiagram) =>
    issues.push({ code, ruleId, severity: 'error', partIds: [], inputPaths, explanation, suggestedFix, ...(diagram ? { diagram } : {}) });

  // --- What every cabinet in the run shares --------------------------------
  // A stand-in cabinet reads the shared values: depth, height, materials, tools.
  const asCabinet = (cabinet: VanityDesign['cabinet'], id: string): VanityDesign => ({
    projectType: 'vanity',
    cabinet: cabinet ?? 'base',
    id,
    name: cabinetKind(cabinet).name,
    width: run.length,
    depth: run.depth,
    height: run.height,
    overrides: run.overrides,
  });
  const shared = resolveVanity(asCabinet('base', 'shared'), defaults, catalog, { width: lengthOf(runLimits.widest), ends: { left: 'joined', right: 'joined' } });
  inputs.push(...shared.inputs.filter((i) => !i.path.startsWith('layout.')));
  const options = effectiveOptions(asCabinet('base', 'shared'), defaults);
  const runEnds = { left: options.ends.left, right: options.ends.right };
  for (const side of ['left', 'right'] as const) {
    // At a corner that end is not hers to choose: nothing overhangs and nothing shows (N3, N5).
    if (corner?.side === side) {
      runEnds[side] = { ...runEnds[side], value: 'joined' };
      continue;
    }
    const c = runEnds[side];
    inputs.push({ path: `ends.${side}`, label: `${side} end of the run`, value: c.value, status: c.status, origin: c.origin, ...(c.note ? { note: c.note } : {}) });
  }

  // --- R1: the length of the run -------------------------------------------
  const parsedLength = parseLength(run.length.entered, run.length.unit);
  if (!parsedLength.ok) {
    error('INPUT_NOT_USABLE', 'U2', `Length of the run: "${run.length.entered}" cannot be used. ${parsedLength.reason}`, 'Type a length that is on a tape measure.', ['length']);
  }
  const length = parsedLength.ok ? parsedLength.ticks : asTicks(0);
  inputs.unshift({ path: 'length', label: 'length of the run', value: length, status: run.length.status, origin: run.length.origin });
  issues.push(...shared.issues);
  const r = shared.resolved;
  if (!r || !parsedLength.ok) return blocked(inputs, issues);
  if (run.items.length === 0) {
    error('RUN_IS_EMPTY', 'R1', 'There is nothing in the run yet.', 'Add a cabinet.', []);
    return blocked(inputs, issues);
  }

  // --- N4, N5: at a corner ---------------------------------------------------
  // The gap strip is an oak board at the width it is sold, and the gap is that wide.
  const stripBoard = corner ? [r.toeKickBoard, r.frameBoard, r.supportBoard, r.slabBoard, r.shakerBoard].find((b) => b.stock.id === cornerDefaults.stripMaterial) : undefined;
  if (corner && !stripBoard) {
    error('CORNER_STRIP_BOARD', 'N4', 'The board for the gap strip at the corner is not in the materials list.', 'Put the oak 1x4 back in the materials.', []);
    return blocked(inputs, issues);
  }
  const gap = stripBoard?.width;
  const cornerIndex = corner?.side === 'left' ? 0 : run.items.length - 1;
  if (corner?.role === 'front' && run.items[cornerIndex]!.kind !== 'cabinet') {
    error('CORNER_NEEDS_CABINET', 'N5', 'An appliance space cannot be the first thing at the corner: there would be nothing to fix the gap strip to.', 'Put a cabinet between the corner and the appliance.', []);
    return blocked(inputs, issues);
  }
  // N5: the second wall's cabinets start in front of the first wall's, after the gap.
  const reserved = corner?.role === 'front' ? r.D.value + gap!.value : 0;
  const usable = length - reserved;

  // --- R2: sharing the length out ------------------------------------------
  const narrowest = lengthOf(runLimits.narrowest);
  const widest = lengthOf(runLimits.widest);
  interface Sized {
    readonly name: string;
    readonly fixed: boolean;
    readonly width: number;
  }
  const given = run.items.map((item): Sized | undefined => {
    const name = item.kind === 'cabinet' ? cabinetKind(item.cabinet).name : applianceKind(item.appliance).name;
    // An appliance space and a sink base start at a standard width; anything else shares.
    const start = item.width ?? (item.kind === 'appliance' ? applianceKind(item.appliance).width : item.cabinet === 'sinkBase' ? { ...runLimits.widest, entered: cabinetKind('sinkBase').start.width, note: 'A common sink base width.' } : undefined);
    if (!start) return undefined;
    const parsed = parseLength(start.entered, start.unit);
    if (!parsed.ok) {
      error('INPUT_NOT_USABLE', 'U2', `${name}: "${start.entered}" cannot be used. ${parsed.reason}`, 'Type a length that is on a tape measure.', [`items.${item.id}.width`]);
      return { name, fixed: true, width: 0 };
    }
    return { name, fixed: true, width: parsed.ticks };
  });
  if (issues.some((i) => i.severity === 'error')) return blocked(inputs, issues);

  const fixedTotal = given.reduce((total, g) => total + (g?.width ?? 0), 0);
  const sharers = given.filter((g) => g === undefined).length;
  const left = usable - fixedTotal;
  const mark = lengthOf({ entered: '1/16', unit: 'in', status: 'confirmed', origin: 'appDefault' });
  const share = sharers > 0 ? Math.floor(left / sharers / mark) * mark : 0;
  const runPicture = (widths: readonly (number | undefined)[]): SumDiagram => ({
    direction: 'horizontal',
    totalLabel: 'length of the run',
    total: asTicks(usable),
    segments: run.items.flatMap((item, i) => (widths[i] === undefined ? [] : [{ label: item.kind === 'cabinet' ? cabinetKind(item.cabinet).name : applianceKind(item.appliance).name, length: asTicks(widths[i]!), colorRole: item.kind === 'cabinet' ? ('faceFrame' as const) : ('support' as const) }])),
    difference: asTicks(usable - widths.reduce<number>((total, w) => total + (w ?? 0), 0)),
  });
  const itemPaths = ['length', ...run.items.map((item) => `items.${item.id}.width`)];
  if (sharers === 0 && left !== 0) {
    error(
      'RUN_WIDTH_MISMATCH',
      'R2',
      left > 0
        ? `The cabinets and spaces add up to ${text(fixedTotal)}, but the run is ${text(usable)}. That leaves ${text(left)} unexplained.`
        : `The cabinets and spaces add up to ${text(fixedTotal)}, which is ${text(-left)} more than the run of ${text(usable)}.`,
      'Let one cabinet share the leftover width, or change the widths so they add up.',
      itemPaths,
      runPicture(given.map((g) => g?.width)),
    );
    return blocked(inputs, issues);
  }
  let sharersSeen = 0;
  const widths = given.map((g) => {
    if (g) return g.width;
    sharersSeen += 1;
    // U4: the last sharer takes what rounding left over, so the widths add up exactly.
    return sharersSeen === sharers ? left - share * (sharers - 1) : share;
  });

  // --- W1: what goes above each thing in the bottom row ---------------------
  const aboveOf = run.items.map((item) => aboveFor(item, run.uppers));
  const anyUpper = aboveOf.some((a) => a.choice === 'upper');

  // --- W3: one depth, one height, and one height on the wall ----------------
  const upperValue = (which: 'depth' | 'height' | 'aboveCounter' | 'ceiling', label: string): Val => {
    const m = run.uppers?.[which] ?? upperRow[which];
    const parsed = parseLength(m.entered, m.unit);
    if (!parsed.ok) error('INPUT_NOT_USABLE', 'U2', `${label}: "${m.entered}" cannot be used. ${parsed.reason}`, 'Type a length that is on a tape measure.', [`uppers.${which}`]);
    const value = parsed.ok ? parsed.ticks : asTicks(0);
    if (anyUpper) inputs.push({ path: `uppers.${which}`, label, value, status: m.status, origin: m.origin, ...(m.note ? { note: m.note } : {}) });
    return { label, value, status: m.status, origin: m.origin, source: `uppers.${which}` };
  };
  const upperDepth = upperValue('depth', 'upper cabinets: depth');
  const upperHeight = upperValue('height', 'upper cabinets: height');
  const aboveCounter = upperValue('aboveCounter', 'upper cabinets: gap above the countertop');
  const ceiling = upperValue('ceiling', 'ceiling height');
  if (issues.some((i) => i.severity === 'error')) return blocked(inputs, issues);
  const upperBottom = deriveByRule(
    'W3',
    'platform height + base box height + countertop thickness + gap above the countertop',
    [r.lumber.width, r.H, r.countertopThickness, aboveCounter],
    asTicks(r.lumber.width.value + r.H.value + r.countertopThickness.value + aboveCounter.value),
  );
  const upperTop = asTicks(upperBottom.result + upperHeight.value);

  // --- R5: where everything sits, and its number ---------------------------
  type Unit = RunCabinet & { readonly ends: { left: EndCondition; right: EndCondition }; readonly blind?: { readonly side: 'left' | 'right'; readonly by: Ticks } };
  const cabinets: Unit[] = [];
  const spaces: RunSpace[] = [];
  // The base boxes stand on the platform; the drawing runs from the floor up.
  const baseBottom = r.lumber.width.value;
  const baseTop = asTicks(baseBottom + r.H.value);
  const pictureHeight = anyUpper ? asTicks(Math.max(upperTop, baseTop)) : baseTop;
  const baseFromTop = asTicks(pictureHeight - baseTop);
  const lefts: number[] = [];
  let x = corner?.role === 'front' && corner.side === 'left' ? reserved : 0;
  run.items.forEach((item, i) => {
    const width = widths[i]!;
    lefts.push(x);
    const fixed = given[i] !== undefined;
    const label = item.kind === 'cabinet' ? cabinetKind(item.cabinet).name : applianceKind(item.appliance).name;
    if (item.kind === 'appliance') {
      spaces.push({ itemId: item.id, appliance: item.appliance, name: label, left: asTicks(x), width: asTicks(width), fromTop: baseFromTop, height: baseTop });
    } else {
      const neighbour = (other: (typeof run.items)[number] | undefined, runEnd: EndCondition): EndCondition => (other === undefined ? runEnd : other.kind === 'appliance' ? 'exposed' : 'joined');
      const id = `C${String(cabinets.length + 1 + wall.first.cabinet).padStart(2, '0')}`;
      // N3: the corner cabinet's box runs on behind the other wall's cabinets and the gap.
      const blindBy = item.cabinet === 'cornerBase' && corner ? asTicks(r.D.value + gap!.value) : undefined;
      if (blindBy !== undefined && width - blindBy < narrowest) {
        error(
          'CORNER_CABINET_NARROW',
          'N3',
          `${id} ${label} is ${text(Math.max(width, 0))} wide, but ${text(blindBy)} of it is hidden in the corner. That leaves less than ${text(narrowest)} for its door.`,
          'Make the corner cabinet wider.',
          [`items.${item.id}.width`],
        );
      }
      cabinets.push({
        id,
        row: 'base',
        bottom: baseBottom,
        height: r.H.value,
        fromTop: baseFromTop,
        itemId: item.id,
        kind: item.cabinet,
        name: label,
        left: asTicks(Math.max(x, 0)),
        width: asTicks(Math.max(width, 0)),
        ends: { left: neighbour(run.items[i - 1], runEnds.left.value), right: neighbour(run.items[i + 1], runEnds.right.value) },
        ...(blindBy !== undefined ? { blind: { side: corner!.side, by: blindBy } } : {}),
      });
      if (width < narrowest || width > widest) {
        error(
          'RUN_CABINET_WIDTH',
          'R8',
          width < narrowest ? `${id} ${label} comes out ${text(Math.max(width, 0))} wide, which is too narrow to build (the least is ${text(narrowest)}).` : `${id} ${label} comes out ${text(width)} wide, which is too wide to build (the most is ${text(widest)}).`,
          width < narrowest ? 'Remove a cabinet, or make the run longer.' : 'Add a cabinet to the run.',
          itemPaths,
          runPicture(widths),
        );
      }
    }
    const number = item.kind === 'cabinet' ? `${cabinets.at(-1)!.id} ` : '';
    const standard = item.kind === 'appliance' ? applianceKind(item.appliance).width : undefined;
    inputs.push({
      path: `items.${item.id}.width`,
      label: `${number}${label}: width`,
      value: asTicks(Math.max(width, 0)),
      status: item.width ? item.width.status : 'assumed',
      origin: item.width ? item.width.origin : 'appDefault',
      ...(item.width ? {} : standard?.checkAt ? { checkAt: standard.checkAt } : {}),
      note: item.width ? (item.width.origin === 'user' ? 'You set this width.' : (item.width.note ?? '')) : fixed ? (standard?.note ?? 'A common sink base width.') : 'Shares the run with the other cabinets.',
    });
    x += width;
  });

  if (issues.some((i) => i.severity === 'error')) return blocked(inputs, issues);

  // --- W2, W4, W5: the top row follows the bottom row -----------------------
  const uppers: Unit[] = [];
  const above: RunAbove[] = run.items.map((item, i) => {
    const under = item.kind === 'cabinet' ? `${cabinets.find((c) => c.itemId === item.id)!.id} ${cabinetKind(item.cabinet).name}` : applianceKind(item.appliance).name;
    const { choice, proposed, reason } = aboveOf[i]!;
    if (choice === 'none') return { itemId: item.id, under, choice, proposed, reason };
    // W4: a side beside a gap can be seen; beside another upper it is joined.
    const neighbour = (j: number, runEnd: EndCondition): EndCondition => (j < 0 || j >= run.items.length ? runEnd : aboveOf[j]!.choice === 'upper' ? 'joined' : 'exposed');
    const id = `U${String(uppers.length + 1 + wall.first.upper).padStart(2, '0')}`;
    let width = widths[i]!;
    let left = lefts[i]!;
    let blind: Unit['blind'];
    let cornerEnd: EndCondition | undefined;
    if (corner && i === cornerIndex) {
      if (corner.role === 'front') {
        // N7: uppers are shallower, so this one reaches further towards the corner than the cabinet under it.
        const further = r.D.value - upperDepth.value;
        width += further;
        if (corner.side === 'left') left -= further;
        cornerEnd = corner.otherHasUpper ? 'joined' : 'exposed';
      } else if (corner.otherHasUpper) {
        blind = { side: corner.side, by: asTicks(upperDepth.value + gap!.value) };
        cornerEnd = 'joined';
      } else {
        cornerEnd = 'wall';
      }
      if (blind && width - blind.by < narrowest) {
        error('CORNER_CABINET_NARROW', 'N7', `${id} ${cabinetKind('upper').name} is ${text(Math.max(width, 0))} wide, but ${text(blind.by)} of it is hidden in the corner. That leaves less than ${text(narrowest)} for its doors.`, 'Make the corner cabinet wider, or leave the space above it empty.', [`uppers.above.${item.id}`, `items.${item.id}.width`]);
      }
    }
    const endAt = (side: 'left' | 'right'): EndCondition => (cornerEnd && corner!.side === side ? cornerEnd : neighbour(side === 'left' ? i - 1 : i + 1, runEnds[side].value));
    uppers.push({
      id,
      row: 'upper',
      bottom: upperBottom.result,
      height: upperHeight.value,
      fromTop: asTicks(pictureHeight - upperTop),
      itemId: item.id,
      kind: 'upper',
      name: cabinetKind('upper').name,
      left: asTicks(Math.max(left, 0)),
      width: asTicks(Math.max(width, 0)),
      ends: { left: endAt('left'), right: endAt('right') },
      ...(blind ? { blind } : {}),
    });
    if (width < narrowest || width > widest) {
      error(
        'RUN_UPPER_WIDTH',
        'W2',
        `${id} ${cabinetKind('upper').name}, over the ${under}, comes out ${text(Math.max(width, 0))} wide, which is too ${width < narrowest ? `narrow to build (the least is ${text(narrowest)})` : `wide to build (the most is ${text(widest)})`}.`,
        corner?.role === 'front' && i === cornerIndex ? 'Make the cabinet under it narrower, or leave the space above it empty. At the corner, this upper is wider than the cabinet under it.' : 'Leave the space above it empty, or change the width underneath.',
        [`uppers.above.${item.id}`, `items.${item.id}.width`],
      );
    }
    return { itemId: item.id, under, choice, proposed, reason, upperId: id };
  });
  if (issues.some((i) => i.severity === 'error')) return blocked(inputs, issues);
  if (anyUpper && upperTop > ceiling.value) {
    issues.push({
      code: 'UPPERS_ABOVE_CEILING',
      ruleId: 'W3',
      severity: 'warning',
      partIds: [],
      inputPaths: ['uppers.height', 'uppers.aboveCounter', 'uppers.ceiling'],
      explanation: `The top of the upper cabinets comes out ${text(upperTop)} above the floor, which is higher than the ceiling at ${text(ceiling.value)}.`,
      suggestedFix: 'Make the upper cabinets shorter, hang them lower, or correct the ceiling height.',
    });
  }
  const units: Unit[] = [...cabinets, ...uppers];
  const asUpper = (id: string): VanityDesign => ({
    ...asCabinet('upper', id),
    depth: run.uppers?.depth ?? upperRow.depth,
    height: run.uppers?.height ?? upperRow.height,
  });

  // --- R3: each cabinet, planned by the usual rules -------------------------
  const plans = units.map((cabinet) =>
    generatePlan(cabinet.row === 'upper' ? asUpper(cabinet.itemId) : asCabinet(cabinet.kind, cabinet.itemId), defaults, catalog, {
      width: cabinet.blind ? asTicks(cabinet.width - cabinet.blind.by) : cabinet.width,
      ends: cabinet.ends,
      ...(cabinet.blind ? { blind: cabinet.blind } : {}),
      idPrefix: `${cabinet.id}-` as `${'C' | 'U'}${string}`,
      sharedPlatform: true,
    }),
  );
  const seenIssue = new Set<string>();
  plans.forEach((plan, c) => {
    for (const issue of plan.issues) {
      // A note about a missing tool applies to the whole run; say it once.
      const whole = issue.code === 'TOOL_TO_BUY_OR_BORROW';
      const id = whole ? `${issue.code}|${issue.inputPaths.join()}` : `${c}|${issue.code}|${issue.explanation}`;
      if (seenIssue.has(id)) continue;
      seenIssue.add(id);
      issues.push(whole ? issue : { ...issue, explanation: `${units[c]!.id} ${units[c]!.name}: ${issue.explanation}` });
    }
  });
  if (plans.some((p) => !p.canGeneratePlan)) return blocked(inputs, issues);

  // A base cabinet is placed from the floor already; an upper is lifted to its height on the wall (W3).
  // A cabinet measures from the left end of its frame, which a corner cabinet's box can run past (N3).
  const originOf = (unit: Unit) => unit.left + (unit.blind?.side === 'left' ? unit.blind.by : 0);
  const shift = <T extends { readonly x: Ticks; readonly y: Ticks }>(thing: T, unit: Unit): T => ({ ...thing, x: asTicks(thing.x + originOf(unit)), y: asTicks(thing.y + (unit.row === 'upper' ? unit.bottom : 0)) });
  const parts: Part[] = plans.flatMap((plan, c) => plan.parts.map((p) => ({ ...p, assembly: `${units[c]!.id} ${units[c]!.name}: ${p.assembly}` })));
  const placements: Placement[] = plans.flatMap((plan, c) => plan.placements.map((p) => shift(p, units[c]!)));
  const openings = plans.flatMap((plan, c) =>
    plan.openings.map((o) => ({
      ...o,
      id: `${units[c]!.id}-${o.id}`,
      bayId: `${units[c]!.id}-${o.bayId}`,
      label: `${units[c]!.id} ${o.label.charAt(0).toLowerCase()}${o.label.slice(1)}`,
      left: asTicks(o.left + originOf(units[c]!)),
      frontLeft: asTicks(o.frontLeft + originOf(units[c]!)),
      ...(wall.wall === 2 ? { wall: 2 as const } : {}),
      top: asTicks(o.top + units[c]!.fromTop),
      frontTop: asTicks(o.frontTop + units[c]!.fromTop),
    })),
  );

  // --- R4: one platform and toe kick for each stretch ----------------------
  const runParts: Part[] = [];
  const runPlacements: Placement[] = [];
  const addPart = (name: string, material: BoardValues, lengthD: Derivation, widthD: Derivation, quantity: number, boxes: readonly (readonly [number, number, number, number, number, number])[], look?: { readonly colorRole: Part['colorRole']; readonly assembly: string }): PartId => {
    const id = `R-${String(runParts.length + 1 + wall.first.runPart).padStart(2, '0')}` as PartId;
    const thickness = deriveByRule('M1', `actual thickness of the ${material.stock.name}`, [material.thickness], material.thickness.value);
    const derivations = [thickness, lengthD, widthD];
    runParts.push({
      id,
      name,
      colorRole: look?.colorRole ?? 'platform',
      assembly: look?.assembly ?? 'The whole run: platform and toe kick',
      materialId: material.stock.id,
      thickness: thickness.result,
      length: lengthD.result,
      width: widthD.result,
      grain: 'alongLength',
      quantity,
      derivation: { thickness, length: lengthD, width: widthD },
      status: statusOf(derivations),
      needsCheck: needsCheck(derivations),
    });
    boxes.forEach((b, i) => runPlacements.push({ partId: id, copy: i + 1, x: asTicks(b[0]), y: asTicks(b[1]), z: asTicks(b[2]), sizeX: asTicks(b[3]), sizeY: asTicks(b[4]), sizeZ: asTicks(b[5]) }));
    return id;
  };
  const platform = buildPlatforms(r, cabinets, addPart, corner?.role === 'front' ? { side: corner.side, length } : undefined);

  // --- N4, N7: a gap strip where this wall starts in front of the other ------
  let baseStrip: PartId | undefined;
  let upperStrip: PartId | undefined;
  if (corner?.role === 'front') {
    const g = gap!.value;
    const thick = stripBoard!.thickness.value;
    const look = { colorRole: 'faceFrame', assembly: 'The corner' } as const;
    // In line with the face frames, between this wall's first cabinet and the front of the other wall's.
    const at = (depth: number) => (corner.side === 'left' ? depth : length - depth - g);
    const asSold = deriveByRule('N4', 'width of the board as sold', [gap!], gap!.value);
    baseStrip = addPart('Gap strip', stripBoard!, deriveByRule('N4', 'height of the face frame', [r.H], r.H.value), asSold, 1, [[at(r.D.value), baseBottom, r.D.value - thick, g, r.H.value, thick]], look);
    if (corner.otherHasUpper && aboveOf[cornerIndex]!.choice === 'upper') {
      upperStrip = addPart('Gap strip (upper cabinets)', stripBoard!, deriveByRule('N7', 'height of the upper cabinets', [upperHeight], upperHeight.value), asSold, 1, [[at(upperDepth.value), upperBottom.result, upperDepth.value - thick, g, upperHeight.value, thick]], look);
    }
  }

  // --- R6: one set of cutting diagrams and one shopping list ---------------
  const allParts = [...parts, ...runParts];
  const methods = plans[0]!.methods!;
  const cutting = { kerf: r.kerf.value, keepOffcutsFrom: r.keepOffcutsFrom.value, allowLongCutsFirst: methods.sheetSaw === 'trackSaw', sheetSaw: methods.sheetSaw, boardSaw: methods.boardSaw };
  // With a corner, both walls are cut together afterwards (N8).
  const diagrams = corner ? [] : cutDiagrams(allParts, catalog, cutting);

  const hardware = new Map<string, HardwareLine>();
  for (const line of plans.flatMap((p) => p.hardware)) {
    const id = `${line.hardwareId}|${line.length?.result ?? ''}`;
    const known = hardware.get(id);
    hardware.set(id, known ? { ...known, quantity: known.quantity + line.quantity } : line);
  }
  const tools = new Map<string, PlanTool>();
  for (const tool of plans.flatMap((p) => p.tools)) if (!tools.has(tool.id)) tools.set(tool.id, tool);

  // --- R7: the build, one cabinet at a time, then the run ------------------
  const allPlacements = [...placements, ...runPlacements];
  const placeOf = new Map(allPlacements.map((p) => [key(p), p]));
  const steps: Omit<Step, 'number'>[] = [];
  const later: Omit<Step, 'number'>[] = [];
  const installed: PieceRef[][] = [];
  const phaseOf = new Map<string, Phase>();
  let installing: Phase = 'installBase';
  plans.forEach((plan, c) => {
    const cabinet = units[c]!;
    const inPlace = new Map<string, PieceRef>();
    for (const step of plan.steps) {
      const mine: Omit<Step, 'number'> = {
        ...step,
        id: `${cabinet.id}:${step.id}`,
        cabinet: { id: cabinet.id, name: cabinet.name },
        glue: step.glue.map((g) => shift(g, cabinet)),
        screws: step.screws.map((p) => shift(p, cabinet)),
      };
      const afterInstall = step.chapter === 'drawers' || step.chapter === 'doors';
      // The run sets cabinets in place itself; a cabinet keeps only its pipe openings from that chapter.
      if (step.chapter === 'install' && step.id !== 'plumbing') continue;
      phaseOf.set(mine.id, afterInstall ? 'fit' : cabinet.row === 'base' ? 'buildBase' : 'buildUpper');
      if (afterInstall) later.push(mine);
      else {
        steps.push(mine);
        if (step.scene === 'cabinet') step.pieces.forEach((piece) => inPlace.set(key(piece), { partId: piece.partId, copy: piece.copy }));
      }
    }
    installed.push([...inPlace.values()]);
  });

  const supplyCounts = new Map<string, number>();
  for (const supply of plans.flatMap((p) => p.supplies)) if (supply.quantity) supplyCounts.set(supply.id, (supplyCounts.get(supply.id) ?? 0) + supply.quantity);
  const screwRule = { endInset: r.screwEndInset.value, spacing: r.screwSpacing.value };
  const nailer = methods.nailing === 'bradNailer' ? 'bradNailer' : 'hammer';
  const copiesOf = (ids: readonly PartId[]): PieceRef[] => runPlacements.filter((p) => ids.includes(p.partId)).map((p) => ({ partId: p.partId, copy: p.copy }));
  const still = (refs: readonly PieceRef[]): StepPiece[] => refs.map((ref) => ({ ...ref, from: 'none' }));
  const screwsBetween = (a: readonly PieceRef[], b: readonly PieceRef[]): Point3[] =>
    a.flatMap((one) =>
      b.flatMap((other) => {
        const patch = contact(placeOf.get(key(one))!, placeOf.get(key(other))!);
        return patch ? screwsAlong(patch, screwRule) : [];
      }),
    );
  const runStep = (step: Pick<Step, 'id' | 'templateId' | 'pieces'> & Partial<Step>) => {
    phaseOf.set(step.id, installing);
    steps.push({
      chapter: 'install',
      scene: 'cabinet',
      view: 'front',
      values: {},
      partIds: [...new Set(step.pieces.map((p) => p.partId))],
      earlierPieces: [],
      repeat: 1,
      joints: [],
      glue: [],
      screws: [],
      fasteners: [],
      hardware: [],
      tools: ['measuring'],
      ...step,
    });
  };
  const count = (supplyId: string, points: readonly Point3[]) => {
    if (points.length > 0) supplyCounts.set(supplyId, (supplyCounts.get(supplyId) ?? 0) + points.length);
    return points.length > 0 ? [{ supplyId, quantity: points.length }] : [];
  };

  platform.sections.forEach((section, s) => {
    const rails = copiesOf([section.rails]);
    const supports = copiesOf([section.supports]);
    const screws = screwsBetween(rails, supports);
    runStep({
      id: `${RUN}:platform-${s + 1}`,
      templateId: 'runPlatform',
      scene: 'bench',
      values: { supports: supports.length, spacing: r.supportSpacing.value, section: s + 1, sections: platform.sections.length },
      pieces: [...still(rails), ...supports.map((ref): StepPiece => ({ ...ref, from: 'above' }))],
      screws,
      fasteners: count('construction-screws', screws),
      tools: ['measuring', 'drill'],
    });
  });
  const platformPieces = copiesOf(platform.sections.flatMap((s) => [s.rails, s.supports]));
  runStep({ id: `${RUN}:place-platforms`, templateId: 'setPlatform', values: { height: r.lumber.width.value }, pieces: still(platformPieces), tools: ['measuring', 'drill'] });

  const endStiles = (c: number) => installed[c]!.filter((ref) => parts.find((p) => p.id === ref.partId)!.name === 'Vertical frame piece (end)');
  // N8: at a corner the cabinets go in starting from the corner; otherwise from the left.
  const fromRight = corner?.side === 'right';
  const stripStep = (id: string, strip: PartId, against: number, earlier: readonly PieceRef[], upper: boolean) => {
    const pieces = copiesOf([strip]);
    const screws = screwsBetween(pieces, endStiles(against));
    runStep({ id, templateId: 'runGapStrip', values: { upper: upper ? 1 : 0 }, pieces: pieces.map((ref): StepPiece => ({ ...ref, from: 'front' })), earlierPieces: earlier, screws, fasteners: count('joining-screws', screws), tools: ['measuring', 'clamps', 'drill'] });
  };
  const setOrder = cabinets.map((_, c) => c);
  if (fromRight) setOrder.reverse();
  setOrder.forEach((c, k) => {
    const cabinet = cabinets[c]!;
    const joins = k > 0 && (fromRight ? cabinet.ends.right : cabinet.ends.left) === 'joined';
    const screws = joins ? screwsBetween(endStiles(fromRight ? c + 1 : c - 1), endStiles(c)) : [];
    const earlier = [...platformPieces, ...setOrder.slice(0, k).flatMap((done) => installed[done]!)];
    runStep({
      id: `${RUN}:set-${cabinet.id}`,
      templateId: 'runSetCabinet',
      values: { cabinet: numberOf(cabinet.id), joins: joins ? 1 : 0 },
      pieces: installed[c]!.map((ref): StepPiece => ({ ...ref, from: 'above' })),
      earlierPieces: earlier,
      screws,
      fasteners: count('joining-screws', screws),
      tools: joins ? ['measuring', 'clamps', 'drill'] : ['measuring'],
    });
    if (k === 0 && baseStrip) stripStep(`${RUN}:gap-strip`, baseStrip, c, [...earlier, ...installed[c]!], false);
  });
  const isStrip = (ref: PieceRef) => parts.find((p) => p.id === ref.partId)!.name.includes('ounting strip');
  const everything = [...platformPieces, ...installed.slice(0, cabinets.length).flat(), ...(baseStrip ? copiesOf([baseStrip]) : [])];
  const strips = installed.slice(0, cabinets.length).flat().filter(isStrip);
  runStep({ id: `${RUN}:wall`, templateId: 'wallScrews', pieces: still(strips), earlierPieces: everything.filter((ref) => !strips.some((s) => key(s) === key(ref))), tools: ['measuring', 'drill'] });
  const kick = copiesOf(platform.toeKick);
  const kickPlaces = kick.map((ref) => ({ ref, place: placeOf.get(key(ref))! }));
  runStep({
    id: `${RUN}:toe-kick`,
    templateId: 'runToeKick',
    values: { toeSpace: r.toeSpace.value, pieces: kick.length },
    // A return runs front to back and arrives from its end of the run; a front piece arrives from the front.
    pieces: kickPlaces.map(({ ref, place }): StepPiece => ({ ...ref, from: place.sizeZ > place.sizeX ? (place.x * 2 < length ? 'left' : 'right') : 'front' })),
    earlierPieces: everything,
    glue: kick.flatMap((one) => platformPieces.flatMap((other) => contact(placeOf.get(key(one))!, placeOf.get(key(other))!) ?? [])),
    tools: ['glue', nailer],
  });

  // --- W6: one ledge for the row, then each upper hung and screwed to the last
  installing = 'installUpper';
  let hungPieces: PieceRef[] = [];
  if (uppers.length > 0) {
    const piecesOf = (u: number) => installed[cabinets.length + u]!;
    const upperStrips = uppers.flatMap((_, u) => piecesOf(u).filter(isStrip));
    const below = [...everything, ...kick];
    const cornerIndexOfUppers = uppers.findIndex((u) => u.itemId === run.items[cornerIndex]?.id);
    runStep({
      id: `${RUN}:ledger`,
      templateId: 'runLedger',
      values: { height: upperBottom.result, gap: aboveCounter.value, uppers: uppers.length },
      pieces: still(upperStrips),
      earlierPieces: below,
      tools: ['measuring', 'drill'],
    });
    const hangOrder = uppers.map((_, u) => u);
    if (fromRight) hangOrder.reverse();
    hangOrder.forEach((u, k) => {
      const upper = uppers[u]!;
      const joins = k > 0 && (fromRight ? upper.ends.right : upper.ends.left) === 'joined';
      const screws = joins ? screwsBetween(endStiles(cabinets.length + (fromRight ? u + 1 : u - 1)), endStiles(cabinets.length + u)) : [];
      const earlier = [...below, ...hangOrder.slice(0, k).flatMap((done) => piecesOf(done))];
      runStep({
        id: `${RUN}:hang-${upper.id}`,
        templateId: 'runHangUpper',
        values: { cabinet: numberOf(upper.id), joins: joins ? 1 : 0 },
        pieces: piecesOf(u).map((ref): StepPiece => ({ ...ref, from: 'front' })),
        earlierPieces: earlier,
        screws,
        fasteners: count('joining-screws', screws),
        tools: joins ? ['measuring', 'clamps', 'drill'] : ['measuring', 'drill'],
      });
      if (upperStrip && u === cornerIndexOfUppers) stripStep(`${RUN}:upper-gap-strip`, upperStrip, cabinets.length + u, [...earlier, ...piecesOf(u)], true);
    });
    const hung = [...uppers.flatMap((_, u) => piecesOf(u)), ...(upperStrip ? copiesOf([upperStrip]) : [])];
    hungPieces = hung;
    runStep({
      id: `${RUN}:upper-wall`,
      templateId: 'runUpperWall',
      values: { uppers: uppers.length },
      pieces: still(upperStrips),
      earlierPieces: [...below, ...hung.filter((ref) => !upperStrips.some((s) => key(s) === key(ref)))],
      tools: ['measuring', 'drill'],
    });
  }
  steps.push(...later);

  const supplies: SupplyLine[] = catalog.supplies.map((supply) => {
    const quantity = supplyCounts.get(supply.id);
    return quantity === undefined ? supply : { ...supply, quantity };
  });

  const shown = ({ ends: _ends, blind, ...cabinet }: Unit): RunCabinet => ({
    ...cabinet,
    ...(blind ? { hidden: { left: asTicks(blind.side === 'left' ? cabinet.left : cabinet.left + cabinet.width - blind.by), width: blind.by } } : {}),
  });
  const first = plans[0]!.overall!;
  return {
    inputs,
    issues,
    canGeneratePlan: true,
    run: { length, cabinets: cabinets.map(shown), uppers: uppers.map(shown), spaces, above, pictureHeight, ...(uppers.length > 0 ? { upperBottom } : {}) },
    overall: { ...first, frameWidth: length },
    openings,
    parts: allParts,
    cutDiagrams: diagrams,
    materials: shoppingList(diagrams, allParts, catalog),
    hardware: [...hardware.values()],
    methods,
    tools: [...tools.values()],
    supplies,
    placements: allPlacements,
    steps: steps.map((step, i) => ({ ...step, ...(wall.wall === 2 ? { wall: 2 as const } : {}), number: i + 1 })),
    extras: { phaseOf, installedBase: [...everything, ...kick], installedUpper: hungPieces, depth: r.D.value, cutting },
  };
}

/**
 * The engine's entry point for a run. One wall is planned as it stands; with a
 * corner (section N), each wall is planned by the same rules and the two are
 * put together in one room, with one set of lists and one build.
 */
export function generateRun(run: RunDesign, defaults: VanityOptions, catalog: MaterialCatalog): PlanResult {
  const start = { cabinet: 0, upper: 0, runPart: 0 };
  if (!run.corner) {
    const { extras: _extras, ...plan } = planWall(run, defaults, catalog, { wall: 1, first: start });
    return plan;
  }
  const c = run.corner;
  // Facing the second wall, the corner is on the other hand.
  const side2 = c.side === 'right' ? 'left' : 'right';
  const far2 = c.side;

  // N3: the app adds the corner cabinet to the first wall itself.
  const cornerItem: RunItem = { id: CORNER_ITEM, kind: 'cabinet', cabinet: 'cornerBase', width: c.cabinetWidth ?? cornerDefaults.cabinetWidth };
  const run1: RunDesign = { ...run, items: c.side === 'right' ? [...run.items, cornerItem] : [cornerItem, ...run.items] };
  const end2 = c.end === undefined ? defaultChoice(cornerDefaults.end, 'Open, until you say there is a wall.') : userChoice(c.end);
  const { above: _wallOneAbove, ...upperSizes } = run.uppers ?? {};
  const run2: RunDesign = {
    ...run,
    length: c.length,
    items: c.items,
    uppers: { ...upperSizes, ...(c.above ? { above: c.above } : {}) },
    overrides: { ...run.overrides, ends: { ...run.overrides.ends, [far2]: end2 } },
  };
  const atCorner2 = c.items[side2 === 'left' ? 0 : c.items.length - 1];
  const upperOn2 = atCorner2 !== undefined && aboveFor(atCorner2, run2.uppers).choice === 'upper';
  const upperOn1 = aboveFor(cornerItem, run.uppers).choice === 'upper';

  const wall1 = planWall(run1, defaults, catalog, { wall: 1, first: start, corner: { side: c.side, role: 'into', otherHasUpper: upperOn2 } });
  const wall2 = planWall(run2, defaults, catalog, {
    wall: 2,
    first: { cabinet: wall1.run?.cabinets.length ?? 0, upper: wall1.run?.uppers.length ?? 0, runPart: wall1.parts.filter((p) => p.id.startsWith('R-')).length },
    corner: { side: side2, role: 'front', otherHasUpper: upperOn1 },
  });

  // --- One list of values and problems, saying which wall each belongs to ---
  const onSecond = (path: string) => (path === 'length' ? 'corner.length' : path === `ends.${far2}` ? 'corner.end' : path.startsWith('items.') ? `corner.${path}` : path.startsWith('uppers.above.') ? `corner.above.${path.slice('uppers.above.'.length)}` : path);
  const inputs: ResolvedInput[] = [...wall1.inputs];
  for (const input of wall2.inputs) {
    const path = onSecond(input.path);
    if (path === input.path) {
      // Shared by both walls: listed once.
      if (!inputs.some((i) => i.path === path)) inputs.push(input);
    } else inputs.push({ ...input, path, label: `second wall: ${input.label}` });
  }
  const issues: ValidationIssue[] = [...wall1.issues];
  for (const issue of wall2.issues) {
    if (issues.some((i) => i.code === issue.code && i.explanation === issue.explanation)) continue;
    issues.push(issue.code === 'TOOL_TO_BUY_OR_BORROW' ? issue : { ...issue, inputPaths: issue.inputPaths.map(onSecond), explanation: `Second wall: ${issue.explanation}` });
  }
  if (!wall1.canGeneratePlan || !wall2.canGeneratePlan || !wall1.extras || !wall2.extras || !wall1.run || !wall2.run) return blocked(inputs, issues);

  // --- N8: both walls in one room -------------------------------------------
  // x runs along the first wall and z out from it. Facing the second wall, its
  // own x runs along it and its z out from it; these turn one into the other.
  const L1 = wall1.run.length;
  const L2 = wall2.run.length;
  type Flat = { readonly x: Ticks; readonly z: Ticks; readonly sizeX: Ticks; readonly sizeZ: Ticks };
  const toRoom = <T extends Flat>(p: T): T =>
    c.side === 'right' ? { ...p, x: asTicks(L1 - p.z - p.sizeZ), z: p.x, sizeX: p.sizeZ, sizeZ: p.sizeX } : { ...p, x: p.z, z: asTicks(L2 - p.x - p.sizeX), sizeX: p.sizeZ, sizeZ: p.sizeX };
  const toSecond = <T extends Flat>(p: T): T =>
    c.side === 'right' ? { ...p, x: p.z, z: asTicks(L1 - p.x - p.sizeX), sizeX: p.sizeZ, sizeZ: p.sizeX } : { ...p, x: asTicks(L2 - p.z - p.sizeZ), z: p.x, sizeX: p.sizeZ, sizeZ: p.sizeX };

  const parts = [...wall1.parts, ...wall2.parts];
  const placements = [...wall1.placements, ...wall2.placements.map(toRoom)];
  const depth = wall1.extras.depth;
  const floor = (label: string, kind: FloorBox['kind'], left: Ticks, width: Ticks): FloorBox => ({ label, kind, x: left, z: asTicks(0), sizeX: width, sizeZ: depth });
  const boxes: FloorBox[] = [
    ...wall1.run.cabinets.map((cab) => floor(cab.id, 'cabinet', cab.left, cab.width)),
    ...wall1.run.spaces.map((sp) => floor(sp.name, 'space', sp.left, sp.width)),
    ...wall2.run.cabinets.map((cab) => toRoom(floor(cab.id, 'cabinet', cab.left, cab.width))),
    ...wall2.run.spaces.map((sp) => toRoom(floor(sp.name, 'space', sp.left, sp.width))),
  ];

  // --- R6, W7: one set of cutting diagrams, one shopping list ---------------
  const diagrams = cutDiagrams(parts, catalog, wall1.extras.cutting);
  const hardware = new Map<string, HardwareLine>();
  for (const line of [...wall1.hardware, ...wall2.hardware]) {
    const id = `${line.hardwareId}|${line.length?.result ?? ''}`;
    const known = hardware.get(id);
    hardware.set(id, known ? { ...known, quantity: known.quantity + line.quantity } : line);
  }
  const tools = new Map<string, PlanTool>();
  for (const tool of [...wall1.tools, ...wall2.tools]) if (!tools.has(tool.id)) tools.set(tool.id, tool);
  const supplies: SupplyLine[] = wall1.supplies.map((supply) => {
    const other = wall2.supplies.find((x) => x.id === supply.id)?.quantity;
    return supply.quantity === undefined && other === undefined ? supply : { ...supply, quantity: (supply.quantity ?? 0) + (other ?? 0) };
  });

  // --- N8: build everything, then set each wall from the corner --------------
  const phased = (wallPlan: WallPlan, phase: Phase, alreadyThere: readonly PieceRef[] = []) =>
    wallPlan.steps.filter((step) => wallPlan.extras!.phaseOf.get(step.id) === phase).map((step) => (alreadyThere.length > 0 ? { ...step, earlierPieces: [...alreadyThere, ...step.earlierPieces] } : step));
  const steps = [
    ...phased(wall1, 'buildBase'),
    ...phased(wall2, 'buildBase'),
    ...phased(wall1, 'buildUpper'),
    ...phased(wall2, 'buildUpper'),
    ...phased(wall1, 'installBase'),
    ...phased(wall2, 'installBase', wall1.extras.installedBase),
    ...phased(wall1, 'installUpper', wall2.extras.installedBase),
    ...phased(wall2, 'installUpper', [...wall1.extras.installedBase, ...wall1.extras.installedUpper]),
    ...phased(wall1, 'fit'),
    ...phased(wall2, 'fit'),
  ];

  return {
    inputs,
    issues,
    canGeneratePlan: true,
    run: {
      ...wall1.run,
      second: { side: c.side, length: L2, cabinets: wall2.run.cabinets, uppers: wall2.run.uppers, spaces: wall2.run.spaces, above: wall2.run.above, placements: [...wall1.placements.map(toSecond), ...wall2.placements] },
      fromAbove: { width: L1, depth: asTicks(Math.max(L2, depth)), boxes },
    },
    ...(wall1.overall ? { overall: wall1.overall } : {}),
    openings: [...wall1.openings, ...wall2.openings],
    parts,
    cutDiagrams: diagrams,
    materials: shoppingList(diagrams, parts, catalog),
    hardware: [...hardware.values()],
    ...(wall1.methods ? { methods: wall1.methods } : {}),
    tools: [...tools.values()],
    supplies,
    placements,
    steps: steps.map((step, i) => ({ ...step, number: i + 1 })),
  };
}

type AddPart = (name: string, material: BoardValues, length: Derivation, width: Derivation, quantity: number, boxes: readonly (readonly [number, number, number, number, number, number])[], look?: { readonly colorRole: Part['colorRole']; readonly assembly: string }) => PartId;

interface PlatformSection {
  readonly rails: PartId;
  readonly supports: PartId;
}

/**
 * R4: one platform under each unbroken stretch of cabinets, built in
 * sections no longer than a board, with the toe kick along its front and on
 * any end that can be seen. The same rules as a single cabinet's platform
 * (P1 to P5), applied to the stretch.
 */
function buildPlatforms(r: Resolved, cabinets: readonly (RunCabinet & { readonly ends: { left: EndCondition; right: EndCondition } })[], add: AddPart, corner?: { readonly side: 'left' | 'right'; readonly length: number }): { sections: PlatformSection[]; toeKick: PartId[] } {
  const sections: PlatformSection[] = [];
  const toeKick: PartId[] = [];
  const Lt = r.lumber.thickness.value;
  const Lw = r.lumber.width.value;
  const tk = r.toeKickBoard.thickness.value;
  const setback = r.toeSpace.value + tk;
  const depth = r.D.value - setback; // P1
  const overhang = (end: EndCondition) => (end === 'wall' ? r.wallOverhang.value : 0);
  const longestBoard = (board: BoardValues) => Math.max(...board.stock.stockLengths.map(lengthOf));
  // A section, and the toe kick piece in front of it, must each come out of one board.
  const longest = Math.min(longestBoard(r.lumber), longestBoard(r.toeKickBoard) - 2 * tk);
  const inputs: Val[] = [r.D, r.toeSpace, r.toeKickBoard.thickness, r.lumber.thickness];
  const height = deriveByRule('P1', 'width of a 2x4 standing on edge', [r.lumber.width], r.lumber.width.value);

  // Split the cabinets into stretches: a stretch ends where a cabinet does not meet another.
  const stretches: (typeof cabinets)[] = [];
  for (const cabinet of cabinets) {
    if (cabinet.ends.left === 'joined' && stretches.length > 0) stretches[stretches.length - 1] = [...stretches.at(-1)!, cabinet];
    else stretches.push([cabinet]);
  }

  stretches.forEach((stretch, n) => {
    const firstCabinet = stretch[0]!;
    const lastCabinet = stretch.at(-1)!;
    const seenLeft = firstCabinet.ends.left === 'exposed';
    const seenRight = lastCabinet.ends.right === 'exposed';
    // N6: at a corner this platform runs on across the gap to meet the other wall's toe kick.
    const meet = depth + tk;
    const start = corner?.side === 'left' && n === 0 ? meet : firstCabinet.left + overhang(firstCabinet.ends.left) + (seenLeft ? setback : 0);
    const end = corner?.side === 'right' && n === stretches.length - 1 ? corner.length - meet : lastCabinet.left + lastCabinet.width - overhang(lastCabinet.ends.right) - (seenRight ? setback : 0);
    // Break only where two cabinets meet, taking as many cabinets as fit on one board.
    const joints = stretch.slice(1).map((c) => c.left);
    const breaks: number[] = [start];
    for (const [i, joint] of joints.entries()) {
      const next = joints[i + 1] ?? end;
      if (next - breaks.at(-1)! > longest) breaks.push(joint);
    }
    breaks.push(end);
    const where = stretches.length > 1 ? `, stretch ${n + 1}` : '';
    for (let s = 0; s < breaks.length - 1; s += 1) {
      const [from, to] = [breaks[s]!, breaks[s + 1]!];
      const width = to - from;
      const piece = breaks.length > 2 ? `${where}, section ${s + 1}` : where;
      const label = piece ? ` (${piece.replace(/^, /, '')})` : '';
      const rails = add(
        `Platform rail${label}`,
        r.lumber,
        deriveByRule('R4', 'the stretch of cabinets, less the toe space and toe kick on any end that can be seen', inputs, asTicks(width)),
        height,
        2,
        [
          [from, 0, 0, width, Lw, Lt],
          [from, 0, depth - Lt, width, Lw, Lt],
        ],
      );
      // P3: a support at each end, and one every `spacing` from the left unless it would crowd the last.
      const inner = Math.max(0, Math.floor((2 * width - 5 * Lt) / (2 * r.supportSpacing.value)));
      const xs = [from, ...Array.from({ length: inner }, (_, k) => from + (k + 1) * r.supportSpacing.value - Math.floor(Lt / 2)), to - Lt];
      const supports = add(
        `Platform cross support${label}`,
        r.lumber,
        deriveByRule('P3', 'platform depth minus 2 x the thickness of a 2x4', inputs, asTicks(depth - 2 * Lt)),
        height,
        xs.length,
        xs.map((x) => [x, 0, Lt, Lt, Lw, depth - 2 * Lt] as const),
      );
      sections.push({ rails, supports });
      // P5: the front piece covers the end of a return where there is one.
      const frontFrom = from - (s === 0 && seenLeft ? tk : 0);
      const frontTo = to + (s === breaks.length - 2 && seenRight ? tk : 0);
      toeKick.push(
        add(`Toe kick, front${label}`, r.toeKickBoard, deriveByRule('P5', 'platform section plus toe kick thickness on an end that can be seen', inputs, asTicks(frontTo - frontFrom)), deriveByRule('P5', 'platform height', [r.lumber.width], r.lumber.width.value), 1, [
          [frontFrom, 0, depth, frontTo - frontFrom, Lw, tk],
        ]),
      );
    }
    const returns = [...(seenLeft ? [start - tk] : []), ...(seenRight ? [end] : [])];
    if (returns.length > 0) {
      toeKick.push(
        add(`Toe kick, end return${where ? ` (${where.replace(/^, /, '')})` : ''}`, r.toeKickBoard, deriveByRule('P5', 'platform depth', inputs, asTicks(depth)), deriveByRule('P5', 'platform height', [r.lumber.width], r.lumber.width.value), returns.length, returns.map((x) => [x, 0, 0, tk, Lw, depth] as const)),
      );
    }
  });
  return { sections, toeKick };
}
