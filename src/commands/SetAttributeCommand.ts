import { EditorError } from '../domain/EditorError';
import { Shape } from '../domain/Shape';
import { ShapeState } from '../domain/ShapeState';
import { Command } from './Command';

/**
 * `set <id> <attr> <value>` — the white-list lives in the shape itself
 * (`applyAttribute`), so the command stays generic.
 */
export class SetAttributeCommand implements Command {
  private previous: ShapeState;

  constructor(
    private readonly shape: Shape,
    private readonly attribute: string,
    private readonly value: string,
  ) {
    this.previous = shape.captureState();
    if (!shape.supportsAttribute(attribute)) {
      throw new EditorError(`unknown attribute: ${attribute}`);
    }
  }

  execute(): string[] {
    this.shape.applyAttribute(this.attribute, this.value);
    return [`${this.shape.label} updated: ${this.attribute}="${this.value}"`];
  }

  undo(): string[] {
    this.shape.restoreState(this.previous);
    const restored = this.shape.describeAttribute(this.attribute);
    return [`${this.shape.label} updated: ${restored}`];
  }
}
