import { EditorError } from '../domain/EditorError';
import { CommandHandler } from './CommandHandler';

/**
 * Name-based dispatch #1 (the other one is the shape factory): command name ->
 * handler. A map instead of a `switch` so that `help` and the error message for
 * an unknown command read from the same source of truth.
 */
export class CommandRegistry {
  private readonly byName = new Map<string, CommandHandler>();

  register(handler: CommandHandler): void {
    if (this.byName.has(handler.name)) {
      throw new Error(`command registered twice: ${handler.name}`);
    }
    this.byName.set(handler.name, handler);
  }

  all(): CommandHandler[] {
    return [...this.byName.values()];
  }

  resolve(name: string): CommandHandler {
    const handler = this.byName.get(name);
    if (!handler) {
      throw new EditorError(`unknown command: ${name} (type 'help' for the list)`);
    }
    return handler;
  }
}
