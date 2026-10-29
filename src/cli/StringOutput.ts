import { Output } from '../ports/Output';

/** Collects the output of a scripted run (used by tests and `--exec`). */
export class StringOutput implements Output {
  readonly lines: string[] = [];

  line(text: string): void {
    this.lines.push(text);
  }

  toString(): string {
    return this.lines.join('\n');
  }
}
