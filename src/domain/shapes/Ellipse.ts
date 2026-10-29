import { LeafShape } from '../LeafShape';

/** `<ellipse cx cy rx ry>` */
export class Ellipse extends LeafShape {
  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id, 'ellipse', ['cx', 'cy', 'rx', 'ry'], ['cx', 'cy'], { cx, cy, rx, ry });
  }

  protected override axisDelta(field: string, dx: number, dy: number): number {
    return field === 'cx' ? dx : dy;
  }

  protected override anchorFields(): [string, string] {
    return ['cx', 'cy'];
  }

  override geometryTokens(): string[] {
    return [
      this.token('cx', 'cx'),
      this.token('cy', 'cy'),
      this.token('rx', 'rx'),
      this.token('ry', 'ry'),
    ];
  }
}
