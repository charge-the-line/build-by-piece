/**
 * Build by Piece — engine data model (Phase 0: types only, no logic).
 *
 * The engine is pure TypeScript: a design (three numbers plus any changed
 * defaults), the defaults and a catalog go in; parts, materials, hardware,
 * validation issues and steps come out. Nothing in
 * src/engine may import UI, DOM or network code.
 *
 * Rule numbers such as "B2" or "L1" refer to docs/RULES.md.
 */

// ---------------------------------------------------------------------------
// Lengths
// ---------------------------------------------------------------------------

/**
 * An exact length, stored as a whole number of ticks (rule U1).
 *
 *   1 inch  = 4,064 ticks
 *   1/32"   =   127 ticks
 *   1/16"   =   254 ticks
 *   1 mm    =   160 ticks
 *
 * The brand stops a plain number (for example a float typed by hand) from
 * being used as a length by accident. Only the engine's parser and its
 * integer arithmetic may produce a Ticks value.
 */
export type Ticks = number & { readonly __brand: 'Ticks' };

export type LengthUnit = 'in' | 'mm';

/** The finest mark the plan may print (rule U3). */
export type TapeIncrement = '1/16in' | '1/32in' | '1mm';

// ---------------------------------------------------------------------------
// Inputs — every value carries a status and says who decided it
// ---------------------------------------------------------------------------

/** confirmed = entered, changed or accepted by the user; assumed = not yet confirmed by her. */
export type InputStatus = 'confirmed' | 'assumed';

/**
 * Who decided a value.
 *  - user:       she typed or picked it
 *  - appDefault: the app decided it (rule G1); she can see it and change it
 */
export type InputOrigin = 'user' | 'appDefault';

/**
 * A length as text, exactly as a person would type it. The engine parses
 * `entered` into Ticks (rule U2). Accepted forms: "79 1/2", "79.5", "23/32"
 * (inches) or "30" (mm).
 */
export interface Measurement {
  readonly entered: string;
  readonly unit: LengthUnit;
  readonly status: InputStatus;
  readonly origin: InputOrigin;
  /**
   * Set on a default that stands in for a real-world fact, such as plywood
   * thickness. The app prompts her to check it at this point (rule G3).
   */
  readonly checkAt?: 'cutting';
  /** Why this value: shown next to it in the app. */
  readonly note?: string;
}

/** A non-length decision (a style, an end condition) with the same labels. */
export interface Choice<T> {
  readonly value: T;
  readonly status: InputStatus;
  readonly origin: InputOrigin;
  readonly note?: string;
}

/**
 * A width that is either typed, or taken from the actual width of the board
 * the part is made from, so the part needs no lengthwise (rip) cut (rule M5).
 */
export type BoardDimension = Measurement | 'boardWidth';

// ---------------------------------------------------------------------------
// Colour roles — fixed everywhere, never the only cue
// ---------------------------------------------------------------------------

export type ColorRole =
  | 'leftSide' // blue
  | 'rightSide' // green
  | 'bottom' // yellow
  | 'back' // purple
  | 'platform' // orange: platform and toe kick
  | 'divider' // red
  | 'faceFrame' // brown
  | 'door' // teal
  | 'drawerFront' // pink
  | 'support' // grey: top supports, mounting strips, slide spacers
  | 'drawerBox'; // white with a dark outline

// ---------------------------------------------------------------------------
// Materials — sizes are data, not constants in code
// ---------------------------------------------------------------------------

export type MaterialId = string;

interface StockBase {
  readonly id: MaterialId;
  /** Plain-English name for the shopping list, e.g. '3/4" oak plywood'. */
  readonly name: string;
  readonly species?: string;
}

/** Plywood and other sheet goods. */
export interface SheetStock extends StockBase {
  readonly kind: 'sheet';
  /** What the shop label says, e.g. '3/4"'. A label only; never used in maths. */
  readonly nominalThickness: string;
  /** What a tape or caliper says. Starts assumed; the app prompts the user to measure. */
  readonly actualThickness: Measurement;
  readonly sheetLength: Measurement;
  readonly sheetWidth: Measurement;
  /** True when the face has a visible grain that parts must follow. */
  readonly hasGrain: boolean;
}

