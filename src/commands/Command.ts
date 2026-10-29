/**
 * Command pattern: every editing operation is an object with `execute` / `undo`.
 * A macro command (group, delete of a subtree...) can be composed of child
 * commands so that "one editing command = one undo unit" holds by construction.
 */
export interface Command {
  /** Applies the change and returns the success line(s) for the user. */
  execute(): string[];

  /** Reverts exactly what `execute` did and returns the feedback line(s). */
  undo(): string[];
}
