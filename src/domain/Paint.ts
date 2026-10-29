import { EditorError } from './EditorError';
import { Numbers } from './Numbers';
import { PaintState } from './PaintState';

/**
 * Presentation attributes shared by every shape (`fill` / `stroke` / `stroke-width`).
 * Kept as a value object so that every shape does not have to repeat the same fields.
 */
export class Paint {
  private _fill: string | null = null;
  private _stroke: string | null = null;
  private _strokeWidth: number | null = null;

  get fill(): string | null {
    return this._fill;
  }

  get stroke(): string | null {
    return this._stroke;
  }

  get strokeWidth(): number | null {
    return this._strokeWidth;
  }

  /** Returns true when `attr` was a presentation attribute and has been applied. */
  apply(attr: string, value: string): boolean {
    switch (attr) {
      case 'fill':
        this._fill = value;
        return true;
      case 'stroke':
        this._stroke = value;
        return true;
      case 'stroke-width': {
        const width = Numbers.parse(value);
        if (width < 0) {
          throw new EditorError(`invalid stroke-width: ${value}`);
        }
        this._strokeWidth = width;
        return true;
      }
      default:
        return false;
    }
  }

  toXmlAttributes(): Array<[string, string]> {
    const out: Array<[string, string]> = [];
    if (this._fill !== null) {
      out.push(['fill', this._fill]);
    }
    if (this._stroke !== null) {
      out.push(['stroke', this._stroke]);
    }
    if (this._strokeWidth !== null) {
      out.push(['stroke-width', Numbers.format(this._strokeWidth)]);
    }
    return out;
  }

  /** `['fill=red', 'stroke=black']`, used by tree / show. */
  describe(): string[] {
    return this.toXmlAttributes().map(([name, value]) => `${name}=${value}`);
  }

  state(): PaintState {
    return { fill: this._fill, stroke: this._stroke, strokeWidth: this._strokeWidth };
  }

  restore(state: PaintState): void {
    this._fill = state.fill;
    this._stroke = state.stroke;
    this._strokeWidth = state.strokeWidth;
  }
}