/** Solid lumber sold by the board: 2x4s, oak boards. */
export interface BoardStock extends StockBase {
  readonly kind: 'board';
  /** What the shop label says, e.g. '2x4' or '1x4'. A label only. */
  readonly nominalSize: string;
  readonly actualThickness: Measurement;
  readonly actualWidth: Measurement;
  /** Lengths the shop sells, shortest first. */
  readonly stockLengths: readonly Measurement[];
}

export type Stock = SheetStock | BoardStock;

export type HardwareId = string;

/** Drawer slides. Clearances and lengths are data, like material sizes. */
export interface SlideHardware {
  readonly kind: 'drawerSlide';
  readonly id: HardwareId;
  readonly name: string;
  readonly mount: 'side';
  /** Space the slide needs between the drawer box and the cabinet, on each side. */
  readonly clearancePerSide: Measurement;
  /** Lengths sold, shortest first. */
  readonly stockLengths: readonly Measurement[];
}

export interface HingeHardware {
  readonly kind: 'hinge';
  readonly id: HardwareId;
  readonly name: string;
  /** The overlay this hinge is made for; must match the design's overlay (rule D7). */
  readonly overlay: Measurement;
}

export type Hardware = SlideHardware | HingeHardware;

export interface MaterialCatalog {
  readonly stock: readonly Stock[];
  readonly hardware: readonly Hardware[];
}

// ---------------------------------------------------------------------------
// Design — three numbers from the user, everything else a visible default
// ---------------------------------------------------------------------------

/**
 * How one opening gets its size along one direction:
 *  - fill:       an equal share of whatever space is left (rule L3)
 *  - opening:    the clear hole in the face frame is given
 *  - front:      the door or drawer front size is given; opening = front - 2 x overlay
 *  - frontBoard: the front is one board at its actual width, so no rip cut (rule L4)
 */
export type SizeSpec =
  | { readonly by: 'fill' }
  | { readonly by: 'opening'; readonly value: Measurement }
  | { readonly by: 'front'; readonly value: Measurement }
  | { readonly by: 'frontBoard' };

export type FrontStyle = 'slab' | 'shaker';

export interface DrawerSpec {
  readonly id: string;
  readonly frontStyle: Choice<FrontStyle>;
  readonly height: SizeSpec;
}

/** One vertical section of the face frame, between two vertical frame pieces. */
export type Bay = DrawerColumnBay | DoorBay;

export interface DrawerColumnBay {
  readonly kind: 'drawerColumn';
  readonly id: string;
  readonly width: SizeSpec;
  /** Top to bottom. */
  readonly drawers: readonly DrawerSpec[];
}

export interface DoorBay {
  readonly kind: 'door';
  readonly id: string;
  readonly width: SizeSpec;
  readonly height: SizeSpec;
  readonly style: Choice<FrontStyle>;
  readonly hingeSide: Choice<'left' | 'right'>;
}

/** wall = that end touches a wall; exposed = that end will be seen. */
export type EndCondition = 'wall' | 'exposed';

export type JoineryMethod = 'pocketHolesAndGlue';

/**
 * Every value the engine needs beyond width, depth and height. A complete
 * set lives in src/engine/defaults/vanity.ts; a design only stores the ones
 * the user changed. Nothing in here is ever asked for up front (rule G1).
 */
export interface VanityOptions {
  readonly displayUnit: LengthUnit;
  readonly tapeIncrement: TapeIncrement;
  readonly joinery: Choice<JoineryMethod>;

  readonly ends: {
    readonly left: Choice<EndCondition>;
    readonly right: Choice<EndCondition>;
    /** How far the face frame runs past the box on a wall end (rule F1). */
    readonly wallOverhang: Measurement;
  };

