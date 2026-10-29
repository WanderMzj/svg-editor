import { EditorError } from './EditorError';

/** Parsing / formatting of the scalar values used by SVG geometry. */
export class Numbers {
  private static readonly PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

  static parse(raw: string): number {
    const text = raw.trim();
    if (!Numbers.PATTERN.test(text)) {
      throw new EditorError(`invalid number: ${raw}`);
    }
    return Number(text);
  }

  static format(value: number): string {
    if (!Number.isFinite(value)) {
      throw new EditorError(`invalid number: ${value}`);
    }
    if (Number.isInteger(value)) {
      return String(value);
    }
    return String(Number(value.toFixed(6)));
  }
}
