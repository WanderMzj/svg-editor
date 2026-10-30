import { EditorError } from '../../domain/EditorError';
import { Numbers } from '../../domain/Numbers';
import { Shape } from '../../domain/Shape';
import { ShapeContainer } from '../../domain/ShapeContainer';
import { SvgDocument } from '../../domain/SvgDocument';

/** Parsing helpers shared by the command handlers. */
export class Args {
  static number(raw: string | undefined, what: string): number {
    if (raw === undefined) {
      throw new EditorError(`missing argument: ${what}`);
    }
    return Numbers.parse(raw);
  }

  static require<T>(value: T | undefined, what: string): T {
    if (value === undefined) {
      throw new EditorError(`missing argument: ${what}`);
    }
    return value;
  }

  static expectCount(args: readonly string[], min: number, max: number, syntax: string): void {
    if (args.length < min || args.length > max) {
      throw new EditorError(`usage: ${syntax}`);
    }
  }
}

/** Parses the optional trailing `in <containerId>` clause. */
export function splitInClause(
  tokens: readonly string[],
): { args: string[]; containerId: string | null } {
  const at = tokens.lastIndexOf('in');
  if (at < 0) {
    return { args: [...tokens], containerId: null };
  }
  if (at !== tokens.length - 2) {
    return { args: [...tokens], containerId: null };
  }
  return { args: tokens.slice(0, at), containerId: tokens[tokens.length - 1] };
}

/** Resolves the target of a `create ... in <id>` clause. */
export function resolveParent(
  doc: SvgDocument,
  containerId: string | null,
): { container: ShapeContainer; shape: Shape | null } {
  if (containerId === null) {
    return { container: doc.root, shape: null };
  }
  return { container: doc.findContainer(containerId), shape: doc.find(containerId) };
}
