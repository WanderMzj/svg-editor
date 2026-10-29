import { EditorError } from './EditorError';
import { Numbers } from './Numbers';
import { Point, Shape } from './Shape';
import { ShapeKind } from './ShapeKind';
import { ShapeState } from './ShapeState';

/**
 * Behaviour shared by every primitive shape: a fixed set of numeric geometry
 * attributes (`cx`, `width`, ...) and the rules for moving / scaling them.
 */
export abstract class LeafShape extends Shape {
  private readonly numbers = new Map<string, number>();
  private readonly fields: readonly string[];
  private readonly movableFields: readonly string[];

  protected constructor(
    id: string,
    kind: ShapeKind,
    fields: readonly string[],
    movableFields: readonly string[],
    initial: Record<string, number>,
  ) {
    super(id, kind);
    this.fields = fields;
    this.movableFields = movableFields;
    for (const field of fields) {
      this.numbers.set(field, initial[field] ?? 0);
    }
  }

  get numberFields(): readonly string[] {
    return this.fields;
  }

  getNumber(field: string): number {
    const value = this.numbers.get(field);
    if (value === undefined) {
      throw new EditorError(`unknown attribute: ${field}`);
    }
    return value;
  }

  setNumber(field: string, value: number): void {
    if (!this.numbers.has(field)) {
      throw new EditorError(`unknown attribute: ${field}`);
    }
    this.numbers.set(field, value);
  }

  override moveBy(dx: number, dy: number): void {
    for (const field of this.movableFields) {
      this.numbers.set(field, this.getNumber(field) + this.axisDelta(field, dx, dy));
    }
  }

  /** How far this field travels for the given delta pair. */
  protected abstract axisDelta(field: string, dx: number, dy: number): number;

  override scaleBy(factor: number): void {
    for (const field of this.fields) {
      this.numbers.set(field, this.getNumber(field) * factor);
    }
  }

  override anchor(): Point | null {
    const [fx, fy] = this.anchorFields();
    return { x: this.getNumber(fx), y: this.getNumber(fy) };
  }

  protected abstract anchorFields(): [string, string];

  protected override applyOwnAttribute(attribute: string, value: string): boolean {
    if (!this.numbers.has(attribute)) {
      return false;
    }
    this.setNumber(attribute, Numbers.parse(value));
    return true;
  }

  override ownAttributeNames(): readonly string[] {
    return this.fields;
  }

  override ownAttributeValues(): Map<string, string> {
    const out = new Map<string, string>();
    for (const field of this.fields) {
      out.set(field, Numbers.format(this.getNumber(field)));
    }
    return out;
  }

  override captureState(): ShapeState {
    const numbers: Record<string, number> = {};
    for (const field of this.fields) {
      numbers[field] = this.getNumber(field);
    }
    return { paint: this.paint.state(), numbers };
  }

  override restoreState(state: ShapeState): void {
    this.paint.restore(state.paint);
    for (const field of this.fields) {
      const value = state.numbers[field];
      if (value !== undefined) {
        this.numbers.set(field, value);
      }
    }
  }

  /** `x=120` — one inline geometry token for tree / show. */
  protected token(label: string, field: string): string {
    return `${label}=${Numbers.format(this.getNumber(field))}`;
  }

  /** `(20,40) "My Diagram"` style prefix: the anchor point of the shape. */
  protected pointToken(): string {
    const [fx, fy] = this.anchorFields();
    return `(${Numbers.format(this.getNumber(fx))},${Numbers.format(this.getNumber(fy))})`;
  }

  override geometryTokens(): string[] {
    return this.fields.map((field) => `${field}=${Numbers.format(this.getNumber(field))}`);
  }

  override xmlAttributes(): Array<[string, string]> {
    const out: Array<[string, string]> = this.fields.map(
      (field) => [xmlNameOf(field), Numbers.format(this.getNumber(field))] as [string, string],
    );
    return out.concat(this.paint.toXmlAttributes());
  }

  override textContent(): string | null {
    return null;
  }
}

/** `width` is spelled the same in our command language and in SVG; kept for clarity. */
function xmlNameOf(field: string): string {
  return field;
}
