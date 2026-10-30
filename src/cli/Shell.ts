import { Output } from '../ports/Output';
import { CommandRegistry } from './CommandRegistry';
import { Tokenizer } from './Tokenizer';

/**
 * The REPL: one line in, zero or more result lines out. All state lives in
 * `EditorContext`; the shell only tokenizes, dispatches and formats errors,
 * which is what makes it testable without a terminal.
 */
export class Shell {
  constructor(
    private readonly registry: CommandRegistry,
    private readonly out: Output,
  ) {}

  /** Executes a whole line (may contain several `;`-separated commands). */
  runLine(line: string): void {
    let statements: string[];
    try {
      statements = Tokenizer.splitStatements(line);
    } catch (error) {
      this.reportError(error);
      return;
    }
    for (const statement of statements) {
      this.runStatement(statement);
    }
  }

  runStatement(statement: string): void {
    let tokens: string[];
    try {
      tokens = Tokenizer.tokenize(statement);
    } catch (error) {
      this.reportError(error);
      return;
    }
    if (tokens.length === 0) {
      return;
    }
    const [name, ...args] = tokens;
    try {
      const handler = this.registry.resolve(name);
      for (const line of handler.run(args, statement)) {
        this.out.line(line);
      }
    } catch (error) {
      this.reportError(error);
    }
  }

  private reportError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.out.line(`error: ${message}`);
  }
}
