import { EditorError } from '../domain/EditorError';
import { Shape } from '../domain/Shape';
import { ShapeContainer } from '../domain/ShapeContainer';
import { SvgDocument } from '../domain/SvgDocument';
import { Command } from './Command';

/** `delete <id>` — removes a shape with its entire subtree as one undo unit. */
export class DeleteCommand implements Command {
  private readonly parent: ShapeContainer;
  private index = -1;

  constructor(
    private readonly doc: SvgDocument,
    private readonly shape: Shape,
  ) {
    const parent = shape.parent;
    if (!parent) {
      throw new EditorError(`no such shape: ${shape.id}`);
    }
    this.parent = parent;
  }

  execute(): string[] {
    this.index = this.parent.removeChild(this.shape);
    this.doc.unregister(this.shape);
    const where = this.parent instanceof Shape ? ` from g#${this.parent.id}` : '';
    return [`${this.shape.label} deleted${where}`];
  }

  undo(): string[] {
    this.parent.insertAt(this.index, this.shape);
    this.doc.register(this.shape);
    const where = this.parent instanceof Shape ? ` into g#${this.parent.id}` : '';
    return [`${this.shape.label} restored${where}`];
  }
}