  readonly box: {
    readonly caseMaterial: MaterialId;
    readonly backMaterial: MaterialId;
    /** Board for top front supports and mounting strips (rules B6, B7). */
    readonly supportMaterial: MaterialId;
    /** Sheet material stacked to make slide spacers, thickest first (rule B8). */
    readonly spacerMaterials: readonly MaterialId[];
    /** Width of each slide spacer strip (rule B8). */
    readonly spacerWidth: Measurement;
  };

  readonly faceFrame: {
    readonly material: MaterialId;
    readonly stileWidth: BoardDimension;
    readonly topRailWidth: BoardDimension;
    readonly bottomRailWidth: BoardDimension;
    readonly drawerRailWidth: BoardDimension;
  };

  /** 'auto' = the app proposes the bays (rule L0). Left to right when given. */
  readonly layout: 'auto' | readonly Bay[];

  readonly fronts: {
    /** How far each door and drawer front laps over the frame on every edge. */
    readonly overlay: Measurement;
    /** Smallest gap allowed between two fronts on one frame piece (rule D3). */
    readonly minimumGap: Measurement;
    readonly slabMaterial: MaterialId;
    readonly shakerFrameMaterial: MaterialId;
    readonly shakerFrameWidth: BoardDimension;
    readonly shakerPanelMaterial: MaterialId;
    /** How deep the centre panel sits in the frame's groove on each edge (rule D5). */
    readonly panelGrooveDepth: Measurement;
    /** Room for the panel to slide into its groove (rule D5). */
    readonly panelClearance: Measurement;
    readonly hinge: HardwareId;
  };

  readonly drawers: {
    readonly slide: HardwareId;
    readonly boxMaterial: MaterialId;
    readonly bottomMaterial: MaterialId;
    /** Opening height minus drawer box height (rule X2). */
    readonly heightClearance: Measurement;
    /** Space kept free behind the slide (rule X1). */
    readonly rearClearance: Measurement;
    /** Most a slide spacer may fall short of the opening edge (rule B8). */
    readonly spacerTolerance: Measurement;
  };

  readonly platform: {
    readonly lumber: MaterialId;
    /** How far the toe kick sits back from the cabinet front and from an exposed end (rule P1). */
    readonly toeSpace: Measurement;
    /** Largest spacing between cross supports, centre to centre (rule P3). */
    readonly supportSpacing: Measurement;
    readonly toeKickMaterial: MaterialId;
    /**
     * Normally absent: toe kick height is derived from the platform (rule P5).
     * If a value is entered it is checked against the platform, never trusted.
     */
    readonly toeKickHeight?: Measurement;
  };

  readonly cutting: {
    /** Width of wood the saw blade removes, left between pieces on every diagram (rule C2). */
    readonly kerf: Measurement;
    /** A leftover at least this big both ways is labelled as worth keeping (rule C5). */
    readonly keepOffcutsFrom: Measurement;
  };

  /**
   * Thickness she measured on her own sheet, by material. Replaces the
   * catalog's standard thickness for that material (rule M2). Empty by default.
   */
  readonly measuredThickness: Readonly<Record<MaterialId, Measurement>>;

  /** For the finished-height note only (rule H1). The top is made by others. */
  readonly countertop: {
    readonly description: string;
    readonly thickness: Measurement;
  };
}

/** Values that are replaced whole, never merged field by field. */
type OverrideLeaf = Measurement | Choice<unknown> | readonly unknown[] | string | number | boolean;

/** The same shape as T with everything optional, down to each single value. */
export type Overrides<T> = T extends OverrideLeaf ? T : { readonly [K in keyof T]?: Overrides<T[K]> };

export interface VanityDesign {
  readonly projectType: 'vanity';
  readonly id: string;
  readonly name: string;
  /** The full cabinet width, end to end, including any face-frame overhang (rule G2). */
  readonly width: Measurement;
  /** Wall to the front of the face frame; doors and handles stick out further (rule G2). */
  readonly depth: Measurement;
  /** The box only: not the platform below it or the top above it (rule G2). */
  readonly height: Measurement;
  /** Only what the user changed from the defaults. */
  readonly overrides: Overrides<VanityOptions>;
}

/** Other cabinet types join this union later. */
export type Design = VanityDesign;

