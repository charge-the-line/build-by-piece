/**
 * The fixed instructional colours. Data only.
 *
 * These are teaching colours, not wood colours, and they are the same on the
 * shopping list, cut diagrams, exploded view and steps. Colour is never the
 * only cue: every part also shows its part ID.
 */
import type { ColorRole } from './types';

export interface ColorRoleInfo {
  readonly role: ColorRole;
  readonly colorName: string;
  readonly hex: string;
  /** Text colour that stays readable on top of `hex`. */
  readonly textHex: '#000000' | '#ffffff';
  readonly label: string;
}

export const colorRoles: readonly ColorRoleInfo[] = [
  { role: 'leftSide', colorName: 'blue', hex: '#1f5fbf', textHex: '#ffffff', label: 'Left side' },
  { role: 'rightSide', colorName: 'green', hex: '#1e7d32', textHex: '#ffffff', label: 'Right side' },
  { role: 'bottom', colorName: 'yellow', hex: '#f2c200', textHex: '#000000', label: 'Bottom' },
  { role: 'back', colorName: 'purple', hex: '#6a3fb5', textHex: '#ffffff', label: 'Back' },
  { role: 'platform', colorName: 'orange', hex: '#e8730c', textHex: '#000000', label: 'Platform and toe kick' },
  { role: 'divider', colorName: 'red', hex: '#c62828', textHex: '#ffffff', label: 'Interior dividers' },
  { role: 'faceFrame', colorName: 'brown', hex: '#7a4a21', textHex: '#ffffff', label: 'Face frame' },
  { role: 'door', colorName: 'teal', hex: '#0b7f7f', textHex: '#ffffff', label: 'Doors' },
  { role: 'drawerFront', colorName: 'pink', hex: '#e86aa6', textHex: '#000000', label: 'Drawer fronts' },
  { role: 'support', colorName: 'grey', hex: '#5f6368', textHex: '#ffffff', label: 'Support pieces' },
  // Proposed, awaiting approval (docs/OPEN-QUESTIONS.md).
  { role: 'drawerBox', colorName: 'white', hex: '#ffffff', textHex: '#000000', label: 'Drawer boxes' },
];
