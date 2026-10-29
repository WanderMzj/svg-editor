import { PaintState } from './PaintState';

/** Value snapshot of a single shape (memento used by move / scale / set undo). */
export interface ShapeState {
  paint: PaintState;
  numbers: Record<string, number>;
  text?: string;
}
