import { LeafShape } from '../LeafShape';
import { ShapeState } from '../ShapeState';

/** `<text x y>content</text>` — the text lives in a child node, not an attribute. */
export class Text extends LeafShape {
  private content: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id, 'text', ['x', 'y'], ['x', 'y'], { x, y });
    this.content = content;
  }

  protected override axisDelta(field: string, dx: number, dy: number): number {
    return field === 'x' ? dx : dy;
  }

  protected override anchorFields(): [string, string] {
    return ['x', 'y'];
  }

  override applyOwnAttribute(attribute: string, value: string): boolean {
    if (attribute === 'text') {
      this.content = value;
      return true;
    }
    return super.applyOwnAttribute(attribute, value);
  }

  override textContent(): string | null {
    return this.content;
  }

  override ownAttributeNames(): readonly string[] {
    return [...super.ownAttributeNames(), 'text'];
  }

  override ownAttributeValues(): Map<string, string> {
    const out = super.ownAttributeValues();
    out.set('text', this.content);
    return out;
  }

  override captureState(): ShapeState {
    return { ...super.captureState(), text: this.content };
  }

  override restoreState(state: ShapeState): void {
    super.restoreState(state);
    if (state.text !== undefined) {
      this.content = state.text;
    }
  }

  override geometryTokens(): string[] {
    return [`${this.pointToken()} "${this.content}"`];
  }
}
