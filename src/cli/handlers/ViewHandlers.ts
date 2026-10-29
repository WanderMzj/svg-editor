import { EditorContext } from '../../app/EditorContext';
import { CommandHandler } from '../CommandHandler';
import { ShowRenderer } from '../ShowRenderer';
import { TreeRenderer } from '../TreeRenderer';
import { Args } from './HandlerSupport';

/** `tree [id]` */
export class TreeHandler implements CommandHandler {
  readonly name = 'tree';
  readonly syntax = 'tree [id]';
  readonly summary = '结构树（默认全文档）';
  readonly group = 'view' as const;

  constructor(private readonly ctx: EditorContext) {}

  run(args: readonly string[]): string[] {
    Args.expectCount(args, 0, 1, this.syntax);
    const doc = this.ctx.document;
    if (args.length === 1) {
      doc.find(args[0]);
    }
    return new TreeRenderer().render(doc, args[0]);
  }
}

/** `show <id>` */
export class ShowHandler implements CommandHandler {
  readonly name = 'show';
  readonly syntax = 'show <id>';
  readonly summary = '单个图形的属性明细';
  readonly group = 'view' as const;

  constructor(private readonly ctx: EditorContext) {}

  run(args: readonly string[]): string[] {
    Args.expectCount(args, 1, 1, this.syntax);
    const doc = this.ctx.document;
    return new ShowRenderer().render(doc, doc.find(args[0]));
  }
}
