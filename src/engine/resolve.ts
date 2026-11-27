/**
 * Turns a design (three numbers plus changed defaults), the defaults and the
 * catalog into one set of exact values, each remembering where it came from.
 * Also produces the list of every value used, so defaults are visible and
 * changeable (docs/RULES.md, rules G1-G4, M1, M2).
 */
import { toolList } from './defaults/tools';
import { cabinetKind, proposeLayout, type CabinetKind } from './defaults/cabinets';
import type { Val } from './derive';
import type {
  Approach,
  Bay,
  BoardDimension,
  BoardStock,
  Choice,
  EndCondition,
  HingeHardware,
  OpeningKind,
  MaterialCatalog,
  MaterialId,
  Measurement,
  PanelMethod,
  PlanContext,
  ResolvedInput,
  SheetStock,
  SlideHardware,
  ToolId,
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
  // The cabinet kind's own defaults sit between the general ones and what she changed.
  return merge(merge(defaults, cabinetKind(design.cabinet).options), design.overrides) as VanityOptions;
}

export interface SizeValue {
  readonly by: 'fill' | 'opening' | 'front' | 'frontBoard';
  readonly value?: Val;
}

/** One opening in a space, top to bottom. */
export interface ResolvedItem {
  readonly id: string;
  readonly kind: OpeningKind;
  /** e.g. "Left door", "Left drawers, drawer 1", "Drawer 2". */
  readonly label: string;
  readonly style: 'slab' | 'shaker';
  readonly height: SizeValue;
  /** Where its height comes from in the design, for pointing at it when sizes do not add up. */
  readonly heightPath: string;
  readonly hingeSide?: 'left' | 'right';
}

/** One space in the face frame: a stack of one or more openings. */
export interface ResolvedBay {
  readonly id: string;
  /** e.g. "Left drawers", "Left", or "" for a cabinet with a single space. */
  readonly label: string;
  readonly width: SizeValue;
  readonly items: readonly ResolvedItem[];
}

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
  /** Which cabinet this is, and what that kind has (section K). */
  readonly kind: CabinetKind;
  /** What part numbers start with: "P", or "C01-" in a run. */
  readonly idPrefix: string;
  /** False for a wall cabinet, and for a cabinet in a run, whose platform belongs to the run (R4). */
  readonly buildsPlatform: boolean;
  /** N3: how far the box runs past one end of the frame, into a corner. */
  readonly blind?: { readonly side: 'left' | 'right'; readonly by: Val };
  readonly W: Val;
  readonly D: Val;
  readonly H: Val;
  readonly ends: { readonly left: EndCondition; readonly right: EndCondition };
  readonly approach: Approach;
  /** Which tools are ticked (rule T1). */
  readonly tools: Readonly<Record<ToolId, boolean>>;
  readonly wallOverhang: Val;

  readonly caseSheet: SheetValues;
  readonly backSheet: SheetValues;
  readonly supportBoard: BoardValues;
  readonly spacerSheets: readonly SheetValues[];
  readonly spacerWidth: Val;
  readonly shelfSpacing: Val;
  readonly shelfSetback: Val;
  readonly sinkMinimumWidth: Val;

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
  readonly panelMethod: 'auto' | PanelMethod;
  readonly grooveDepth: Val;
  readonly recessWidth: Val;
  readonly panelBackClearance: Val;
  readonly minimumPanelLap: Val;
  readonly hingeInset: Val;
  readonly hingeMountingWidth: Val;
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
  readonly screwEndInset: Val;
  readonly screwSpacing: Val;

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

