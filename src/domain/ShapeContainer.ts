import { Shape } from './Shape';

/**
 * The Composite half of the tree: something that owns child shapes.
 * The document root and every `<g>` implement it.
 */
export interface ShapeContainer {
  readonly children: readonly Shape[];
  append(shape: Shape): void;
  insertAt(index: number, shape: Shape): void;
  removeChild(shape: Shape): number;
  indexOf(shape: Shape): number;
}
