import { expect, it } from 'vitest';
import { eventPoint } from './neon-coordinates.js';

it('aligns simulation event coordinates with the rendered cell centers', () => {
  expect(eventPoint(2000, 3000)).toEqual({ x: 2.5, y: 3.5 });
  expect(eventPoint(2750, 3000)).toEqual({ x: 3.25, y: 3.5 });
});
