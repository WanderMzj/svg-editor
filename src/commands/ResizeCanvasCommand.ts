import { SvgDocument } from '../domain/SvgDocument';
import { Numbers } from '../domain/Numbers';
import { Command } from './Command';

/** `canvas <w> <h>` — the canvas size is part of the document, so it is undoable. */
export class ResizeCanvasCommand implements Command {
  private readonly previousWidth: number;
  private readonly previousHeight: number;

  constructor(
    private readonly doc: SvgDocument,
    private readonly width: number,
    private readonly height: number,
  ) {
    this.previousWidth = doc.width;
    this.previousHeight = doc.height;
  }

  execute(): string[] {
    this.doc.resize(this.width, this.height);
    return [
      `canvas ${Numbers.format(this.doc.width)}x${Numbers.format(this.doc.height)} resized`,
    ];
  }

  undo(): string[] {
    this.doc.resize(this.previousWidth, this.previousHeight);
    return [
      `canvas ${Numbers.format(this.doc.width)}x${Numbers.format(this.doc.height)} restored`,
    ];
  }
}
