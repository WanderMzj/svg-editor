import { EditSession } from '../commands/EditSession';
import { SvgDocument } from '../domain/SvgDocument';
import { FileSystem } from '../ports/FileSystem';
import { ShapeReader } from '../ports/ShapeReader';
import { ShapeWriter } from '../ports/ShapeWriter';

/**
 * The collaborators a command handler needs: the current document, the undo
 * session and the io ports. Handlers never import `fs` or the DOM.
 */
export class EditorContext {
  private current: SvgDocument | null = null;
  readonly session = new EditSession();

  constructor(
    readonly fs: FileSystem,
    readonly reader: ShapeReader,
    readonly writer: ShapeWriter,
  ) {}

  get document(): SvgDocument {
    return this.requireDocument();
  }

  get documentOrNull(): SvgDocument | null {
    return this.current;
  }

  setDocument(doc: SvgDocument): void {
    this.current = doc;
  }

  requireDocument(): SvgDocument {
    if (!this.current) {
      throw new NoDocumentError();
    }
    return this.current;
  }
}

/** Carries the exact spec message for "no document yet". */
export class NoDocumentError extends Error {
  constructor() {
    super("no document. use 'init' or 'read' first");
    this.name = 'EditorError';
  }
}