// ---------------------------------------------------------------------------
// Output — parts
// ---------------------------------------------------------------------------

/** Stable ID printed on every list, diagram and step: P01, P02, ... */
export type PartId = `P${string}`;

export type GrainDirection = 'alongLength' | 'alongWidth' | 'none';

/** One number that went into a formula, with where it came from. */
export interface DerivationInput {
  /** Plain-English label, e.g. "overall box width". */
  readonly label: string;
  readonly value: Ticks;
  readonly status: InputStatus;
  readonly origin: InputOrigin;
  readonly checkAt?: 'cutting';
  /** Where it came from: an input path such as "width", or "rule B1" for a worked-out value. */
  readonly source: string;
  /** For a "sum" derivation: how many times this value is added (negative = taken away). */
  readonly times?: number;
}

/** How one dimension of a part was worked out. */
export interface Derivation {
  /**
   * sum:  result is exactly the inputs added up, each multiplied by its `times`.
   * rule: result follows the stated rule (a shared space, a stock length picked).
   */
  readonly kind: 'sum' | 'rule';
  /** Rule number in docs/RULES.md, e.g. "B3". */
  readonly ruleId: string;
  /** Plain English, e.g. "overall box width minus 2 x side panel thickness". */
  readonly formula: string;
  readonly inputs: readonly DerivationInput[];
  readonly result: Ticks;
}

export interface Part {
  readonly id: PartId;
  /** Plain words first, e.g. "Vertical frame piece (left end)". */
  readonly name: string;
  /** Trade term for the tap-to-explain glossary, e.g. "stile". */
  readonly tradeTerm?: string;
  readonly colorRole: ColorRole;
  /** Which sub-assembly it belongs to, for grouping lists: "Box", "Face frame", ... */
  readonly assembly: string;
  readonly materialId: MaterialId;
  readonly thickness: Ticks;
  readonly length: Ticks;
  readonly width: Ticks;
  readonly grain: GrainDirection;
  readonly quantity: number;
  readonly derivation: {
    readonly thickness: Derivation;
    readonly length: Derivation;
    readonly width: Derivation;
  };
  /** assumed if any input in any derivation is assumed. */
  readonly status: InputStatus;
  /** True when a size depends on something to check before cutting (rule G3). */
  readonly needsCheck: boolean;
}

// ---------------------------------------------------------------------------
// Output — materials (shopping list)
// ---------------------------------------------------------------------------

export interface MaterialLine {
  readonly materialId: MaterialId;
  readonly name: string;
  readonly quantity: number;
  readonly unit: 'sheet' | 'board';
  /** For boards: which stock length to buy. */
  readonly stockLength?: Ticks;
  readonly partIds: readonly PartId[];
  readonly status: InputStatus;
}

export interface HardwareLine {
  readonly hardwareId: HardwareId;
  readonly name: string;
  readonly quantity: number;
  readonly unit: 'pair' | 'each';
  /** For slides: the length chosen (rule X1). */
  readonly length?: Derivation;
  readonly status: InputStatus;
}

// ---------------------------------------------------------------------------
// Output — cutting diagrams (rules C1-C6)
// ---------------------------------------------------------------------------

/** One piece laid out on a sheet or board. Positions are from one end and one edge of the stock. */
export interface CutPiece {
  readonly partId: PartId;
  /** Which copy of the part this is: 1, 2, ... up to the part's quantity. */
  readonly copy: number;
  /** Size along the stock's length (the grain on plywood) and across it. */
  readonly along: Ticks;
  readonly across: Ticks;
  readonly fromEnd: Ticks;
  readonly fromEdge: Ticks;
}

/** A leftover rectangle. Large ones get a label so they can be kept and reused. */
export interface Offcut {
  /** "Offcut 1", ... for a piece worth keeping; empty for scrap. */
  readonly label: string;
  readonly along: Ticks;
  readonly across: Ticks;
  readonly fromEnd: Ticks;
  readonly fromEdge: Ticks;
}

