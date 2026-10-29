import { EditorError } from '../domain/EditorError';
import { Shape } from '../domain/Shape';
import { ShapeContainer } from '../domain/ShapeContainer';
import { SvgDocument } from '../domain/SvgDocument';
import { Command } from './Command';

/** `front <id>` / `back <id>` — moves a shape to the end / start of its siblings. */
export class ZOrderCommand implements Command {
  private readonly parent: ShapeContainer;
  private readonly from: number;

  constructor(
    private readonly shape: Shape,
    private readonly toFront: boolean,
  ) {
    const parent = shape.parent;
    if (!parent) {
      throw new EditorError(`no such shape: ${shape.id}`);
    }
    this.parent = parent;
    this.from = parent.indexOf(shape);
  }

  execute(): string[] {
    this.parent.removeChild(this.shape);
    if (this.toFront) {
      this.parent.append(this.shape);
    } else {
      this.parent.insertAt(0, this.shape);
    }
    return [`${this.shape.label} moved ${this.toFront ? 'to front' : 'to back'}`];
  }

  undo(): string[] {
    this.parent.removeChild(this.shape);
    this.parent.insertAt(this.from, this.shape);
    return [`${this.shape.label} moved back`];
  }
}
