import { EditorContext } from '../../app/EditorContext';
import { CommandHandler } from '../CommandHandler';
import { Args } from './HandlerSupport';

/** `undo` */
export class UndoHandler implements CommandHandler {
  readonly name = 'undo';
  readonly syntax = 'undo';
  readonly summary = '撤销上一次编辑命令';
  readonly group = 'history' as const;

  constructor(private readonly ctx: EditorContext) {}

  run(args: readonly string[]): string[] {
    Args.expectCount(args, 0, 0, this.syntax);
    this.ctx.requireDocument();
    return this.ctx.session.undo();
  }
}

/** `redo` */
export class RedoHandler implements CommandHandler {
  readonly name = 'redo';
  readonly syntax = 'redo';
  readonly summary = '重做';
  readonly group = 'history' as const;

  constructor(private readonly ctx: EditorContext) {}

  run(args: readonly string[]): string[] {
    Args.expectCount(args, 0, 0, this.syntax);
    this.ctx.requireDocument();
    return this.ctx.session.redo();
  }
}
