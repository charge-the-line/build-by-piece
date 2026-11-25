/**
 * Test fixture: the AI-generated mock-up, kept ONLY for its mistakes.
 *
 * The mock-up is no longer the design being built (see vanity-01.ts). Its
 * known errors stay here so the engine can be shown to make each one
 * impossible. Never use these numbers in a plan.
 *
 * Data only. Lengths are text; the engine parses them (rule U2).
 */
import type { Choice, DrawerSpec, Measurement, VanityDesign } from '../types';

const fromMockup = (entered: string): Measurement => ({
  entered,
  unit: 'in',
  status: 'assumed',
  origin: 'user',
  note: 'AI mock-up, not measured',
});

const mockupChoice = <T>(value: T): Choice<T> => ({
  value,
  status: 'assumed',
  origin: 'user',
  note: 'AI mock-up',
});

const frontWidth = fromMockup('13');

const drawerColumn = (column: 'left' | 'right'): readonly DrawerSpec[] => [
  { id: `${column}-drawer-1`, frontStyle: mockupChoice('slab'), height: { by: 'front', value: fromMockup('5') } },
  { id: `${column}-drawer-2`, frontStyle: mockupChoice('slab'), height: { by: 'front', value: fromMockup('5') } },
  { id: `${column}-drawer-3`, frontStyle: mockupChoice('shaker'), height: { by: 'front', value: fromMockup('10') } },
];

/**
 * The vanity as the mock-up describes it. It is over-constrained on purpose:
 * every column is fixed at the drawn front size, so neither the widths nor
 * the heights add up, and the toe kick is taller than its platform. The
 * engine must refuse it and explain why.
 */
export const mockupDesign: VanityDesign = {
  projectType: 'vanity',
  id: 'mockup',
  name: 'Mock-up (known to be wrong)',

  width: fromMockup('79 1/2'),
  depth: fromMockup('20 1/2'),
  height: fromMockup('30'),

  overrides: {
    ends: { left: mockupChoice('exposed'), right: mockupChoice('exposed') },
    faceFrame: {
      topRailWidth: fromMockup('3'),
      bottomRailWidth: fromMockup('3'),
    },
    fronts: { shakerFrameWidth: fromMockup('2 1/4') },
    layout: [
      {
        kind: 'drawerColumn',
        id: 'left-drawers',
        width: { by: 'front', value: frontWidth },
        drawers: drawerColumn('left'),
      },
      {
        kind: 'door',
        id: 'left-door',
        width: { by: 'front', value: frontWidth },
        height: { by: 'front', value: fromMockup('16') },
        style: mockupChoice('shaker'),
        hingeSide: mockupChoice('left'),
      },
      {
        kind: 'door',
        id: 'right-door',
        width: { by: 'front', value: frontWidth },
        height: { by: 'front', value: fromMockup('16') },
        style: mockupChoice('shaker'),
        hingeSide: mockupChoice('right'),
      },
      {
        kind: 'drawerColumn',
        id: 'right-drawers',
        width: { by: 'front', value: frontWidth },
        drawers: drawerColumn('right'),
      },
    ],
    platform: { toeKickHeight: fromMockup('4') },
  },
};

/**
 * Numbers printed on the mock-up, as plain text, so tests can assert the
 * engine rejects or contradicts each one.
 */
export const mockupClaims = {
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
