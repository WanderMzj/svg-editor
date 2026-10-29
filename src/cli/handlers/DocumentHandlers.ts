import { ResizeCanvasCommand } from '../../commands/ResizeCanvasCommand';
import { EditorError } from '../../domain/EditorError';
import { Numbers } from '../../domain/Numbers';
import { SvgDocument } from '../../domain/SvgDocument';
import { EditorContext } from '../../app/EditorContext';
import { CommandHandler } from '../CommandHandler';
import { Args } from './HandlerSupport';

/** `init [w] [h]` */
export class InitHandler implements CommandHandler {
  readonly name = 'init';
  readonly syntax = 'init [w] [h]';
  readonly summary = '新建空画布（默认 800x600），作为当前文档';
  readonly group = 'document' as const;

  constructor(private readonly ctx: EditorContext) {}

  run(args: readonly string[]): string[] {
    Args.expectCount(args, 0, 2, this.syntax);
    const width = args[0] === undefined ? 800 : Args.number(args[0], 'w');
    const height = args[1] === undefined ? 600 : Args.number(args[1], 'h');
    const doc = new SvgDocument(width, height);
    doc.resize(width, height);
    this.ctx.setDocument(doc);
    this.ctx.session.reset();
    return [`canvas ${SvgDocument.describeSize(doc.width, doc.height)} created`];
  }
}

/** `read <file.svg>` */
export class ReadHandler implements CommandHandler {
  readonly name = 'read';
  readonly syntax = 'read <file.svg>';
  readonly summary = '读入 SVG 文件为当前文档；缺 id 自动补并警告';
  readonly group = 'document' as const;

  constructor(private readonly ctx: EditorContext) {}

  run(args: readonly string[]): string[] {
    Args.expectCount(args, 1, 1, this.syntax);
    const path = args[0];
    const text = this.ctx.fs.readText(path);
    const { document, warnings } = this.ctx.reader.read(text, path);
    this.ctx.setDocument(document);
    this.ctx.session.reset();
    return [
      ...warnings.map((warning) => `warning: ${warning}`),
      `read ${path} (${document.elementCount()} elements)`,
    ];
  }
}

/** `save [file.svg]` */
export class SaveHandler implements CommandHandler {
  readonly name = 'save';
  readonly syntax = 'save [file.svg]';
  readonly summary = '保存当前文档；无参数时保存到读入时的路径';
  readonly group = 'document' as const;

  constructor(private readonly ctx: EditorContext) {}

  run(args: readonly string[]): string[] {
    Args.expectCount(args, 0, 1, this.syntax);
    const doc = this.ctx.document;
    const path = args[0] ?? doc.sourcePath;
    if (!path) {
      throw new EditorError('no file name: give one, e.g. save demo.svg');
    }
    this.ctx.fs.writeText(path, this.ctx.writer.write(doc));
    doc.sourcePath = path;
    this.ctx.session.lockForIo();
    return [`saved to ${path} (${doc.elementCount()} elements)`];
  }
}

/** `canvas [w] [h]` */
export class CanvasHandler implements CommandHandler {
  readonly name = 'canvas';
  readonly syntax = 'canvas [w] [h]';
  readonly summary = '无参数显示画布尺寸；带参数修改尺寸';
  readonly group = 'document' as const;

  constructor(private readonly ctx: EditorContext) {}

  run(args: readonly string[]): string[] {
    Args.expectCount(args, 0, 2, this.syntax);
    const doc = this.ctx.document;
    if (args.length === 0) {
      return [`canvas ${SvgDocument.describeSize(doc.width, doc.height)}`];
    }
    if (args.length !== 2) {
      throw new EditorError(`usage: ${this.syntax}`);
    }
    const width = Numbers.parse(args[0]);
    const height = Numbers.parse(args[1]);
    const output = new ResizeCanvasCommand(doc, width, height).execute();
    this.ctx.session.lockForIo();
    return output;
  }
}
