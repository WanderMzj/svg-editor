import { Numbers } from '../domain/Numbers';
import { Shape } from '../domain/Shape';
import { Command } from './Command';

/** `move <id> <dx> <dy>` — a delta for leaves and composites alike. */
export class MoveCommand implements Command {
  constructor(
    private readonly shape: Shape,
    private readonly dx: number,
    private readonly dy: number,
  ) {}

  execute(): string[] {
    this.shape.moveBy(this.dx, this.dy);
    return [this.describe(false)];
  }

  undo(): string[] {
    this.shape.moveBy(-this.dx, -this.dy);
    return [this.describe(true)];
  }

  private describe(reverted: boolean): string {
    const sign = reverted ? -1 : 1;
    const dx = Numbers.format(sign * this.dx);
    const dy = Numbers.format(sign * this.dy);
    if (this.shape.anchor() === null) {
      const verb = reverted ? 'moved back by' : 'moved by';
      return `${this.shape.label} ${verb} (${dx},${dy})`;
    }
    const anchor = this.shape.anchor();
    if (!anchor) {
      return `${this.shape.label} moved`;
    }
    return `${this.shape.label} moved ${reverted ? 'back ' : ''}to (${Numbers.format(
      anchor.x,
    )},${Numbers.format(anchor.y)})`;
  }
}
