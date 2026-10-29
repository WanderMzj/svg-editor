import { LeafShape } from '../LeafShape';

/** `<circle cx cy r>` */
export class Circle extends LeafShape {
  constructor(id: string, cx: number, cy: number, r: number) {
    super(id, 'circle', ['cx', 'cy', 'r'], ['cx', 'cy'], { cx, cy, r });
  }

  protected override axisDelta(field: string, dx: number, dy: number): number {
    return field === 'cx' ? dx : dy;
  }

  protected override anchorFields(): [string, string] {
    return ['cx', 'cy'];
  }

  override geometryTokens(): string[] {
    return [this.token('cx', 'cx'), this.token('cy', 'cy'), this.token('r', 'r')];
  }
}