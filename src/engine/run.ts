/**
 * A run of cabinets along one wall (docs/RULES.md, section R).
 *
 * The run shares its length out between its cabinets, has each cabinet
 * planned by the usual rules, then adds what belongs to the run as a whole:
 * one platform and toe kick per stretch, shared cutting diagrams, one
 * shopping list, and the steps that set the cabinets in place.
 */
import { cutDiagrams, shoppingList } from './cutting';
import { cabinetKind } from './defaults/cabinets';
import { applianceKind, runLimits } from './defaults/run';
import { deriveByRule, needsCheck, statusOf, type Val } from './derive';
import { generatePlan } from './generatePlan';
import { contact, screwsAlong } from './geometry';
import { effectiveOptions, resolveVanity, type BoardValues, type Resolved } from './resolve';
import type {
  Derivation,
  EndCondition,
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
  RunCabinet,
  RunDesign,
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

export function generateRun(run: RunDesign, defaults: VanityOptions, catalog: MaterialCatalog): PlanResult {
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
  const left = length - fixedTotal;
  const mark = lengthOf({ entered: '1/16', unit: 'in', status: 'confirmed', origin: 'appDefault' });
  const share = sharers > 0 ? Math.floor(left / sharers / mark) * mark : 0;
  const runPicture = (widths: readonly (number | undefined)[]): SumDiagram => ({
    direction: 'horizontal',
    totalLabel: 'length of the run',
    total: length,
    segments: run.items.flatMap((item, i) => (widths[i] === undefined ? [] : [{ label: item.kind === 'cabinet' ? cabinetKind(item.cabinet).name : applianceKind(item.appliance).name, length: asTicks(widths[i]!), colorRole: item.kind === 'cabinet' ? ('faceFrame' as const) : ('support' as const) }])),
    difference: asTicks(length - widths.reduce<number>((total, w) => total + (w ?? 0), 0)),
  });
  const itemPaths = ['length', ...run.items.map((item) => `items.${item.id}.width`)];
  if (sharers === 0 && left !== 0) {
    error(
      'RUN_WIDTH_MISMATCH',
      'R2',
      left > 0
        ? `The cabinets and spaces add up to ${text(fixedTotal)}, but the run is ${text(length)}. That leaves ${text(left)} unexplained.`
        : `The cabinets and spaces add up to ${text(fixedTotal)}, which is ${text(-left)} more than the run of ${text(length)}.`,
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

  // --- R5: where everything sits, and its number ---------------------------
  const cabinets: (RunCabinet & { readonly ends: { left: EndCondition; right: EndCondition } })[] = [];
  const spaces: RunSpace[] = [];
  let x = 0;
  run.items.forEach((item, i) => {
    const width = widths[i]!;
    const fixed = given[i] !== undefined;
    const label = item.kind === 'cabinet' ? cabinetKind(item.cabinet).name : applianceKind(item.appliance).name;
    if (item.kind === 'appliance') {
      spaces.push({ itemId: item.id, appliance: item.appliance, name: label, left: asTicks(x), width: asTicks(width) });
    } else {
      const neighbour = (other: (typeof run.items)[number] | undefined, runEnd: EndCondition): EndCondition => (other === undefined ? runEnd : other.kind === 'appliance' ? 'exposed' : 'joined');
      const id = `C${String(cabinets.length + 1).padStart(2, '0')}`;
      cabinets.push({
        id,
        itemId: item.id,
        kind: item.cabinet,
        name: label,
        left: asTicks(Math.max(x, 0)),
        width: asTicks(Math.max(width, 0)),
        ends: { left: neighbour(run.items[i - 1], runEnds.left.value), right: neighbour(run.items[i + 1], runEnds.right.value) },
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
      note: item.width ? 'You set this width.' : fixed ? (standard?.note ?? 'A common sink base width.') : 'Shares the run with the other cabinets.',
    });
    x += width;
  });
  if (issues.some((i) => i.severity === 'error')) return blocked(inputs, issues);

  // --- R3: each cabinet, planned by the usual rules -------------------------
  const plans = cabinets.map((cabinet) =>
    generatePlan(asCabinet(cabinet.kind, cabinet.itemId), defaults, catalog, {
      width: cabinet.width,
      ends: cabinet.ends,
      idPrefix: `${cabinet.id}-` as `C${string}`,
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
      issues.push(whole ? issue : { ...issue, explanation: `${cabinets[c]!.id} ${cabinets[c]!.name}: ${issue.explanation}` });
    }
  });
  if (plans.some((p) => !p.canGeneratePlan)) return blocked(inputs, issues);

  const shift = <T extends { readonly x: Ticks }>(thing: T, by: number): T => ({ ...thing, x: asTicks(thing.x + by) });
  const parts: Part[] = plans.flatMap((plan, c) => plan.parts.map((p) => ({ ...p, assembly: `${cabinets[c]!.id} ${cabinets[c]!.name}: ${p.assembly}` })));
  const placements: Placement[] = plans.flatMap((plan, c) => plan.placements.map((p) => shift(p, cabinets[c]!.left)));
  const openings = plans.flatMap((plan, c) =>
    plan.openings.map((o) => ({
      ...o,
      id: `${cabinets[c]!.id}-${o.id}`,
      bayId: `${cabinets[c]!.id}-${o.bayId}`,
      label: `${cabinets[c]!.id} ${o.label.charAt(0).toLowerCase()}${o.label.slice(1)}`,
      left: asTicks(o.left + cabinets[c]!.left),
      frontLeft: asTicks(o.frontLeft + cabinets[c]!.left),
    })),
  );

  // --- R4: one platform and toe kick for each stretch ----------------------
  const runParts: Part[] = [];
  const runPlacements: Placement[] = [];
  const addPart = (name: string, material: BoardValues, lengthD: Derivation, widthD: Derivation, quantity: number, boxes: readonly (readonly [number, number, number, number, number, number])[]): PartId => {
    const id = `R-${String(runParts.length + 1).padStart(2, '0')}` as PartId;
    const thickness = deriveByRule('M1', `actual thickness of the ${material.stock.name}`, [material.thickness], material.thickness.value);
    const derivations = [thickness, lengthD, widthD];
    runParts.push({
      id,
      name,
      colorRole: 'platform',
      assembly: 'The whole run: platform and toe kick',
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
  const platform = buildPlatforms(r, cabinets, addPart);

  // --- R6: one set of cutting diagrams and one shopping list ---------------
  const allParts = [...parts, ...runParts];
  const methods = plans[0]!.methods!;
  const diagrams = cutDiagrams(allParts, catalog, {
    kerf: r.kerf.value,
    keepOffcutsFrom: r.keepOffcutsFrom.value,
    allowLongCutsFirst: methods.sheetSaw === 'trackSaw',
    sheetSaw: methods.sheetSaw,
    boardSaw: methods.boardSaw,
  });

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
  plans.forEach((plan, c) => {
    const cabinet = cabinets[c]!;
    const inPlace = new Map<string, PieceRef>();
    for (const step of plan.steps) {
      const mine: Omit<Step, 'number'> = {
        ...step,
        id: `${cabinet.id}:${step.id}`,
        cabinet: { id: cabinet.id, name: cabinet.name },
        glue: step.glue.map((g) => shift(g, cabinet.left)),
        screws: step.screws.map((p) => shift(p, cabinet.left)),
      };
      const afterInstall = step.chapter === 'drawers' || step.chapter === 'doors';
      // The run sets cabinets in place itself; a cabinet keeps only its pipe openings from that chapter.
      if (step.chapter === 'install' && step.id !== 'plumbing') continue;
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
  const runStep = (step: Pick<Step, 'id' | 'templateId' | 'pieces'> & Partial<Step>) =>
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
  const count = (supplyId: string, points: readonly Point3[]) => {
    if (points.length > 0) supplyCounts.set(supplyId, (supplyCounts.get(supplyId) ?? 0) + points.length);
    return points.length > 0 ? [{ supplyId, quantity: points.length }] : [];
  };

  platform.sections.forEach((section, s) => {
    const rails = copiesOf([section.rails]);
    const supports = copiesOf([section.supports]);
    const screws = screwsBetween(rails, supports);
    runStep({
      id: `run:platform-${s + 1}`,
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
  runStep({ id: 'run:place-platforms', templateId: 'setPlatform', values: { height: r.lumber.width.value }, pieces: still(platformPieces), tools: ['measuring', 'drill'] });

  const endStiles = (c: number) => installed[c]!.filter((ref) => parts.find((p) => p.id === ref.partId)!.name === 'Vertical frame piece (end)');
  cabinets.forEach((cabinet, c) => {
    const joins = cabinet.ends.left === 'joined';
    const screws = joins ? screwsBetween(endStiles(c - 1), endStiles(c)) : [];
    runStep({
      id: `run:set-${cabinet.id}`,
      templateId: 'runSetCabinet',
      values: { cabinet: c + 1, joins: joins ? 1 : 0 },
      pieces: installed[c]!.map((ref): StepPiece => ({ ...ref, from: 'above' })),
      earlierPieces: [...platformPieces, ...installed.slice(0, c).flat()],
      screws,
      fasteners: count('joining-screws', screws),
      tools: joins ? ['measuring', 'clamps', 'drill'] : ['measuring'],
    });
  });
  const everything = [...platformPieces, ...installed.flat()];
  const strips = installed.flat().filter((ref) => parts.find((p) => p.id === ref.partId)!.name.includes('ounting strip'));
  runStep({ id: 'run:wall', templateId: 'wallScrews', pieces: still(strips), earlierPieces: everything.filter((ref) => !strips.some((s) => key(s) === key(ref))), tools: ['measuring', 'drill'] });
  const kick = copiesOf(platform.toeKick);
  const kickPlaces = kick.map((ref) => ({ ref, place: placeOf.get(key(ref))! }));
  runStep({
    id: 'run:toe-kick',
    templateId: 'runToeKick',
    values: { toeSpace: r.toeSpace.value, pieces: kick.length },
    // A return runs front to back and arrives from its end of the run; a front piece arrives from the front.
    pieces: kickPlaces.map(({ ref, place }): StepPiece => ({ ...ref, from: place.sizeZ > place.sizeX ? (place.x * 2 < length ? 'left' : 'right') : 'front' })),
    earlierPieces: everything,
    glue: kick.flatMap((one) => platformPieces.flatMap((other) => contact(placeOf.get(key(one))!, placeOf.get(key(other))!) ?? [])),
    tools: ['glue', nailer],
  });
  steps.push(...later);

  const supplies: SupplyLine[] = catalog.supplies.map((supply) => {
    const quantity = supplyCounts.get(supply.id);
    return quantity === undefined ? supply : { ...supply, quantity };
  });

  const first = plans[0]!.overall!;
  return {
    inputs,
    issues,
    canGeneratePlan: true,
    run: { length, cabinets: cabinets.map(({ ends: _ends, ...cabinet }) => cabinet), spaces },
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
    steps: steps.map((step, i) => ({ ...step, number: i + 1 })),
  };
}

type AddPart = (name: string, material: BoardValues, length: Derivation, width: Derivation, quantity: number, boxes: readonly (readonly [number, number, number, number, number, number])[]) => PartId;

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
function buildPlatforms(r: Resolved, cabinets: readonly (RunCabinet & { readonly ends: { left: EndCondition; right: EndCondition } })[], add: AddPart): { sections: PlatformSection[]; toeKick: PartId[] } {
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
    const start = firstCabinet.left + overhang(firstCabinet.ends.left) + (seenLeft ? setback : 0);
    const end = lastCabinet.left + lastCabinet.width - overhang(lastCabinet.ends.right) - (seenRight ? setback : 0);
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
