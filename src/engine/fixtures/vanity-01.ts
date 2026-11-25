/**
 * Test fixture: bathroom vanity 01.
 *
 * Exactly what the user gives the app: three numbers and which ends touch a
 * wall. Everything else comes from src/engine/defaults.
 *
 * To change the test case, edit the three numbers below. Nothing else needs
 * to change.
 */
import type { VanityDesign } from '../types';
import { userChoice, userEntered } from '../defaults/values';

export const vanity01: VanityDesign = {
  projectType: 'vanity',
  id: 'vanity-01',
  name: 'Bathroom vanity',

  width: userEntered('60'),
  depth: userEntered('21'),
  height: userEntered('30'),

  overrides: {
    ends: {
      left: userChoice('wall'),
      right: userChoice('exposed'),
    },
  },
};
