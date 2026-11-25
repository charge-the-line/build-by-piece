/**
 * Build by Piece — engine data model (Phase 0: types only, no logic).
 *
 * The engine is pure TypeScript: a design and a material catalog go in;
 * parts, materials, validation issues and steps come out. Nothing in
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
// Inputs — every input carries a status
// ---------------------------------------------------------------------------

/** confirmed = measured or decided by the user; assumed = a placeholder or default. */
export type InputStatus = 'confirmed' | 'assumed';

/**
 * A length exactly as the user gave it. The engine parses `entered` into
 * Ticks (rule U2); the original text is kept so a saved project shows what
 * was typed. Accepted forms: "79 1/2", "79.5", "23/32" (inches) or "30" (mm).
 */
export interface Measurement {
  readonly entered: string;
  readonly unit: LengthUnit;
  readonly status: InputStatus;
  /** Where the number came from, e.g. "AI mock-up" or "tape measure, 12 Mar". */
  readonly source?: string;
}

/** A measurement the user has been asked for but has not supplied yet. */
export type PendingMeasurement = Measurement | null;

/** A non-length decision (a style, a count, a yes/no) with the same status rule. */
export interface Choice<T> {
  readonly value: T;
  readonly status: InputStatus;
  readonly source?: string;
}

// ---------------------------------------------------------------------------
// Colour roles — fixed everywhere, never the only cue
// ---------------------------------------------------------------------------

export type ColorRole =
  | 'leftSide' // blue
  | 'rightSide' // green
  | 'bottom' // yellow
  | 'back' // purple
  | 'platform' // orange
  | 'divider' // red
  | 'faceFrame' // brown
  | 'door' // teal
  | 'drawerFront' // pink
  | 'support'; // grey — PROPOSED, not in the brief; see docs/OPEN-QUESTIONS.md Q9

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

export interface MaterialCatalog {
  readonly stock: readonly Stock[];
}

// ---------------------------------------------------------------------------
// Design — what the user enters
// ---------------------------------------------------------------------------

/**
 * How one opening gets its size along one direction:
 *  - opening: the clear hole in the face frame is given
 *  - front:   the door or drawer front size is given; opening = front - 2 x overlay
 *  - drawerBox: sized from a reused drawer box plus slide clearance (rule L4)
 *  - fill:    takes an equal share of whatever space is left (rule L3)
 */
export type SizeSpec =
  | { readonly by: 'opening'; readonly value: Measurement }
  | { readonly by: 'front'; readonly value: Measurement }
  | { readonly by: 'drawerBox' }
  | { readonly by: 'fill' };

export type FrontStyle = 'slab' | 'shaker';

export type SlideType = 'sideMount' | 'underMount' | 'centerMount' | 'woodRunner';

/** An existing drawer box being reused. Measured outside to outside. */
export interface ReusedDrawerBox {
  readonly outsideWidth: PendingMeasurement;
  readonly outsideHeight: PendingMeasurement;
  readonly outsideDepth: PendingMeasurement;
}

