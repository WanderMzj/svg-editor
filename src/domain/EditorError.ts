/**
 * An error caused by the user (bad command, unknown id, ...).
 * The message is printed by the shell behind the `error: ` prefix.
 */
export class EditorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EditorError';
  }
}
