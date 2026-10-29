/** Value snapshot of the presentation attributes (used by undo). */
export interface PaintState {
  fill: string | null;
  stroke: string | null;
  strokeWidth: number | null;
}
