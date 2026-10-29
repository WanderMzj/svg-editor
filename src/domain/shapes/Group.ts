import { Shape } from '../Shape';
import { ShapeContainer } from '../ShapeContainer';
import { ShapeState } from '../ShapeState';

/**
 * A `<g>` container: the Composite node of the tree.
 * Moving / scaling it recurses into every descendant, which is what makes
 * `move` / `scale` / `delete` work identically on groups and on leaves.
 */
export class Group extends Shape implements ShapeContainer {
  private readonly kids: Shape[] = [];

  constructor(id: string) {
    super(id, 'g');
  }

  get children(): readonly Shape[] {
    return this.kids;
  }

  override asContainer(): ShapeContainer {
    return this;
  }

  append(shape: Shape): void {
    this.kids.push(shape);
    shape.attachTo(this);
  }

  insertAt(index: number, shape: Shape): void {
    const at = Math.max(0, Math.min(index, this.kids.length));
    this.kids.splice(at, 0, shape);
    shape.attachTo(this);
  }

  removeChild(shape: Shape): number {
    const index = this.kids.indexOf(shape);
    if (index >= 0) {
      this.kids.splice(index, 1);
      shape.detach();
    }
    return index;
  }

  indexOf(shape: Shape): number {
    return this.kids.indexOf(shape);
  }

  override moveBy(dx: number, dy: number): void {
    for (const child of this.kids) {
      child.moveBy(dx, dy);
    }
  }

  override scaleBy(factor: number): void {
    for (const child of this.kids) {
      child.scaleBy(factor);
    }
  }

  override anchor(): null {
    return null;
  }

  override geometryTokens(): string[] {
    return [`${this.kids.length} ${this.kids.length === 1 ? 'child' : 'children'}`];
  }

  override textContent(): null {
    return null;
  }

  override xmlAttributes(): Array<[string, string]> {
    return this.paint.toXmlAttributes();
  }

  override ownAttributeNames(): readonly string[] {
    return [];
  }

  protected override applyOwnAttribute(_attribute: string, _value: string): boolean {
    return false;
  }

  override captureState(): ShapeState {
    return { paint: this.paint.state(), numbers: {} };
  }

  override restoreState(state: ShapeState): void {
    this.paint.restore(state.paint);
  }
}