export interface DrawerSpec {
  readonly id: string;
  readonly frontStyle: Choice<FrontStyle>;
  readonly height: SizeSpec;
  /** Present when an existing box is reused; only the front is new. */
  readonly reusedBox?: ReusedDrawerBox;
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

export interface BoxDesign {
  /** Outside of left side panel to outside of right side panel (rule B1). */
  readonly width: Measurement;
  /** Bottom edge to top edge of the side panels; excludes platform and top. */
  readonly height: Measurement;
  /** Back of the box to the front edge of the side panels; excludes face frame and doors. */
  readonly depth: Measurement;
  readonly caseMaterial: MaterialId;
  readonly backMaterial: MaterialId;
  /** A side that will be seen in the finished room gets no visible fasteners (rule J2). */
  readonly exposedSides: Choice<{ readonly left: boolean; readonly right: boolean }>;
  /** Width of the strips that tie the top front edge together (rule B6). */
  readonly topSupportWidth: Measurement;
}

export interface FaceFrameDesign {
  readonly material: MaterialId;
  /** Width of every vertical frame piece ("stile"). */
  readonly stileWidth: Measurement;
  readonly topRailWidth: Measurement;
  readonly bottomRailWidth: Measurement;
  /** Width of the horizontal piece between two drawers in a column. */
  readonly drawerRailWidth: Measurement;
}

export interface FrontsDesign {
  /** How far each door and drawer front laps over the frame on every edge. */
  readonly overlay: Measurement;
  readonly slabMaterial: MaterialId;
  readonly shakerFrameMaterial: MaterialId;
  readonly shakerFrameWidth: Measurement;
  readonly shakerPanelMaterial: MaterialId;
  /** How deep the centre panel sits in the frame's groove on each edge (rule D5). */
  readonly panelGrooveDepth: Measurement;
  /** null until the user tells us which slides the reused drawers run on. */
  readonly slideType: Choice<SlideType> | null;
}

export interface PlatformDesign {
  readonly lumber: MaterialId;
  /** 'matchBox' ties the platform width to the box width so they cannot drift apart. */
  readonly width: 'matchBox' | Measurement;
  readonly depth: Measurement;
  readonly toeKickMaterial: MaterialId;
  /**
   * Normally omitted: toe kick height is derived from the platform (rule P5).
   * If a value is entered it is checked against the platform, never trusted.
   */
  readonly toeKickHeight?: Measurement;
}

export interface CountertopDesign {
  readonly description: string;
  /** Used only for finished height (rule H1); the top itself is made by others. */
  readonly thickness: Measurement;
}

export type JoineryMethod = 'pocketHolesAndGlue';

/** Where the cabinet will go. Used for fit checks only. */
export interface SiteMeasurements {
  readonly wallSpaceWidth: PendingMeasurement;
  readonly finishedHeightWanted: PendingMeasurement;
  readonly finishedDepthWanted: PendingMeasurement;
}

export interface VanityDesign {
  readonly projectType: 'vanity';
  readonly id: string;
  readonly name: string;
  readonly displayUnit: LengthUnit;
  readonly tapeIncrement: TapeIncrement;
  readonly joinery: Choice<JoineryMethod>;
  readonly site: SiteMeasurements;
  readonly box: BoxDesign;
  readonly faceFrame: FaceFrameDesign;
  /** Left to right as you face the cabinet. */
  readonly bays: readonly Bay[];
  readonly fronts: FrontsDesign;
  readonly platform: PlatformDesign;
  readonly countertop: CountertopDesign;
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
  /** Path into the design or catalog, e.g. "box.width", so the UI can jump to it. */
  readonly source: string;
}

/** How one dimension of a part was worked out. */
export interface Derivation {
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

export interface Step {
  readonly number: number;
  readonly title: string;
  /** Written template filled in with this plan's numbers; never AI-generated. */
  readonly templateId: string;
  readonly values: Readonly<Record<string, Ticks | number | string>>;
  /** Parts added in this step (highlighted in the drawing). */
  readonly partIds: readonly PartId[];
  /** Parts placed in earlier steps (muted in the drawing). */
  readonly earlierPartIds: readonly PartId[];
  readonly checklist: readonly string[];
}

// ---------------------------------------------------------------------------
// Engine boundary
// ---------------------------------------------------------------------------

/** Every input the plan used, flattened, so a plan can show confirmed vs assumed. */
export interface ResolvedInput {
  readonly path: string;
  readonly label: string;
  readonly value: Ticks | string | number | boolean;
  readonly status: InputStatus;
}

export interface PlanResult {
  readonly inputs: readonly ResolvedInput[];
  readonly issues: readonly ValidationIssue[];
  /** False when any issue has severity "error"; parts, materials and steps are then empty. */
  readonly canGeneratePlan: boolean;
  readonly parts: readonly Part[];
  readonly materials: readonly MaterialLine[];
  readonly steps: readonly Step[];
}

/** The whole engine, as seen from outside. Implemented in Phase 1. */
export type GeneratePlan = (design: Design, catalog: MaterialCatalog) => PlanResult;

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
}
