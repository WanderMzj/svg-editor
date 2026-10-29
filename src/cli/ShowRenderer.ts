import { Shape } from '../domain/Shape';
import { SvgDocument } from '../domain/SvgDocument';

/** `show <id>` — the attribute detail of one shape. */
export class ShowRenderer {
  render(doc: SvgDocument, shape: Shape): string[] {
    const parent = doc.parentIdOf(shape);
    const lines = [`${shape.label}  parent=${parent === null ? 'svg' : `g#${parent}`}`];
    const geometry = shape.geometryTokens();
    if (geometry.length > 0 && shape.kind !== 'g') {
      lines.push(`  ${geometry.join(' ')}`);
    }
    const paint = shape.describePaint();
    if (paint.length > 0) {
      lines.push(`  ${paint.join(' ')}`);
    }
    if (shape.kind === 'g') {
      lines.push(`  ${geometry.join(' ')}`);
    }
    return lines;
  }
}
