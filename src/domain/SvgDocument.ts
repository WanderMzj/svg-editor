import { EditorError } from './EditorError';
import { Numbers } from './Numbers';
import { Shape } from './Shape';
import { ShapeContainer } from './ShapeContainer';

/**
 * One SVG document: the canvas size plus the root container, and the id index
 * that makes "every shape is addressable by id" an invariant of the model.
 */
export class SvgDocument implements ShapeContainer {
  private readonly rootContainer: ShapeContainer;
  private readonly byId = new Map<string, Shape>();
  private _width: number;
  private _height: number;
  private _sourcePath: string | null;

  constructor(width: number, height: number, root?: ShapeContainer, sourcePath: string | null = null) {
    this._width = width;
    this._height = height;
    this.rootContainer = root ?? new RootContainer();
    this._sourcePath = sourcePath;
    if (root) {
      this.indexTree();
    }
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get sourcePath(): string | null {
    return this._sourcePath;
  }

  set sourcePath(path: string | null) {
    this._sourcePath = path;
  }

  get children(): readonly Shape[] {
    return this.rootContainer.children;
  }

  get root(): ShapeContainer {
    return this.rootContainer;
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      throw new EditorError('canvas size must be positive');
    }
    this._width = width;
    this._height = height;
  }

  append(shape: Shape): void {
    this.rootContainer.append(shape);
  }

  insertAt(index: number, shape: Shape): void {
    this.rootContainer.insertAt(index, shape);
  }

  removeChild(shape: Shape): number {
    return this.rootContainer.removeChild(shape);
  }

  indexOf(shape: Shape): number {
    return this.rootContainer.indexOf(shape);
  }

  /** Registers a shape (and its subtree) in the id index. Throws on a duplicate id. */
  register(shape: Shape): void {
    if (this.byId.has(shape.id)) {
      throw new EditorError(`id already exists: ${shape.id}`);
    }
    this.byId.set(shape.id, shape);
    const container = shape.asContainer();
    if (container) {
      for (const child of container.children) {
        this.register(child);
      }
    }
  }

  unregister(shape: Shape): void {
    this.byId.delete(shape.id);
    const container = shape.asContainer();
    if (container) {
      for (const child of container.children) {
        this.unregister(child);
      }
    }
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  find(id: string): Shape {
    const shape = this.byId.get(id);
    if (!shape) {
      throw new EditorError(`no such shape: ${id}`);
    }
    return shape;
  }

  findOrNull(id: string): Shape | null {
    return this.byId.get(id) ?? null;
  }

  findContainer(id: string): ShapeContainer {
    const shape = this.findOrNull(id);
    if (!shape) {
      throw new EditorError(`no such container: ${id}`);
    }
    const container = shape.asContainer();
    if (!container) {
      throw new EditorError(`not a container: ${id}`);
    }
    return container;
  }

  /** Rebuilds the index from the tree (after `read`). */
  reindex(): void {
    this.byId.clear();
    this.indexTree();
  }

  /** Every shape in document order, root excluded. */
  all(): Shape[] {
    const out: Shape[] = [];
    const walk = (container: ShapeContainer): void => {
      for (const child of container.children) {
        out.push(child);
        const nested = child.asContainer();
        if (nested) {
          walk(nested);
        }
      }
    };
    walk(this.rootContainer);
    return out;
  }

  elementCount(): number {
    return this.byId.size;
  }

  parentIdOf(shape: Shape): string | null {
    const parent = shape.parent;
    if (parent === null || parent === this.rootContainer) {
      return null;
    }
    return parent instanceof Shape ? parent.id : null;
  }

  /** True when `candidate` is `ancestor` itself or lives inside it. */
  static isSelfOrDescendant(candidate: Shape, ancestor: Shape): boolean {
    let current: Shape | null = candidate;
    while (current) {
      if (current === ancestor) {
        return true;
      }
      const parent: ShapeContainer | null = current.parent;
      current = parent instanceof Shape ? parent : null;
    }
    return false;
  }

  private indexTree(): void {
    for (const child of this.rootContainer.children) {
      this.register(child);
    }
  }

  static empty(width = 800, height = 600): SvgDocument {
    return new SvgDocument(width, height);
  }

  static describeSize(width: number, height: number): string {
    return `${Numbers.format(width)}x${Numbers.format(height)}`;
  }
}

/** The document root is a container but not an addressable shape. */
export class RootContainer implements ShapeContainer {
  private readonly kids: Shape[] = [];

  get children(): readonly Shape[] {
    return this.kids;
  }

  append(shape: Shape): void {
    this.kids.push(shape);
    shape.attachTo(this);
  }

  insertAt(index: number, shape: Shape): void {
    const at = Math.max(0, Math.min(index, this.kids.length));
    this.kids.splice(at, 0, shape);
    shape.attachTo(this);
  }

  removeChild(shape: Shape): number {
    const index = this.kids.indexOf(shape);
    if (index >= 0) {
      this.kids.splice(index, 1);
      shape.detach();
    }
    return index;
  }

  indexOf(shape: Shape): number {
    return this.kids.indexOf(shape);
  }
}