export function resolveVanity(design: VanityDesign, defaults: VanityOptions, catalog: MaterialCatalog, context: PlanContext = {}): ResolveResult {
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

  const tick = (c: Choice<boolean>, path: string, label: string): boolean => {
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

  // R2: in a run, the run decides the cabinet's width.
  const W: Val =
    context.width === undefined
      ? length(design.width, 'width', 'cabinet width')
      : { label: 'cabinet width', value: context.width, status: 'assumed', origin: 'appDefault', source: 'rule R2' };
  const D = length(design.depth, 'depth', 'cabinet depth');
  const H = length(design.height, 'height', 'box height');

  // R3: in a run, the run says what each end of the cabinet meets.
  const ends = context.ends ?? {
    left: choice(options.ends.left, 'ends.left', 'left end'),
    right: choice(options.ends.right, 'ends.right', 'right end'),
  };
  const tools = Object.fromEntries(toolList.map((tool) => [tool.id, tick(options.tools[tool.id], `tools.${tool.id}`, tool.name)])) as Record<ToolId, boolean>;
  const approach = choice(options.approach, 'approach', 'how the plan chooses its methods');
  const wallOverhang = length(options.ends.wallOverhang, 'ends.wallOverhang', 'frame overhang on a wall end');

  const caseSheet = sheet(options.box.caseMaterial);
  const backSheet = sheet(options.box.backMaterial);
  const supportBoard = board(options.box.supportMaterial);
  const spacerSheets = options.box.spacerMaterials.map(sheet);
  const spacerWidth = length(options.box.spacerWidth, 'box.spacerWidth', 'slide spacer width');
  const shelfSpacing = length(options.box.shelfSpacing, 'box.shelfSpacing', 'most space between shelves');
  const shelfSetback = length(options.box.shelfSetback, 'box.shelfSetback', 'shelf setback from the front');
  const sinkMinimumWidth = length(options.fronts.sinkMinimumWidth, 'fronts.sinkMinimumWidth', 'narrowest sink base');
  const kind = cabinetKind(design.cabinet);

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
  const panelMethod = choice(options.fronts.panelMethod, 'fronts.panelMethod', 'how framed fronts hold their panel');
  const recessWidth = length(options.fronts.panelRecessWidth, 'fronts.panelRecessWidth', 'recess width');
  const panelBackClearance = length(options.fronts.panelBackClearance, 'fronts.panelBackClearance', 'gap between a back panel and the face frame');
  const minimumPanelLap = length(options.fronts.minimumPanelLap, 'fronts.minimumPanelLap', 'least frame a back panel is glued to');
  const hingeInset = length(options.fronts.hingeInset, 'fronts.hingeInset', 'hinge distance from the top and bottom of a door');
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

  const maxDoorWidth = length(options.fronts.maxDoorWidth, 'fronts.maxDoorWidth', 'widest single door');
  const layout = options.layout === 'auto' ? proposeLayout(kind.type, W.value, S.value, maxDoorWidth.value, context.blind?.side) : options.layout;
  const heightWord = (spec: Bay['width']) => (spec.by === 'front' ? 'front' : 'opening');
  const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  const bays: ResolvedBay[] = layout.map((bay, index) => {
    const base = `layout.${bay.id}`;
    if (bay.kind === 'stack') {
      // K3: a space named by where it is; its openings by what they are.
      const position = layout.length === 1 ? '' : layout.length === 2 ? ['Left', 'Right'][index]! : `Space ${index + 1}`;
      const words = { drawer: 'drawer', door: 'door', falseFront: 'fixed panel' } as const;
      const items = bay.items.map((item): ResolvedItem => {
        const same = bay.items.filter((i) => i.kind === item.kind);
        const number = same.length > 1 ? ` ${same.indexOf(item) + 1}` : '';
        const label = capital(`${position} ${words[item.kind]}${number}`.trim());
        const heightPath = `${base}.${item.id}.height`;
        return {
          id: item.id,
          kind: item.kind,
          label,
          style: choice(item.style, `${base}.${item.id}.style`, `${label}: style`),
          height: sizeValue(item.height, heightPath, `${label}: ${heightWord(item.height)} height`),
          heightPath,
          ...(item.hingeSide ? { hingeSide: item.hingeSide.value } : {}),
        };
      });
      const where = position === '' ? 'Opening' : `${position} space`;
      return { id: bay.id, label: position, width: sizeValue(bay.width, `${base}.width`, `${where}: ${heightWord(bay.width)} width`), items };
    }
    // A custom layout names each bay by what it is and its place among its kind: "Door 2", "Drawers 1".
    const ordinal = layout.slice(0, index + 1).filter((b) => b.kind === bay.kind).length;
    const label = BAY_LABELS[bay.id] ?? `${bay.kind === 'door' ? 'Door' : 'Drawers'} ${ordinal}`;
    const width = sizeValue(bay.width, `${base}.width`, `${label}: ${heightWord(bay.width)} width`);
    if (bay.kind === 'door') {
      const heightPath = `${base}.height`;
      return {
        id: bay.id,
        label,
        width,
        items: [
          {
            id: bay.id,
            kind: 'door',
            label,
            style: choice(bay.style, `${base}.style`, `${label}: style`),
            height: sizeValue(bay.height, heightPath, `${label}: ${heightWord(bay.height)} height`),
            heightPath,
            hingeSide: bay.hingeSide.value,
          },
        ],
      };
    }
    return {
      id: bay.id,
      label,
      width,
      items: bay.drawers.map((drawer, n): ResolvedItem => {
        const itemLabel = `${label}, drawer ${n + 1}`;
        const heightPath = `${base}.${drawer.id}.height`;
        return {
          id: drawer.id,
          kind: 'drawer',
          label: itemLabel,
          style: choice(drawer.frontStyle, `${base}.${drawer.id}.style`, `${itemLabel}: style`),
          height: sizeValue(drawer.height, heightPath, `${itemLabel}: ${heightWord(drawer.height)} height`),
          heightPath,
        };
      }),
    };
  });

  const drawerSheet = sheet(options.drawers.boxMaterial);
  const drawerBottomSheet = sheet(options.drawers.bottomMaterial);
  const heightClearance = length(options.drawers.heightClearance, 'drawers.heightClearance', 'drawer height clearance');
  const rearClearance = length(options.drawers.rearClearance, 'drawers.rearClearance', 'room behind the slide');
  const screwEndInset = length(options.drawers.screwEndInset, 'drawers.screwEndInset', 'screw distance from the end of a joint');
  const screwSpacing = length(options.drawers.screwSpacing, 'drawers.screwSpacing', 'most space between screws');
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
    kind,
    idPrefix: context.idPrefix ?? 'P',
    buildsPlatform: kind.hasPlatform && !context.sharedPlatform,
    ...(context.blind ? { blind: { side: context.blind.side, by: { label: 'part hidden in the corner', value: context.blind.by, status: 'assumed' as const, origin: 'appDefault' as const, source: 'rule N3' } } } : {}),
    W,
    D,
    H,
    ends,
    approach,
    tools,
    wallOverhang,
    caseSheet,
    backSheet,
    supportBoard,
    spacerSheets,
    spacerWidth,
    shelfSpacing,
    shelfSetback,
    sinkMinimumWidth,
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
    panelMethod,
    grooveDepth,
    recessWidth,
    panelBackClearance,
    minimumPanelLap,
    hingeInset,
    hingeMountingWidth: hardwareSize(hinge.mountingWidth, 'solid wood the hinge needs from the edge of the door', hinge.id),
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
    screwEndInset,
    screwSpacing,
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
