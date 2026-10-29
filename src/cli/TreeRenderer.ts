import { Shape } from '../domain/Shape';
import { ShapeContainer } from '../domain/ShapeContainer';
import { SvgDocument } from '../domain/SvgDocument';

interface Row {
  prefix: string;
  label: string;
  tokens: string[];
  /** Width of the longest sibling label, so columns align per nesting level. */
  siblingWidth: number;
}

/**
 * Renders the structure tree with the geometry inlined, e.g.
 *   rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff
 * The attribute column is aligned across the whole listing.
 */
export class TreeRenderer {
  render(doc: SvgDocument, rootId?: string): string[] {
    const rows: Row[] = [];
    if (rootId === undefined) {
      rows.push({
        prefix: '',
        label: `svg (${SvgDocument.describeSize(doc.width, doc.height)})`,
        tokens: [],
        siblingWidth: 0,
      });
      this.collect(doc.root, '', rows);
    } else {
      const root = doc.find(rootId);
      rows.push({ prefix: '', label: root.label, tokens: tokensOf(root), siblingWidth: 0 });
      const container = root.asContainer();
      if (container) {
        this.collect(container, '', rows);
      }
    }
    const header = rows[0];
    return rows.map((row, index) => {
      if (index === 0) {
        return row.label;
      }
      if (row.tokens.length === 0) {
        return `${row.prefix}${row.label}`;
      }
      const padding = ' '.repeat(Math.max(1, row.siblingWidth - row.label.length + 2));
      return `${row.prefix}${row.label}${padding}${row.tokens.join(' ')}`;
    });
  }

  private collect(container: ShapeContainer, prefix: string, rows: Row[]): void {
    const children = container.children;
    const siblingWidth = children.reduce((max, child) => Math.max(max, child.label.length), 0);
    children.forEach((child, index) => {
      const last = index === children.length - 1;
      const connector = last ? '└── ' : '├── ';
      rows.push({
        prefix: prefix + connector,
        label: child.label,
        tokens: tokensOf(child),
        siblingWidth,
      });
      const nested = child.asContainer();
      if (nested) {
        this.collect(nested, prefix + (last ? '    ' : '│   '), rows);
      }
    });
  }
}

function tokensOf(shape: Shape): string[] {
  const geometry = shape.kind === 'g' ? [] : shape.geometryTokens();
  return [...geometry, ...shape.describePaint()];
}