/**
 * One saw cut, in the order to make them. The app turns each into a sentence
 * from a written template.
 *  - section: across the whole sheet, across the grain
 *  - strip:   along the grain, within a section
 *  - piece:   a strip or board cut to length
 */
export interface CutStep {
  readonly number: number;
  readonly kind: 'section' | 'strip' | 'piece';
  /** What is being cut: "the sheet", "section A", "strip A1", "the board". */
  readonly from: string;
  /** Measure this far from the fresh end or edge, then cut. */
  readonly measure: Ticks;
  /** What the cut produces: "section A", "strip A1", or a part ID. */
  readonly makes: string;
  readonly partId?: PartId;
  /** True when the piece is already this size, so there is nothing to cut. */
  readonly noCutNeeded: boolean;
}

/** Everything needed to cut one sheet or one board. */
export interface CutDiagram {
  readonly id: string;
  readonly materialId: MaterialId;
  /** e.g. '3/4" oak plywood, sheet 1 of 2'. */
  readonly title: string;
  readonly kind: 'sheet' | 'board';
  readonly stockLength: Ticks;
  readonly stockWidth: Ticks;
  /** True when grain runs along the stock's length and pieces must follow it. */
  readonly hasGrain: boolean;
  /** Width of the saw cut left between pieces. */
  readonly kerf: Ticks;
  readonly pieces: readonly CutPiece[];
  readonly offcuts: readonly Offcut[];
  readonly steps: readonly CutStep[];
}

// ---------------------------------------------------------------------------
// Output — the layout the engine settled on
// ---------------------------------------------------------------------------

/** One clear hole in the face frame, with how its size was worked out. */
export interface Opening {
  readonly id: string;
  readonly bayId: string;
  readonly kind: 'door' | 'drawer';
  /** Plain-English name, e.g. "Left drawers, drawer 1". */
  readonly label: string;
  readonly style: FrontStyle;
  readonly width: Derivation;
  readonly height: Derivation;
  /** Where the opening sits in the face frame: from its left end and from its top. */
  readonly left: Ticks;
  readonly top: Ticks;
  /** Size and place of the door or drawer front that covers it (rule D1). */
  readonly frontWidth: Ticks;
  readonly frontHeight: Ticks;
  readonly frontLeft: Ticks;
  readonly frontTop: Ticks;
  /** The door, drawer front and drawer box parts that belong to this opening. */
  readonly partIds: readonly PartId[];
}

// ---------------------------------------------------------------------------
// Output — validation
// ---------------------------------------------------------------------------

export type Severity = 'error' | 'warning' | 'info';

/**
 * Data for a picture of a "does not add up" problem: labelled pieces laid
 * end to end against the total they should fill. The UI draws it as SVG;
 * every number shown comes from here.
 */
export interface SumDiagram {
  readonly direction: 'horizontal' | 'vertical';
  readonly totalLabel: string;
  readonly total: Ticks;
  readonly segments: readonly {
    readonly label: string;
    readonly length: Ticks;
    readonly colorRole?: ColorRole;
    readonly partId?: PartId;
  }[];
  /** total minus the sum of segments; positive = unexplained gap, negative = overlap. */
  readonly difference: Ticks;
}

export interface ValidationIssue {
  /** Stable machine code, e.g. "LAYOUT_WIDTH_MISMATCH". */
  readonly code: string;
  readonly ruleId: string;
  readonly severity: Severity;
  readonly partIds: readonly PartId[];
  /** Design or catalog paths the user can change to fix it. */
  readonly inputPaths: readonly string[];
  readonly explanation: string;
  readonly suggestedFix: string;
  readonly diagram?: SumDiagram;
}

// ---------------------------------------------------------------------------
// Output — assembly steps
// ---------------------------------------------------------------------------

/** Where one piece sits in the finished cabinet, as a box. */
export interface Placement {
  readonly partId: PartId;
  /** Which copy of the part: 1, 2, ... up to its quantity. */
  readonly copy: number;
  /** Corner nearest the wall-side floor corner: x from the cabinet's left end, y up from the floor, z out from the wall. */
  readonly x: Ticks;
  readonly y: Ticks;
  readonly z: Ticks;
  readonly sizeX: Ticks;
  readonly sizeY: Ticks;
  readonly sizeZ: Ticks;
}

