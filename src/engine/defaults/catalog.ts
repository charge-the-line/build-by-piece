/**
 * Default material and hardware catalog. Placeholder data: generic items,
 * no brands, no prices. Sizes are data, never constants in engine code
 * (docs/RULES.md, rules M1 and M2).
 */
import type { MaterialCatalog } from '../types';
import { checkAtCutting, standardSize } from './values';

const sheet = { sheetLength: standardSize('96'), sheetWidth: standardSize('48') } as const;
const oakLengths = [standardSize('48'), standardSize('72'), standardSize('96')] as const;
const oakThickness = standardSize('3/4');

export const defaultCatalog: MaterialCatalog = {
  stock: [
    {
      kind: 'sheet',
      id: 'oak-ply-3-4',
      name: '3/4" oak plywood',
      species: 'oak',
      nominalThickness: '3/4"',
      actualThickness: checkAtCutting('3/4', 'Standard sheet. Real sheets are often 23/32"; measure yours.'),
      ...sheet,
      hasGrain: true,
    },
    {
      kind: 'sheet',
      id: 'oak-ply-1-4',
      name: '1/4" oak plywood',
      species: 'oak',
      nominalThickness: '1/4"',
      actualThickness: checkAtCutting('1/4', 'Standard sheet. Real sheets are often thinner; measure yours.'),
      ...sheet,
      hasGrain: true,
    },
    {
      kind: 'board',
      id: 'oak-1x2',
      name: 'Solid oak board, 1x2',
      species: 'oak',
      nominalSize: '1x2',
      actualThickness: oakThickness,
      actualWidth: standardSize('1 1/2'),
      stockLengths: oakLengths,
    },
    {
      kind: 'board',
      id: 'oak-1x3',
      name: 'Solid oak board, 1x3',
      species: 'oak',
      nominalSize: '1x3',
      actualThickness: oakThickness,
      actualWidth: standardSize('2 1/2'),
      stockLengths: oakLengths,
    },
    {
      kind: 'board',
      id: 'oak-1x4',
      name: 'Solid oak board, 1x4',
      species: 'oak',
      nominalSize: '1x4',
      actualThickness: oakThickness,
      actualWidth: standardSize('3 1/2'),
      stockLengths: oakLengths,
    },
    {
      kind: 'board',
      id: 'oak-1x6',
      name: 'Solid oak board, 1x6',
      species: 'oak',
      nominalSize: '1x6',
      actualThickness: oakThickness,
      actualWidth: standardSize('5 1/2'),
      stockLengths: oakLengths,
    },
    {
      kind: 'board',
      id: 'pine-1x4',
      name: 'Pine board, 1x4',
      species: 'pine',
      nominalSize: '1x4',
      actualThickness: standardSize('3/4'),
      actualWidth: standardSize('3 1/2'),
      stockLengths: [standardSize('72'), standardSize('96')],
    },
    {
      kind: 'board',
      id: 'stud-2x4',
      name: '2x4 stud',
      nominalSize: '2x4',
      actualThickness: standardSize('1 1/2'),
      actualWidth: standardSize('3 1/2'),
      stockLengths: [standardSize('96')],
    },
  ],
  hardware: [
    {
      kind: 'drawerSlide',
      id: 'slide-side-mount',
      name: 'Side-mount ball-bearing drawer slide, full extension',
      mount: 'side',
      clearancePerSide: standardSize('1/2'),
      stockLengths: ['12', '14', '16', '18', '20', '22'].map(standardSize),
    },
    {
      kind: 'hinge',
      id: 'hinge-face-frame-half-inch',
      name: 'Concealed face-frame hinge, 1/2" overlay, soft close',
      overlay: standardSize('1/2'),
      mountingWidth: standardSize('1 3/4'),
      boringBit: 'Hinge-boring bit, 35 mm (the size concealed hinges use)',
    },
  ],
  supplies: [
    { id: 'pocket-screws-coarse', name: 'Pocket screws for 3/4" plywood and pine (coarse thread)', use: 'The box, the drawer boxes and the supports.' },
    { id: 'pocket-screws-fine', name: 'Pocket screws for 3/4" hardwood (fine thread)', use: 'The oak face frame, doors and framed drawer fronts.' },
    { id: 'wood-glue', name: 'Wood glue', use: 'Every joint.' },
    { id: 'brad-nails', name: 'Small nails (brads) for 1/4" plywood', use: 'The back panel and the drawer bottoms.' },
    { id: 'construction-screws', name: 'Construction screws for 2x4s', use: 'The platform.' },
    { id: 'cabinet-screws', name: 'Cabinet screws long enough to reach the wall studs', use: 'Fixing the cabinet to the wall through the mounting strips.' },
    { id: 'shims', name: 'Shims', use: 'Levelling the platform.' },
    { id: 'sandpaper', name: 'Sandpaper', use: 'Smoothing edges and faces before finishing.' },
  ],
};
