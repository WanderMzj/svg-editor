import { EditorError } from '../domain/EditorError';
import { Shape } from '../domain/Shape';
import { ShapeContainer } from '../domain/ShapeContainer';
import { SvgDocument } from '../domain/SvgDocument';
import { Group } from '../domain/shapes/Group';
import { assertIdFree } from './CreateShapeCommand';
import { Command } from './Command';

interface Placement {
  shape: Shape;
  parent: ShapeContainer;
  index: number;
}

/**
 * `group <newGid> <id1> <id2>...`
 * Creates a container at the position of the first member and moves every
 * member into it, preserving their relative document order. All of it is one
 * undo unit: undo puts each member back at its exact former index.
 */
export class GroupCommand implements Command {
  private readonly group: Group;
  private readonly host: ShapeContainer;
  private readonly hostIndex: number;
  private readonly placements: Placement[];
  private readonly ordered: Shape[];

  constructor(
    private readonly doc: SvgDocument,
    gid: string,
    members: readonly Shape[],
  ) {
    assertIdFree(doc, gid);
    if (members.length === 0) {
      throw new EditorError('group needs at least one member');
    }
    assertNoDescendantConflict(members);

    const first = members[0];
    const host = first.parent;
    if (!host) {
      throw new EditorError(`no such shape: ${first.id}`);
    }
    this.host = host;
    this.hostIndex = host.indexOf(first);
    this.ordered = sortByDocumentOrder(doc, members);
    this.placements = this.ordered.map((shape) => {
      const parent = shape.parent;
      if (!parent) {
        throw new EditorError(`no such shape: ${shape.id}`);
      }
      return { shape, parent, index: parent.indexOf(shape) };
    });
    this.group = new Group(gid);
  }

  execute(): string[] {
    this.host.insertAt(this.hostIndex, this.group);
    this.doc.register(this.group, false);
    for (const { shape, parent } of this.placements) {
      parent.removeChild(shape);
    }
    for (const shape of this.ordered) {
      this.group.append(shape);
    }
    return [
      `g#${this.group.id} created with ${this.ordered.length} ${
        this.ordered.length === 1 ? 'child' : 'children'
      }`,
    ];
  }

  undo(): string[] {
    for (const { shape } of [...this.placements].reverse()) {
      this.group.removeChild(shape);
    }
    for (const { shape, parent, index } of this.placements) {
      parent.insertAt(index, shape);
    }
    this.host.removeChild(this.group);
    this.doc.unregister(this.group);
    return [
      `g#${this.group.id} dissolved, ${this.ordered.length} ${
        this.ordered.length === 1 ? 'child' : 'children'
      } restored`,
    ];
  }
}

function assertNoDescendantConflict(members: readonly Shape[]): void {
  const unique = new Set(members);
  if (unique.size !== members.length) {
    throw new EditorError('group members must be distinct');
  }
  for (const outer of members) {
    if (outer.asContainer() === null) {
      continue;
    }
    for (const inner of members) {
      if (inner !== outer && SvgDocument.isSelfOrDescendant(inner, outer)) {
        throw new EditorError(`cannot group a container into its own descendant: ${outer.id}`);
      }
    }
  }
}

/** Document order keeps the mutual order the shapes already had on screen. */
function sortByDocumentOrder(doc: SvgDocument, members: readonly Shape[]): Shape[] {
  const rank = new Map<Shape, number>();
  doc.all().forEach((shape, index) => rank.set(shape, index));
  return [...members].sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
}
