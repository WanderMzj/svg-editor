import { LeafShape } from '../LeafShape';

/** `<rect x y width height>` */
export class Rect extends LeafShape {
  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id, 'rect', ['x', 'y', 'width', 'height'], ['x', 'y'], { x, y, width, height });
  }

  protected override axisDelta(field: string, dx: number, _dy: number): number {
    return field === 'x' ? dx : _dy;
  }

  protected override anchorFields(): [string, string] {
    return ['x', 'y'];
  }

  override geometryTokens(): string[] {
    return [
      this.token('x', 'x'),
      this.token('y', 'y'),
      this.token('w', 'width'),
      this.token('h', 'height'),
    ];
  }
}