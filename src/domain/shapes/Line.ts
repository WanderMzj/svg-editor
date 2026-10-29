import { LeafShape } from '../LeafShape';
import { Numbers } from '../Numbers';

/** `<line x1 y1 x2 y2>` */
export class Line extends LeafShape {
  constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id, 'line', ['x1', 'y1', 'x2', 'y2'], ['x1', 'y1', 'x2', 'y2'], { x1, y1, x2, y2 });
  }

  protected override axisDelta(field: string, dx: number, dy: number): number {
    return field === 'x1' || field === 'x2' ? dx : dy;
  }

  protected override anchorFields(): [string, string] {
    return ['x1', 'y1'];
  }

  override geometryTokens(): string[] {
    return [`(${this.n('x1')},${this.n('y1')}) -> (${this.n('x2')},${this.n('y2')})`];
  }

  private n(field: string): string {
    return Numbers.format(this.getNumber(field));
  }
}
