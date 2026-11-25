/**
 * Turns a design (three numbers plus changed defaults), the defaults and the
 * catalog into one set of exact values, each remembering where it came from.
 * Also produces the list of every value used, so defaults are visible and
 * changeable (docs/RULES.md, rules G1-G4, M1, M2).
 */
import { proposedVanityLayout } from './defaults/vanity';
import type { Val } from './derive';
import type {
  Bay,
  BoardDimension,
  BoardStock,
  Choice,
  EndCondition,
  HingeHardware,
  MaterialCatalog,
  MaterialId,
  Measurement,
  ResolvedInput,
  SheetStock,
  SlideHardware,
  ValidationIssue,
  VanityDesign,
  VanityOptions,
} from './types';
import { asTicks, parseLength } from './units';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A Measurement or Choice is replaced whole, never merged field by field. */
const isLeaf = (value: unknown): boolean =>
  !isPlainObject(value) || ('status' in value && 'origin' in value && ('entered' in value || 'value' in value));

function merge(base: unknown, changes: unknown): unknown {
  if (changes === undefined) return base;
  if (isLeaf(base) || isLeaf(changes)) return changes;
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, change] of Object.entries(changes as Record<string, unknown>)) {
    if (change === undefined) continue;
    result[key] = key in result ? merge(result[key], change) : change;
  }
  return result;
}

/** The defaults with the user's changes laid over them. */
export function effectiveOptions(design: VanityDesign, defaults: VanityOptions): VanityOptions {
  return merge(defaults, design.overrides) as VanityOptions;
}

export interface SizeValue {
  readonly by: 'fill' | 'opening' | 'front' | 'frontBoard';
  readonly value?: Val;
}

export interface ResolvedDrawer {
  readonly id: string;
  readonly style: 'slab' | 'shaker';
  readonly height: SizeValue;
}

export type ResolvedBay =
  | { readonly kind: 'drawerColumn'; readonly id: string; readonly label: string; readonly width: SizeValue; readonly drawers: readonly ResolvedDrawer[] }
  | {
      readonly kind: 'door';
      readonly id: string;
      readonly label: string;
      readonly width: SizeValue;
      readonly height: SizeValue;
      readonly style: 'slab' | 'shaker';
    };

export interface BoardValues {
  readonly stock: BoardStock;
  readonly thickness: Val;
  readonly width: Val;
}

export interface SheetValues {
  readonly stock: SheetStock;
  readonly thickness: Val;
}

/** Every exact value the rules need. Symbols match docs/RULES.md. */
export interface Resolved {
  readonly options: VanityOptions;
  readonly W: Val;
  readonly D: Val;
  readonly H: Val;
  readonly ends: { readonly left: EndCondition; readonly right: EndCondition };
  readonly wallOverhang: Val;

  readonly caseSheet: SheetValues;
  readonly backSheet: SheetValues;
  readonly supportBoard: BoardValues;
  readonly spacerSheets: readonly SheetValues[];
  readonly spacerWidth: Val;

  readonly frameBoard: BoardValues;
  readonly S: Val;
  readonly RT: Val;
  readonly RB: Val;
  readonly RD: Val;

  readonly bays: readonly ResolvedBay[];

  readonly V: Val;
  readonly minimumGap: Val;
  readonly slabBoard: BoardValues;
  readonly shakerBoard: BoardValues;
  readonly FW: Val;
  readonly panelSheet: SheetValues;
  readonly grooveDepth: Val;
  readonly panelClearance: Val;
  readonly hinge: HingeHardware;
  readonly hingeOverlay: Val;

  readonly slide: SlideHardware;
  readonly slideClearance: Val;
  readonly slideLengths: readonly Val[];
  readonly drawerSheet: SheetValues;
  readonly drawerBottomSheet: SheetValues;
  readonly heightClearance: Val;
  readonly rearClearance: Val;
  readonly spacerTolerance: Val;

