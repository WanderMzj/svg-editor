import { Numbers } from '../../domain/Numbers';
import { Shape } from '../../domain/Shape';
import { ShapeContainer } from '../../domain/ShapeContainer';
import { SvgDocument } from '../../domain/SvgDocument';
import { ShapeWriter } from '../../ports/ShapeWriter';
import { encodeXml } from '../xml/XmlParser';

/** Serializes the document to SVG text that a browser can open directly. */
export class SvgWriter implements ShapeWriter {
  write(document: SvgDocument): string {
    const width = Numbers.format(document.width);
    const height = Numbers.format(document.height);
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ];
    this.writeChildren(document.root, lines, 1);
    lines.push('</svg>');
    return `${lines.join('\n')}\n`;
  }

  private writeChildren(container: ShapeContainer, lines: string[], depth: number): void {
    for (const child of container.children) {
      this.writeShape(child, lines, depth);
    }
  }

  private writeShape(shape: Shape, lines: string[], depth: number): void {
    const pad = '  '.repeat(depth);
    const attributes: Array<[string, string]> = [['id', shape.id]];
    for (const [name, value] of shape.xmlAttributes()) {
      attributes.push([name, value]);
    }
    const rendered = attributes.map(([name, value]) => ` ${name}="${encodeXml(value)}"`).join('');
    const text = shape.textContent();
    if (text !== null) {
      lines.push(`${pad}<${shape.kind}${rendered}>${encodeXml(text)}</${shape.kind}>`);
      return;
    }
    const container = shape.asContainer();
    if (container && container.children.length > 0) {
      lines.push(`${pad}<${shape.kind}${rendered}>`);
      this.writeChildren(container, lines, depth + 1);
      lines.push(`${pad}</${shape.kind}>`);
      return;
    }
    lines.push(`${pad}<${shape.kind}${rendered}/>`);
  }
}
