/**
 * The app's defaults for a vanity: every value beyond width, depth and
 * height. Data only. Each one is shown to the user with its note and can be
 * changed (docs/RULES.md, rule G1). Rule numbers refer to docs/RULES.md.
 */
import type { Bay, DrawerSpec, VanityOptions } from '../types';
import { defaultTools } from './tools';
import { appDefault, defaultChoice } from './values';


/**
 * A drawer column of `count` drawers: small flat fronts on top, each one
 * board high, and one large framed front at the bottom that takes the rest.
 */
const drawersFor = (bayId: string, count: number): readonly DrawerSpec[] =>
  Array.from({ length: count }, (_, i): DrawerSpec => {
    const last = i === count - 1;
    return {
      id: `${bayId.replace(/-drawers$/, '')}-drawer-${i + 1}`,
      frontStyle: last ? defaultChoice('shaker', 'Matches the doors.') : defaultChoice('slab', 'Too short for a framed front.'),
      height: last ? { by: 'fill' } : { by: 'frontBoard' },
    };
  });

const drawerBay = (id: string, count: number): Bay => ({ kind: 'drawerColumn', id, width: { by: 'fill' }, drawers: drawersFor(id, count) });

const doorBay = (id: string, hinge: 'left' | 'right'): Bay => ({
  kind: 'door',
  id,
  width: { by: 'fill' },
  height: { by: 'fill' },
  style: defaultChoice('shaker', 'Framed door with a flat centre panel.'),
  hingeSide: defaultChoice(hinge, 'Neighbouring doors open away from each other.'),
});

/** What goes in one bay: a door, or a column of this many drawers. */
export type BayChoice = 'door' | number;

export const MAX_DRAWERS_PER_COLUMN = 4;
export const MAX_BAYS = 6;

/**
 * Builds a layout from a simple left-to-right list, e.g. [3, 'door', 'door', 3].
 * Every bay shares the width equally and every size is left to the rules,
 * so a layout made this way always adds up (rule L1).
 */
export function layoutFrom(choices: readonly BayChoice[]): readonly Bay[] {
  let doors = 0;
  return choices.map((choice, i) => {
    const id = `bay-${i + 1}`;
    if (choice === 'door') {
      doors += 1;
      return doorBay(id, doors % 2 === 1 ? 'left' : 'right');
    }
    return drawerBay(id, choice);
  });
}

/** The reverse of layoutFrom, for showing a layout as simple choices. */
export const choicesOf = (layout: readonly Bay[]): BayChoice[] => layout.map((bay) => (bay.kind === 'door' ? 'door' : bay.drawers.length));

/**
 * Rule L0: drawers, two doors, drawers, all four the same width. Kept as
 * data so it is visible and so other widths can get other proposals later.
 */
export const proposedVanityLayout: readonly Bay[] = [
  drawerBay('left-drawers', 3),
  doorBay('left-door', 'left'),
  doorBay('right-door', 'right'),
  drawerBay('right-drawers', 3),
];

export const vanityDefaults: VanityOptions = {
  displayUnit: 'in',
  tapeIncrement: '1/16in',
  joinery: defaultChoice('pocketHolesAndGlue', 'One jig, no long clamps, joints pull themselves tight.'),

  approach: defaultChoice('useWhatIOwn', 'Uses the tools you have ticked, and buys as little as possible.'),
  tools: defaultTools,

  ends: {
    left: defaultChoice('exposed', 'Finished and flush, which is safe whichever way the cabinet ends up.'),
    right: defaultChoice('exposed', 'Finished and flush, which is safe whichever way the cabinet ends up.'),
    wallOverhang: appDefault('1/4', 'Lets the frame be trimmed to fit a wall that is not straight.'),
  },

  box: {
    caseMaterial: 'oak-ply-3-4',
    backMaterial: 'oak-ply-1-4',
    supportMaterial: 'pine-1x4',
    spacerMaterials: ['oak-ply-3-4', 'oak-ply-1-4'],
    spacerWidth: appDefault('2', 'Wide enough to take the slide and its screws.'),
  },

  faceFrame: {
    material: 'oak-1x2',
    stileWidth: 'boardWidth',
    topRailWidth: 'boardWidth',
    bottomRailWidth: 'boardWidth',
    drawerRailWidth: 'boardWidth',
  },

  layout: 'auto',

  fronts: {
    overlay: appDefault('1/2', 'Hides small errors in the frame and matches common hinges.'),
    minimumGap: appDefault('1/8', 'Smallest gap that keeps two fronts from rubbing.'),
    slabMaterial: 'oak-1x6',
    shakerFrameMaterial: 'oak-1x3',
    shakerFrameWidth: 'boardWidth',
    shakerPanelMaterial: 'oak-ply-1-4',
    panelMethod: defaultChoice('auto', 'The app picks the easiest method your tools allow.'),
    panelGrooveDepth: appDefault('3/8', 'Deep enough to hold the panel; cut with a router.'),
    panelRecessWidth: appDefault('3/8', 'The recess a common bearing-guided bit cuts.'),
    panelBackClearance: appDefault('1/4', 'Keeps a panel on the back of a door clear of the face frame.'),
    minimumPanelLap: appDefault('3/8', 'Enough frame for the glue to hold the panel.'),
    hingeInset: appDefault('3', 'A common place for hinges: clear of the corners, easy to reach.'),
    panelClearance: appDefault('1/8', 'Room for the panel to slide into its groove.'),
    hinge: 'hinge-face-frame-half-inch',
  },

  drawers: {
    slide: 'slide-side-mount',
    boxMaterial: 'oak-ply-3-4',
    bottomMaterial: 'oak-ply-1-4',
    heightClearance: appDefault('1', 'Room above and below the drawer box so it never rubs.'),
    rearClearance: appDefault('1', 'Room behind the slide.'),
    screwEndInset: appDefault('2', 'Close enough to the end to hold it, far enough not to split it.'),
    screwSpacing: appDefault('8', 'Close enough that the joint cannot open between screws.'),
    spacerTolerance: appDefault('1/16', 'Slides can take up this much slack.'),
  },

  platform: {
    lumber: 'stud-2x4',
    toeSpace: appDefault('3', 'Standard room for your toes.'),
    supportSpacing: appDefault('16', 'Close enough that the cabinet floor cannot sag.'),
    toeKickMaterial: 'oak-1x4',
  },

  cutting: {
    kerf: appDefault('1/8', 'The width of wood a saw blade turns to dust.'),
    keepOffcutsFrom: appDefault('6', 'Leftovers this big both ways are worth labelling and keeping.'),
  },

  measuredThickness: {},

  countertop: {
    description: 'Stone top, installed by others',
    thickness: appDefault('1 1/4', 'Typical 3 cm stone. Only used to estimate the finished height.'),
  },
};