  readonly lumber: BoardValues;
  readonly toeSpace: Val;
  readonly supportSpacing: Val;
  readonly toeKickBoard: BoardValues;
  readonly toeKickHeight?: Val;

  readonly kerf: Val;
  readonly keepOffcutsFrom: Val;
  readonly countertopThickness: Val;
}

export interface ResolveResult {
  readonly resolved?: Resolved;
  readonly inputs: readonly ResolvedInput[];
  readonly issues: readonly ValidationIssue[];
}

const BAY_LABELS: Readonly<Record<string, string>> = {
  'left-drawers': 'Left drawers',
  'left-door': 'Left door',
  'right-door': 'Right door',
  'right-drawers': 'Right drawers',
};

export function resolveVanity(design: VanityDesign, defaults: VanityOptions, catalog: MaterialCatalog): ResolveResult {
  const options = effectiveOptions(design, defaults);
  const inputs = new Map<string, ResolvedInput>();
  const issues: ValidationIssue[] = [];

  const problem = (path: string, label: string, explanation: string, suggestedFix: string) => {
    issues.push({ code: 'INPUT_NOT_USABLE', ruleId: 'U2', severity: 'error', partIds: [], inputPaths: [path], explanation: `${label}: ${explanation}`, suggestedFix });
  };

  const length = (m: Measurement, path: string, label: string): Val => {
    const parsed = parseLength(m.entered, m.unit);
    if (!parsed.ok) {
      problem(path, label, `"${m.entered}" cannot be used. ${parsed.reason}`, 'Type a length that is on a tape measure.');
    }
    const value = parsed.ok ? parsed.ticks : asTicks(0);
    inputs.set(path, {
      path,
      label,
      value,
      status: m.status,
      origin: m.origin,
      ...(m.checkAt ? { checkAt: m.checkAt } : {}),
      ...(m.note ? { note: m.note } : {}),
    });
    return { label, value, status: m.status, origin: m.origin, source: path, ...(m.checkAt ? { checkAt: m.checkAt } : {}) };
  };

  const choice = <T extends string>(c: Choice<T>, path: string, label: string): T => {
    inputs.set(path, { path, label, value: c.value, status: c.status, origin: c.origin, ...(c.note ? { note: c.note } : {}) });
    return c.value;
  };

  const missing = (kind: string, id: string): never => {
    throw new Error(`The catalog has no ${kind} called "${id}".`);
  };

  const sheets = new Map<MaterialId, SheetValues>();
  const boards = new Map<MaterialId, BoardValues>();

  /** One Val per material, so a formula that uses a thickness twice shows it once. */
  const sheet = (id: MaterialId): SheetValues => {
    const known = sheets.get(id);
    if (known) return known;
    const made = readSheet(id);
    sheets.set(id, made);
    return made;
  };
  const board = (id: MaterialId): BoardValues => {
    const known = boards.get(id);
    if (known) return known;
    const made = readBoard(id);
    boards.set(id, made);
    return made;
  };

  const readSheet = (id: MaterialId): SheetValues => {
    const stock = catalog.stock.find((s) => s.id === id);
    if (!stock || stock.kind !== 'sheet') return missing('sheet', id);
    const measured = options.measuredThickness[id];
    return {
      stock,
      thickness: length(measured ?? stock.actualThickness, `measuredThickness.${id}`, `thickness of the ${stock.name}`),
    };
  };

  const readBoard = (id: MaterialId): BoardValues => {
    const stock = catalog.stock.find((s) => s.id === id);
    if (!stock || stock.kind !== 'board') return missing('board', id);
    const describe = `${stock.nominalSize} ${stock.species ?? ''} board`.replace('  ', ' ');
    const asSold = (m: Measurement, what: string): Val => {
      const parsed = parseLength(m.entered, m.unit);
      if (!parsed.ok) throw new Error(`Catalog size for ${id} is not a length: ${m.entered}`);
      return { label: `${what} of a ${describe} as sold`, value: parsed.ticks, status: m.status, origin: m.origin, source: `catalog ${id}` };
    };
    return { stock, thickness: asSold(stock.actualThickness, 'thickness'), width: asSold(stock.actualWidth, 'width') };
  };

  /** A width that is either typed or taken from the board as sold (rule M5). */
  const boardDimension = (d: BoardDimension, from: BoardValues, path: string, label: string): Val => {
    if (d !== 'boardWidth') return length(d, path, label);
    const val: Val = { ...from.width, label };
    inputs.set(path, {
      path,
      label,
      value: val.value,
      status: 'assumed',
      origin: 'appDefault',
      note: `A ${from.stock.nominalSize} board at the width it is sold, so there is no lengthwise cut.`,
    });
    return { ...val, status: 'assumed', origin: 'appDefault', source: path };
  };

  const W = length(design.width, 'width', 'cabinet width');
  const D = length(design.depth, 'depth', 'cabinet depth');
  const H = length(design.height, 'height', 'box height');

  const ends = {
    left: choice(options.ends.left, 'ends.left', 'left end'),
    right: choice(options.ends.right, 'ends.right', 'right end'),
  };
  const wallOverhang = length(options.ends.wallOverhang, 'ends.wallOverhang', 'frame overhang on a wall end');

  const caseSheet = sheet(options.box.caseMaterial);
  const backSheet = sheet(options.box.backMaterial);
  const supportBoard = board(options.box.supportMaterial);
  const spacerSheets = options.box.spacerMaterials.map(sheet);
  const spacerWidth = length(options.box.spacerWidth, 'box.spacerWidth', 'slide spacer width');

  const frameBoard = board(options.faceFrame.material);
  const S = boardDimension(options.faceFrame.stileWidth, frameBoard, 'faceFrame.stileWidth', 'vertical frame piece width');
  const RT = boardDimension(options.faceFrame.topRailWidth, frameBoard, 'faceFrame.topRailWidth', 'top frame piece width');
  const RB = boardDimension(options.faceFrame.bottomRailWidth, frameBoard, 'faceFrame.bottomRailWidth', 'bottom frame piece width');
  const RD = boardDimension(options.faceFrame.drawerRailWidth, frameBoard, 'faceFrame.drawerRailWidth', 'width of the piece between drawers');

  const V = length(options.fronts.overlay, 'fronts.overlay', 'overlay');
  const minimumGap = length(options.fronts.minimumGap, 'fronts.minimumGap', 'smallest gap between fronts');
  const slabBoard = board(options.fronts.slabMaterial);
  const shakerBoard = board(options.fronts.shakerFrameMaterial);
  const FW = boardDimension(options.fronts.shakerFrameWidth, shakerBoard, 'fronts.shakerFrameWidth', 'door frame width');
  const panelSheet = sheet(options.fronts.shakerPanelMaterial);
  const grooveDepth = length(options.fronts.panelGrooveDepth, 'fronts.panelGrooveDepth', 'groove depth');
  const panelClearance = length(options.fronts.panelClearance, 'fronts.panelClearance', 'panel clearance');

  const hinge = catalog.hardware.find((h) => h.id === options.fronts.hinge);
  if (!hinge || hinge.kind !== 'hinge') return missing('hinge', options.fronts.hinge);
  const slide = catalog.hardware.find((h) => h.id === options.drawers.slide);
  if (!slide || slide.kind !== 'drawerSlide') return missing('drawer slide', options.drawers.slide);

  const hardwareSize = (m: Measurement, label: string, id: string): Val => {
    const parsed = parseLength(m.entered, m.unit);
    if (!parsed.ok) throw new Error(`Catalog size for ${id} is not a length: ${m.entered}`);
    return { label, value: parsed.ticks, status: m.status, origin: m.origin, source: `catalog ${id}` };
  };

  const sizeValue = (spec: Bay['width'], path: string, label: string): SizeValue =>
    spec.by === 'opening' || spec.by === 'front'
      ? { by: spec.by, value: length(spec.value, path, label) }
      : { by: spec.by };

  const layout = options.layout === 'auto' ? proposedVanityLayout : options.layout;
  const bays: ResolvedBay[] = layout.map((bay, index) => {
    const label = BAY_LABELS[bay.id] ?? `Bay ${index + 1}`;
    const base = `layout.${bay.id}`;
    const width = sizeValue(bay.width, `${base}.width`, `${label}: ${bay.width.by === 'front' ? 'front' : 'opening'} width`);
    if (bay.kind === 'door') {
      return {
        kind: 'door',
        id: bay.id,
        label,
        width,
        height: sizeValue(bay.height, `${base}.height`, `${label}: ${bay.height.by === 'front' ? 'front' : 'opening'} height`),
        style: choice(bay.style, `${base}.style`, `${label}: style`),
      };
    }
    return {
      kind: 'drawerColumn',
      id: bay.id,
      label,
      width,
      drawers: bay.drawers.map((drawer, n) => ({
        id: drawer.id,
        style: choice(drawer.frontStyle, `${base}.${drawer.id}.style`, `${label}, drawer ${n + 1}: style`),
        height: sizeValue(
          drawer.height,
          `${base}.${drawer.id}.height`,
          `${label}, drawer ${n + 1}: ${drawer.height.by === 'front' ? 'front' : 'opening'} height`,
        ),
      })),
    };
  });

  const drawerSheet = sheet(options.drawers.boxMaterial);
  const drawerBottomSheet = sheet(options.drawers.bottomMaterial);
  const heightClearance = length(options.drawers.heightClearance, 'drawers.heightClearance', 'drawer height clearance');
  const rearClearance = length(options.drawers.rearClearance, 'drawers.rearClearance', 'room behind the slide');
  const spacerTolerance = length(options.drawers.spacerTolerance, 'drawers.spacerTolerance', 'slide spacer tolerance');

  const lumber = board(options.platform.lumber);
  const toeSpace = length(options.platform.toeSpace, 'platform.toeSpace', 'toe space');
  const supportSpacing = length(options.platform.supportSpacing, 'platform.supportSpacing', 'platform support spacing');
  const toeKickBoard = board(options.platform.toeKickMaterial);
  const toeKickHeight = options.platform.toeKickHeight
    ? length(options.platform.toeKickHeight, 'platform.toeKickHeight', 'toe kick height')
    : undefined;

  const kerf = length(options.cutting.kerf, 'cutting.kerf', 'saw blade width');
  const keepOffcutsFrom = length(options.cutting.keepOffcutsFrom, 'cutting.keepOffcutsFrom', 'smallest leftover worth keeping');
  const countertopThickness = length(options.countertop.thickness, 'countertop.thickness', 'countertop thickness');

  const resolved: Resolved = {
    options,
    W,
    D,
    H,
    ends,
    wallOverhang,
    caseSheet,
    backSheet,
    supportBoard,
    spacerSheets,
    spacerWidth,
    frameBoard,
    S,
    RT,
    RB,
    RD,
    bays,
    V,
    minimumGap,
    slabBoard,
    shakerBoard,
    FW,
    panelSheet,
    grooveDepth,
    panelClearance,
    hinge,
    hingeOverlay: hardwareSize(hinge.overlay, 'overlay the hinge is made for', hinge.id),
    slide,
    slideClearance: hardwareSize(slide.clearancePerSide, 'space a slide needs on each side', slide.id),
    slideLengths: slide.stockLengths.map((m) => hardwareSize(m, 'slide length as sold', slide.id)),
    drawerSheet,
    drawerBottomSheet,
    heightClearance,
    rearClearance,
    spacerTolerance,
    lumber,
    toeSpace,
    supportSpacing,
    toeKickBoard,
    ...(toeKickHeight ? { toeKickHeight } : {}),
    kerf,
    keepOffcutsFrom,
    countertopThickness,
  };

  const failed = issues.some((i) => i.severity === 'error');
  return { ...(failed ? {} : { resolved }), inputs: [...inputs.values()], issues };
}
