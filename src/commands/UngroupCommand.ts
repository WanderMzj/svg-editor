import { EditorError } from '../domain/EditorError';
import { Shape } from '../domain/Shape';
import { ShapeContainer } from '../domain/ShapeContainer';
import { SvgDocument } from '../domain/SvgDocument';
import { Group } from '../domain/shapes/Group';
import { Command } from './Command';

/**
 * `ungroup <gid>` — the group disappears and its children take its place in
 * the parent, one undo unit.
 */
export class UngroupCommand implements Command {
  private readonly host: ShapeContainer;
  private readonly index: number;
  private readonly children: Shape[];

  constructor(
    private readonly doc: SvgDocument,
    private readonly group: Group,
  ) {
    const host = group.parent;
    if (!host) {
      throw new EditorError(`cannot ungroup top-level container: ${group.id}`);
    }
    if (host === doc.root) {
      throw new EditorError(`cannot ungroup top-level container: ${group.id}`);
    }
    this.host = host;
    this.index = host.indexOf(group);
    this.children = [...group.children];
  }

  execute(): string[] {
    for (const child of this.children) {
      this.group.removeChild(child);
    }
    this.host.removeChild(this.group);
    this.children.forEach((child, offset) => this.host.insertAt(this.index + offset, child));
    return [
      `g#${this.group.id} ungrouped: ${this.children.length} ${
        this.children.length === 1 ? 'child' : 'children'
      } promoted`,
    ];
  }

  undo(): string[] {
    for (const child of this.children) {
      this.host.removeChild(child);
    }
    this.host.insertAt(this.index, this.group);
    for (const child of this.children) {
      this.group.append(child);
    }
    return [
      `g#${this.group.id} restored with ${this.children.length} ${
        this.children.length === 1 ? 'child' : 'children'
      }`,
    ];
  }
}
