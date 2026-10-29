import { AddToCommand } from '../../commands/AddToCommand';
import { assertIdFree, CreateShapeCommand } from '../../commands/CreateShapeCommand';
import { DeleteCommand } from '../../commands/DeleteCommand';
import { GroupCommand } from '../../commands/GroupCommand';
import { MoveCommand } from '../../commands/MoveCommand';
import { ScaleCommand } from '../../commands/ScaleCommand';
import { SetAttributeCommand } from '../../commands/SetAttributeCommand';
import { UngroupCommand } from '../../commands/UngroupCommand';
import { ZOrderCommand } from '../../commands/ZOrderCommand';
import { EditorError } from '../../domain/EditorError';
import { Shape } from '../../domain/Shape';
import { ShapeFactory } from '../../domain/ShapeFactory';
import { Group } from '../../domain/shapes/Group';
import { EditorContext } from '../../app/EditorContext';
import { CommandHandler } from '../CommandHandler';
import { Args, resolveParent, splitInClause } from './HandlerSupport';

/** Base class: every editing handler needs the document and the undo session. */
abstract class EditHandler implements CommandHandler {
  readonly group = 'edit' as const;
  abstract readonly name: string;
  abstract readonly syntax: string;
  abstract readonly summary: string;

  constructor(protected readonly ctx: EditorContext) {}

  abstract run(args: readonly string[], rest: string): string[];

  protected shape(id: string): Shape {
    return this.ctx.document.find(id);
  }

  protected requireGroup(id: string): Group {
    const shape = this.shape(id);
    if (!(shape instanceof Group)) {
      throw new EditorError(`not a container: ${id}`);
    }
    return shape;
  }
}

/** `create <type> <id> [params…] [in <containerId>]` */
export class CreateHandler extends EditHandler {
  readonly name = 'create';
  readonly syntax = 'create <type> <id> [params…] [in <containerId>]';
  readonly summary = '创建图形（rect/circle/ellipse/line/text/g）';

  run(args: readonly string[]): string[] {
    if (args.length < 2) {
      throw new EditorError(`usage: ${this.syntax}`);
    }
    const type = args[0];
    if (!ShapeFactory.isKnown(type)) {
      throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    const id = args[1];
    const doc = this.ctx.document;
    assertIdFree(doc, id);
    const { args: params, containerId } = splitInClause(args.slice(2));
    const parent = resolveParent(doc, containerId);
    const shape = ShapeFactory.create(type, id, params);
    return this.ctx.session.record(new CreateShapeCommand(doc, shape, parent.container, parent.shape));
  }
}

/** `delete <id>` */
export class DeleteHandler extends EditHandler {
  readonly name = 'delete';
  readonly syntax = 'delete <id>';
  readonly summary = '删除图形（容器则连同全部子孙）';

  run(args: readonly string[]): string[] {
    Args.expectCount(args, 1, 1, this.syntax);
    return this.ctx.session.record(new DeleteCommand(this.ctx.document, this.shape(args[0])));
  }
}

/** `move <id> <dx> <dy>` */
export class MoveHandler extends EditHandler {
  readonly name = 'move';
  readonly syntax = 'move <id> <dx> <dy>';
  readonly summary = '平移（增量）；作用于容器时整体平移';

  run(args: readonly string[]): string[] {
    Args.expectCount(args, 3, 3, this.syntax);
    const dx = Args.number(args[1], 'dx');
    const dy = Args.number(args[2], 'dy');
    return this.ctx.session.record(new MoveCommand(this.shape(args[0]), dx, dy));
  }
}

/** `scale <id> <factor>` */
export class ScaleHandler extends EditHandler {
  readonly name = 'scale';
  readonly syntax = 'scale <id> <factor>';
  readonly summary = '等比缩放：几何属性同乘 factor；容器递归到子孙';

  run(args: readonly string[]): string[] {
    Args.expectCount(args, 2, 2, this.syntax);
    const factor = Args.number(args[1], 'factor');
    return this.ctx.session.record(new ScaleCommand(this.shape(args[0]), factor));
  }
}

/** `set <id> <attr> <value>` */
export class SetHandler extends EditHandler {
  readonly name = 'set';
  readonly syntax = 'set <id> <attr> <value>';
  readonly summary = '设置属性（fill/stroke/stroke-width/几何属性/text）';

  run(args: readonly string[]): string[] {
    if (args.length < 3) {
      throw new EditorError(`usage: ${this.syntax}`);
    }
    const [id, attribute] = args;
    const value = args.slice(2).join(' ');
    return this.ctx.session.record(new SetAttributeCommand(this.shape(id), attribute, value));
  }
}

/** `group <newGid> <id1> <id2>…` */
export class GroupHandler extends EditHandler {
  readonly name = 'group';
  readonly syntax = 'group <newGid> <id1> <id2>…';
  readonly summary = '新建容器并收入若干图形';

  run(args: readonly string[]): string[] {
    if (args.length < 2) {
      throw new EditorError(`usage: ${this.syntax}`);
    }
    const doc = this.ctx.document;
    const members = args.slice(1).map((id) => this.shape(id));
    return this.ctx.session.record(new GroupCommand(doc, args[0], members));
  }
}

/** `ungroup <gid>` */
export class UngroupHandler extends EditHandler {
  readonly name = 'ungroup';
  readonly syntax = 'ungroup <gid>';
  readonly summary = '解散容器，子图形提升到父级';

  run(args: readonly string[]): string[] {
    Args.expectCount(args, 1, 1, this.syntax);
    return this.ctx.session.record(new UngroupCommand(this.ctx.document, this.requireGroup(args[0])));
  }
}

/** `addto <gid> <id>` */
export class AddToHandler extends EditHandler {
  readonly name = 'addto';
  readonly syntax = 'addto <gid> <id>';
  readonly summary = '把已有图形移入容器';

  run(args: readonly string[]): string[] {
    Args.expectCount(args, 2, 2, this.syntax);
    return this.ctx.session.record(new AddToCommand(this.requireGroup(args[0]), this.shape(args[1])));
  }
}

/** `front <id>` / `back <id>` */
export class ZOrderHandler extends EditHandler {
  readonly summary = '调整 z-order（同级最前/最后）';
  private readonly toFront: boolean;

  constructor(ctx: EditorContext, toFront: boolean) {
    super(ctx);
    this.toFront = toFront;
  }

  get name(): string {
    return this.toFront ? 'front' : 'back';
  }

  get syntax(): string {
    return `${this.name} <id>`;
  }

  run(args: readonly string[]): string[] {
    Args.expectCount(args, 1, 1, this.syntax);
    return this.ctx.session.record(new ZOrderCommand(this.shape(args[0]), this.toFront));
  }
}
