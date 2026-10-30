import { EditorError } from '../domain/EditorError';
import { Command } from './Command';

/**
 * Undo bookkeeping: two stacks, plus the "io commands lock undo" rule from the
 * spec (after `init` / `read` / `save` / `canvas <w> <h>` undo and redo are
 * refused until the next editing command unlocks them again).
 */
export class EditSession {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];
  private ioLocked = false;

  /** Runs a new editing command; on success the redo stack is dropped. */
  record(command: Command): string[] {
    const output = command.execute();
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.ioLocked = false;
    return output;
  }

  undo(): string[] {
    this.assertAllowed('undo');
    const command = this.undoStack.pop();
    if (!command) {
      return ['nothing to undo'];
    }
    const output = command.undo();
    this.redoStack.push(command);
    return output;
  }

  redo(): string[] {
    this.assertAllowed('redo');
    const command = this.redoStack.pop();
    if (!command) {
      return ['nothing to redo'];
    }
    const output = command.execute();
    this.undoStack.push(command);
    return output;
  }

  /**
   * `save` / `canvas <w> <h>`: history stays, but undo is refused until the
   * next editing command.
   */
  lockForIo(): void {
    this.ioLocked = true;
  }

  /** `init` / `read`: the document is replaced, so the old history is dropped. */
  reset(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.ioLocked = true;
  }

  private assertAllowed(action: string): void {
    if (this.ioLocked) {
      throw new EditorError(`${action} not allowed after io command`);
    }
  }
}
