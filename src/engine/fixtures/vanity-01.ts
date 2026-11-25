/**
 * Test fixture: bathroom vanity 01.
 *
 * EVERY NUMBER HERE IS ASSUMED. They come from an AI-generated mock-up, not
 * from a tape measure. To swap in real measurements, edit the MEASURED block
 * below and change that line's helper from `assumed(...)` to `confirmed(...)`.
 * Nothing else in this file needs to change.
 *
 * This file is data only. Lengths are written as the text a person would
 * type; the engine parses them (docs/RULES.md, rule U2).
 */
import type {
  Choice,
  DrawerSpec,
  MaterialCatalog,
  Measurement,
  VanityDesign,
} from '../types';

const MOCKUP = 'AI mock-up (not measured)';

const assumed = (entered: string, source = MOCKUP): Measurement => ({
  entered,
  unit: 'in',
  status: 'assumed',
  source,
});

/** Use this for a value Max has measured: confirmed('79 7/16', 'tape, 3 Dec'). */
export const confirmed = (entered: string, source: string): Measurement => ({
  entered,
  unit: 'in',
  status: 'confirmed',
  source,
});

const assumedChoice = <T>(value: T, source = MOCKUP): Choice<T> => ({
  value,
  status: 'assumed',
  source,
});

// ---------------------------------------------------------------------------
// MEASURED — replace these as real numbers arrive
// ---------------------------------------------------------------------------

const M = {
  // Box
  boxWidth: assumed('79 1/2'),
  boxHeight: assumed('30'),
  boxDepth: assumed('20 1/2'),
  topSupportWidth: assumed('3', 'default, not in the mock-up'),

  // Sheet goods — measure the real sheet; 3/4" plywood is often 23/32"
  caseThickness: assumed('3/4', 'shop label, not measured'),
  panelThickness: assumed('1/4', 'shop label, not measured'),

  // Face frame
  frameThickness: assumed('3/4'),
  stileWidth: assumed('1 1/2'),
  topRailWidth: assumed('3'),
  bottomRailWidth: assumed('3'),
  drawerRailWidth: assumed('1 1/2', 'default, not in the mock-up'),

  // Doors and drawer fronts, as drawn
  overlay: assumed('1/2', 'default, not in the mock-up'),
  frontWidth: assumed('13'),
  smallDrawerFrontHeight: assumed('5'),
  largeDrawerFrontHeight: assumed('10'),
  doorHeight: assumed('16'),
  shakerFrameWidth: assumed('2 1/4'),
  panelGrooveDepth: assumed('3/8', 'default, not in the mock-up'),

  // Platform
  platformDepth: assumed('17 1/2'),
  /** The mock-up's toe kick height. Known to be wrong; kept so the check can catch it. */
  toeKickHeightAsDrawn: assumed('4'),

  // Top
  countertopThickness: assumed('1 1/4'),
} as const;

// ---------------------------------------------------------------------------
// Material catalog (placeholder data)
// ---------------------------------------------------------------------------

/** Standard published sizes; these do not depend on the mock-up. */
const standard = (entered: string): Measurement => ({
  entered,
  unit: 'in',
  status: 'confirmed',
  source: 'standard size',
});

export const vanity01Catalog: MaterialCatalog = {
  stock: [
    {
      kind: 'sheet',
      id: 'oak-ply-3-4',
      name: '3/4" oak plywood',
      species: 'oak',
      nominalThickness: '3/4"',
      actualThickness: M.caseThickness,
      sheetLength: standard('96'),
      sheetWidth: standard('48'),
      hasGrain: true,
    },
    {
      kind: 'sheet',
      id: 'oak-ply-1-4',
      name: '1/4" oak plywood',
      species: 'oak',
      nominalThickness: '1/4"',
      actualThickness: M.panelThickness,
      sheetLength: standard('96'),
      sheetWidth: standard('48'),
      hasGrain: true,
    },
    {
      kind: 'board',
      id: 'oak-1x4',
      name: 'Solid oak board, 1x4',
      species: 'oak',
      nominalSize: '1x4',
      actualThickness: M.frameThickness,
      actualWidth: standard('3 1/2'),
      stockLengths: [standard('72'), standard('96')],
    },
    {
      kind: 'board',
      id: 'oak-1x6',
      name: 'Solid oak board, 1x6',
      species: 'oak',
      nominalSize: '1x6',
      actualThickness: M.frameThickness,
      actualWidth: standard('5 1/2'),
      stockLengths: [standard('72'), standard('96')],
    },
    {
      kind: 'board',
      id: 'stud-2x4',
      name: '2x4 stud',
      nominalSize: '2x4',
      actualThickness: standard('1 1/2'),
      actualWidth: standard('3 1/2'),
      stockLengths: [standard('96')],
    },
  ],
};

// ---------------------------------------------------------------------------
// Design
// ---------------------------------------------------------------------------

/** Reused drawer boxes have not been measured yet. */
const unmeasuredBox = { outsideWidth: null, outsideHeight: null, outsideDepth: null } as const;

