import { EditorError } from '../domain/EditorError';
import { Shape } from '../domain/Shape';
import { ShapeContainer } from '../domain/ShapeContainer';
import { SvgDocument } from '../domain/SvgDocument';
import { Command } from './Command';

/** `create ...` — appends a shape (plus its whole subtree) to a container. */
export class CreateShapeCommand implements Command {
  constructor(
    private readonly doc: SvgDocument,
    private readonly shape: Shape,
    private readonly container: ShapeContainer,
    private readonly inContainer: Shape | null,
  ) {}

  execute(): string[] {
    this.container.append(this.shape);
    this.doc.register(this.shape, false);
    const where = this.inContainer ? ` in g#${this.inContainer.id}` : '';
    return [`${this.shape.label} created${where}`];
  }

  undo(): string[] {
    this.doc.unregister(this.shape);
    this.container.removeChild(this.shape);
    return [`${this.shape.label} deleted`];
  }
}

/** Guards against creating an id that is already taken. */
export function assertIdFree(doc: SvgDocument, id: string): void {
  if (doc.has(id)) {
    throw new EditorError(`id already exists: ${id}`);
  }
}
