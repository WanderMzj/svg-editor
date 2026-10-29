import { EditorError } from '../domain/EditorError';
import { Shape } from '../domain/Shape';
import { ShapeContainer } from '../domain/ShapeContainer';
import { SvgDocument } from '../domain/SvgDocument';
import { Group } from '../domain/shapes/Group';
import { Command } from './Command';

/** `addto <gid> <id>` — moves an existing shape into a container as last child. */
export class AddToCommand implements Command {
  private readonly from: ShapeContainer;
  private readonly fromIndex: number;

  constructor(
    private readonly group: Group,
    private readonly shape: Shape,
  ) {
    const from = shape.parent;
    if (!from) {
      throw new EditorError(`no such shape: ${shape.id}`);
    }
    if (SvgDocument.isSelfOrDescendant(group, shape)) {
      throw new EditorError(`cannot move a container into its own descendant: ${group.id}`);
    }
    this.from = from;
    this.fromIndex = from.indexOf(shape);
  }

  execute(): string[] {
    this.from.removeChild(this.shape);
    this.group.append(this.shape);
    return [`${this.shape.label} added to g#${this.group.id}`];
  }

  undo(): string[] {
    this.group.removeChild(this.shape);
    this.from.insertAt(this.fromIndex, this.shape);
    return [`${this.shape.label} moved back out of g#${this.group.id}`];
  }
}
