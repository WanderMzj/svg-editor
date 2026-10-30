import { Paint } from './Paint';
import { ShapeContainer } from './ShapeContainer';
import { ShapeKind } from './ShapeKind';
import { ShapeState } from './ShapeState';

export type Point = { x: number; y: number };

/**
 * Composite pattern: `Shape` is the uniform component for leaves (rect, circle,
 * ellipse, line, text) and composites (`g`). Every editing command works on
 * `Shape` and never asks which concrete class it is holding.
 */
export abstract class Shape {
  private readonly _id: string;
  private readonly _kind: ShapeKind;
  private _parent: ShapeContainer | null = null;
  protected readonly paint = new Paint();

  protected constructor(id: string, kind: ShapeKind) {
    this._id = id;
    this._kind = kind;
  }

  get id(): string {
    return this._id;
  }

  get kind(): ShapeKind {
    return this._kind;
  }

  get parent(): ShapeContainer | null {
    return this._parent;
  }

  attachTo(parent: ShapeContainer): void {
    this._parent = parent;
  }

  detach(): void {
    this._parent = null;
  }

  /** Contract that a composite can serve as a container; leaves answer false. */
  asContainer(): ShapeContainer | null {
    return null;
  }

  /** Applies a white-listed attribute; returns false when the attribute is unknown. */
  applyAttribute(attribute: string, value: string): boolean {
    if (this.paint.apply(attribute, value)) {
      return true;
    }
    return this.applyOwnAttribute(attribute, value);
  }

  protected abstract applyOwnAttribute(attribute: string, value: string): boolean;

  /** Attribute names this shape accepts beyond the shared paint attributes. */
  abstract ownAttributeNames(): readonly string[];

  private static readonly PAINT_ATTRIBUTES = ['fill', 'stroke', 'stroke-width'];

  supportsAttribute(attribute: string): boolean {
    return (
      Shape.PAINT_ATTRIBUTES.includes(attribute) || this.ownAttributeNames().includes(attribute)
    );
  }

  /** `fill=red` / `text="hi"` — what the undo line echoes back. */
  describeAttribute(attribute: string): string {
    const own = this.ownAttributeValues().get(attribute);
    if (own !== undefined) {
      return attribute === 'text' ? `text="${own}"` : `${attribute}=${own}`;
    }
    const paint = new Map(this.paint.describe().map((token) => {
      const at = token.indexOf('=');
      return [token.slice(0, at), token.slice(at + 1)] as [string, string];
    }));
    return `${attribute}=${paint.get(attribute) ?? 'none'}`;
  }

  /** Current value of an own (non-paint) attribute, as displayed text. */
  ownAttributeValues(): Map<string, string> {
    return new Map();
  }

  abstract moveBy(dx: number, dy: number): void;

  abstract scaleBy(factor: number): void;

  /** The point quoted by "moved to (x,y)" / tree output; null for composites. */
  abstract anchor(): Point | null;

  /** Inline geometry text used by `tree` and `show`. */
  abstract geometryTokens(): string[];

  /** Presentation attributes as `fill=red`, shared by tree / show. */
  describePaint(): string[] {
    return this.paint.describe();
  }

  /** Text content for `<text>`; null for everything else. */
  abstract textContent(): string | null;

  /** Presentation + geometry attributes, in serialization order. */
  abstract xmlAttributes(): Array<[string, string]>;

  abstract captureState(): ShapeState;

  abstract restoreState(state: ShapeState): void;

  get label(): string {
    return `${this.kind}#${this.id}`;
  }
}