/** Which face of a piece gets the pocket holes, in plain words. */
export type JointFace = 'underside' | 'top face' | 'inside face' | 'outside face' | 'back face' | 'drawer side';

/** One kind of joint made in a step (rules J1-J3). */
export interface Joint {
  readonly method: 'pocketScrews' | 'glueAndNails' | 'screws';
  /** The piece that is drilled or fastened through. */
  readonly through: PartId;
  /** Where on that piece, for pocket screws. */
  readonly face?: JointFace;
  /** The pieces it is fastened to. Empty when it goes into the wall or floor. */
  readonly into: readonly PartId[];
}

export interface StepHardware {
  readonly hardwareId: HardwareId;
  readonly quantity: number;
  readonly unit: 'pair' | 'each';
}

/**
 * One assembly step (rules A1-A13). The words come from a written template
 * in the app, filled in with `values`; nothing here is free text.
 */
export interface Step {
  readonly id: string;
  readonly number: number;
  /** Which written template describes this step. */
  readonly templateId: string;
  /** Numbers the template quotes: lengths in ticks, or counts. */
  readonly values: Readonly<Record<string, Ticks | number>>;
  /** Parts added in this step (highlighted in the drawing). */
  readonly partIds: readonly PartId[];
  /** Parts placed in earlier steps (muted in the drawing). */
  readonly earlierPartIds: readonly PartId[];
  readonly joints: readonly Joint[];
  readonly hardware: readonly StepHardware[];
}

// ---------------------------------------------------------------------------
// Engine boundary
// ---------------------------------------------------------------------------

/**
 * Every value the plan used, flattened: the three entered numbers and every
 * default. This is what makes defaults visible and changeable (rule G1).
 */
export interface ResolvedInput {
  /** Path into the design or defaults, e.g. "width" or "faceFrame.stileWidth". */
  readonly path: string;
  readonly label: string;
  readonly value: Ticks | string | number | boolean;
  readonly status: InputStatus;
  readonly origin: InputOrigin;
  readonly checkAt?: 'cutting';
  readonly note?: string;
}

export interface PlanResult {
  readonly inputs: readonly ResolvedInput[];
  readonly issues: readonly ValidationIssue[];
  /** False when any issue has severity "error"; everything below is then empty. */
  readonly canGeneratePlan: boolean;
  /** Overall sizes worked out from the three numbers. Absent when the plan is blocked. */
  readonly overall?: OverallSizes;
  readonly openings: readonly Opening[];
  readonly parts: readonly Part[];
  /** One per sheet and per board to buy (rule C1). */
  readonly cutDiagrams: readonly CutDiagram[];
  readonly materials: readonly MaterialLine[];
  readonly hardware: readonly HardwareLine[];
  /** Where every piece sits, for the step drawings. */
  readonly placements: readonly Placement[];
  readonly steps: readonly Step[];
}

export interface OverallSizes {
  readonly frameWidth: Ticks;
  readonly frameHeight: Ticks;
  readonly boxWidth: Derivation;
  readonly boxDepth: Derivation;
  readonly platformHeight: Derivation;
  /** Platform + box + countertop (rule H1). */
  readonly finishedHeight: Derivation;
}

/** The whole engine, as seen from outside. See generatePlan.ts. */
export type GeneratePlan = (
  design: Design,
  defaults: VanityOptions,
  catalog: MaterialCatalog,
) => PlanResult;

// ---------------------------------------------------------------------------
// Saved project file (on-device save, export and import)
// ---------------------------------------------------------------------------

export interface ProjectFile {
  readonly format: 'build-by-piece-project';
  readonly schemaVersion: 1;
  /** ISO 8601 timestamp. */
  readonly savedAt: string;
  readonly design: Design;
  readonly catalog: MaterialCatalog;
  /** Checklist lines ticked off so far, by step and line. */
  readonly checked?: Readonly<Record<string, boolean>>;
}
