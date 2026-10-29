import { CommandHandler } from '../CommandHandler';
import { CommandRegistry } from '../CommandRegistry';

/** `help` — prints every command with its syntax. */
export class HelpHandler implements CommandHandler {
  readonly name = 'help';
  readonly syntax = 'help';
  readonly summary = '显示全部命令与语法';
  readonly group = 'view' as const;

  constructor(private readonly registry: CommandRegistry) {}

  run(): string[] {
    const titles: Record<string, string> = {
      document: '文档类（执行后 undo/redo 禁止）',
      edit: '图形编辑类（可 undo/redo）',
      view: '显示类（不进入 undo 栈）',
      history: '撤销重做',
    };
    const lines: string[] = ['commands:'];
    for (const group of ['document', 'edit', 'view', 'history'] as const) {
      lines.push(`  ${titles[group]}`);
      for (const handler of this.registry.all().filter((item) => item.group === group)) {
        lines.push(`    ${handler.syntax.padEnd(52)}${handler.summary}`);
      }
    }
    lines.push('  # 开头为注释；一条命令可用 ; 分隔多条');
    return lines;
  }
}
