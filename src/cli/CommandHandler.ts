/** One CLI command: its name, its syntax line and its implementation. */
export interface CommandHandler {
  readonly name: string;
  readonly syntax: string;
  readonly summary: string;
  readonly group: 'document' | 'edit' | 'view' | 'history';

  /** Runs the command and returns the lines to print (already prefixed as needed). */
  run(args: readonly string[], rest: string): string[];
}
