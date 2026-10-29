import { EditorError } from '../domain/EditorError';
import { Numbers } from '../domain/Numbers';
import { Shape } from '../domain/Shape';
import { Command } from './Command';

/**
 * `scale <id> <factor>` — every geometric number is multiplied by the factor;
 * on a container the recursion reaches each descendant.
 */
export class ScaleCommand implements Command {
  constructor(
    private readonly shape: Shape,
    private readonly factor: number,
  ) {
    if (!(factor > 0)) {
      throw new EditorError('scale factor must be positive');
    }
  }

  execute(): string[] {
    this.shape.scaleBy(this.factor);
    return [`${this.shape.label} scaled by ${Numbers.format(this.factor)}`];
  }

  undo(): string[] {
    this.shape.scaleBy(1 / this.factor);
    return [`${this.shape.label} scaled back by ${Numbers.format(1 / this.factor)}`];
  }
}
