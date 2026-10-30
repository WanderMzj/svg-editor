import { EditorContext } from '../app/EditorContext';
import { NodeFileSystem } from '../infrastructure/NodeFileSystem';
import { SvgReader } from '../infrastructure/svg/SvgReader';
import { SvgWriter } from '../infrastructure/svg/SvgWriter';
import { FileSystem } from '../ports/FileSystem';
import { Output } from '../ports/Output';
import { CommandRegistry } from './CommandRegistry';
import { Shell } from './Shell';
import { AddToHandler, CreateHandler, DeleteHandler, GroupHandler, MoveHandler, ScaleHandler, SetHandler, UngroupHandler, ZOrderHandler } from './handlers/EditHandlers';
import { CanvasHandler, InitHandler, ReadHandler, SaveHandler } from './handlers/DocumentHandlers';
import { HelpHandler } from './handlers/HelpHandler';
import { RedoHandler, UndoHandler } from './handlers/HistoryHandlers';
import { ShowHandler, TreeHandler } from './handlers/ViewHandlers';

export interface ShellBundle {
  shell: Shell;
  context: EditorContext;
}

export interface PortOverrides {
  fs?: FileSystem;
}

/**
 * Composition root: the only place that knows both the ports and the handlers.
 * Tests inject an in-memory file system here.
 */
export function createShell(output: Output, ports: PortOverrides = {}): ShellBundle {
  const context = new EditorContext(ports.fs ?? new NodeFileSystem(), new SvgReader(), new SvgWriter());
  const registry = new CommandRegistry();
  registry.register(new InitHandler(context));
  registry.register(new ReadHandler(context));
  registry.register(new SaveHandler(context));
  registry.register(new CanvasHandler(context));
  registry.register(new CreateHandler(context));
  registry.register(new DeleteHandler(context));
  registry.register(new MoveHandler(context));
  registry.register(new ScaleHandler(context));
  registry.register(new SetHandler(context));
  registry.register(new GroupHandler(context));
  registry.register(new UngroupHandler(context));
  registry.register(new AddToHandler(context));
  registry.register(new ZOrderHandler(context, true));
  registry.register(new ZOrderHandler(context, false));
  registry.register(new TreeHandler(context));
  registry.register(new ShowHandler(context));
  registry.register(new UndoHandler(context));
  registry.register(new RedoHandler(context));
  registry.register(new HelpHandler(registry));
  return { shell: new Shell(registry, output), context };
}