const drawerColumn = (column: 'left' | 'right'): readonly DrawerSpec[] => [
  {
    id: `${column}-drawer-1`,
    frontStyle: assumedChoice('slab'),
    height: { by: 'front', value: M.smallDrawerFrontHeight },
    reusedBox: unmeasuredBox,
  },
  {
    id: `${column}-drawer-2`,
    frontStyle: assumedChoice('slab'),
    height: { by: 'front', value: M.smallDrawerFrontHeight },
    reusedBox: unmeasuredBox,
  },
  {
    id: `${column}-drawer-3`,
    frontStyle: assumedChoice('shaker'),
    height: { by: 'front', value: M.largeDrawerFrontHeight },
    reusedBox: unmeasuredBox,
  },
];

/**
 * The vanity exactly as the mock-up describes it. It is deliberately
 * over-constrained: all four columns are fixed at the drawn front width, so
 * the layout does NOT add up to the box width. The engine must refuse it with
 * a clear, visual explanation (known error 4).
 */
export const vanity01: VanityDesign = {
  projectType: 'vanity',
  id: 'vanity-01',
  name: 'Bathroom vanity (mock-up numbers)',
  displayUnit: 'in',
  tapeIncrement: '1/16in',
  joinery: assumedChoice('pocketHolesAndGlue', 'default'),
  site: {
    wallSpaceWidth: null,
    finishedHeightWanted: null,
    finishedDepthWanted: null,
  },
  box: {
    width: M.boxWidth,
    height: M.boxHeight,
    depth: M.boxDepth,
    caseMaterial: 'oak-ply-3-4',
    backMaterial: 'oak-ply-3-4',
    exposedSides: assumedChoice({ left: false, right: true }),
    topSupportWidth: M.topSupportWidth,
  },
  faceFrame: {
    material: 'oak-1x4',
    stileWidth: M.stileWidth,
    topRailWidth: M.topRailWidth,
    bottomRailWidth: M.bottomRailWidth,
    drawerRailWidth: M.drawerRailWidth,
  },
  bays: [
    {
      kind: 'drawerColumn',
      id: 'left-drawers',
      width: { by: 'front', value: M.frontWidth },
      drawers: drawerColumn('left'),
    },
    {
      kind: 'door',
      id: 'left-door',
      width: { by: 'front', value: M.frontWidth },
      height: { by: 'front', value: M.doorHeight },
      style: assumedChoice('shaker'),
      hingeSide: assumedChoice('left', 'default'),
    },
    {
      kind: 'door',
      id: 'right-door',
      width: { by: 'front', value: M.frontWidth },
      height: { by: 'front', value: M.doorHeight },
      style: assumedChoice('shaker'),
      hingeSide: assumedChoice('right', 'default'),
    },
    {
      kind: 'drawerColumn',
      id: 'right-drawers',
      width: { by: 'front', value: M.frontWidth },
      drawers: drawerColumn('right'),
    },
  ],
  fronts: {
    overlay: M.overlay,
    slabMaterial: 'oak-1x6',
    shakerFrameMaterial: 'oak-1x4',
    shakerFrameWidth: M.shakerFrameWidth,
    shakerPanelMaterial: 'oak-ply-1-4',
    panelGrooveDepth: M.panelGrooveDepth,
    slideType: null,
  },
  platform: {
    lumber: 'stud-2x4',
    width: 'matchBox',
    depth: M.platformDepth,
    toeKickMaterial: 'oak-1x4',
    toeKickHeight: M.toeKickHeightAsDrawn,
  },
  countertop: {
    description: 'Granite, 3 cm',
    thickness: M.countertopThickness,
  },
};

// ---------------------------------------------------------------------------
// What the mock-up CLAIMED — the wrong answers the engine must never produce
// ---------------------------------------------------------------------------

/**
 * Numbers printed on the mock-up, kept as plain text so tests can assert the
 * engine rejects or contradicts each one. Never feed these into a plan.
 */
export const vanity01MockupClaims = {
  /** Known error 1: five different overall widths on one drawing. */
  overallWidths: ['79 2/3', '79 1/3', '79 1/2', '79 3/5', '79 5/8'],
  /** Known error 2: side stile length on a 30" box. */
  sideStileLength: '25 1/2',
  /** Known error 3: what was drawn versus what was in the cut list. */
  drawn: { verticalDividers: 4, hasRailsBetweenDrawers: true },
  cutList: { centerStiles: 1, drawerRails: 0 },
  /** Known error 4: four columns plus the listed stiles, against the box width. */
  layout: { columns: 4, columnWidth: '13', claimedTotal: '56 1/2', boxWidth: '79 1/2' },
  /** Known error 5: end supports as long as the whole platform is deep. */
  platformEndSupportLength: '17 1/2',
  /** Known error 6: toe kick taller than the platform it covers. */
  toeKick: { height: '4', platformHeight: '3 1/2' },
} as const;
