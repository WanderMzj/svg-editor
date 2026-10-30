import { EditorError } from '../../domain/EditorError';
import { Shape } from '../../domain/Shape';
import { ShapeFactory } from '../../domain/ShapeFactory';
import { SvgDocument } from '../../domain/SvgDocument';
import { ReadResult, ShapeReader } from '../../ports/ShapeReader';
import { XmlNode } from '../xml/XmlNode';
import { XmlParseError, XmlParser } from '../xml/XmlParser';

const PAINT_ATTRIBUTES = ['fill', 'stroke', 'stroke-width'];

/**
 * Reads an SVG file into the domain model. Elements without an `id` get
 * `<tag><n>` and a warning is collected; the editor never mutates the file.
 */
export class SvgReader implements ShapeReader {
  read(svgText: string, sourcePath: string): ReadResult {
    let root: XmlNode;
    try {
      root = XmlParser.parse(svgText);
    } catch (error) {
      const reason = error instanceof XmlParseError ? error.message : String(error);
      throw new EditorError(`cannot parse svg: ${reason}`);
    }
    if (root.name !== 'svg') {
      throw new EditorError(`cannot parse svg: root element is <${root.name}>, expected <svg>`);
    }
    const warnings: string[] = [];
    const counters = new Map<string, number>();
    const usedIds = new Set<string>();
    const doc = new SvgDocument(
      sizeOf(root.attr('width'), 800),
      sizeOf(root.attr('height'), 600),
      undefined,
      sourcePath,
    );
    for (const child of root.children) {
      const shape = this.buildShape(child, doc, usedIds, counters, warnings);
      if (shape) {
        doc.append(shape);
      }
    }
    doc.reindex();
    return { document: doc, warnings };
  }

  private buildShape(
    node: XmlNode,
    doc: SvgDocument,
    usedIds: Set<string>,
    counters: Map<string, number>,
    warnings: string[],
  ): Shape | null {
    if (node.name === 'defs' || node.name === 'title' || node.name === 'desc' || node.name === 'style') {
      return null;
    }
    const taken = (candidate: string): boolean => usedIds.has(candidate) || doc.has(candidate);
    let id = node.attr('id') ?? '';
    if (id === '') {
      do {
        id = ShapeFactory.suggestId(node.name, counters);
      } while (taken(id));
      warnings.push(`assigned id ${id} to unnamed <${node.name}>`);
    } else if (taken(id)) {
      const original = id;
      let suffix = 1;
      while (taken(`${original}-${suffix}`)) {
        suffix += 1;
      }
      id = `${original}-${suffix}`;
      warnings.push(`duplicate id ${original} renamed to ${id}`);
    }
    const shape = this.buildFromNode(node, id);
    if (!shape) {
      warnings.push(`ignored unsupported element <${node.name}>`);
      return null;
    }
    usedIds.add(id);
    if (node.attr('transform') !== undefined) {
      warnings.push(`ignored transform on <${node.name}> ${id}: coordinates are used as written`);
    }
    for (const name of PAINT_ATTRIBUTES) {
      const value = node.attr(name);
      if (value !== undefined) {
        shape.applyAttribute(name, value);
      }
    }
    const container = shape.asContainer();
    if (container) {
      for (const child of node.children) {
        const nested = this.buildShape(child, doc, usedIds, counters, warnings);
        if (nested) {
          container.append(nested);
        }
      }
    }
    return shape;
  }

  private buildFromNode(node: XmlNode, id: string): Shape | null {
    return ShapeFactory.fromXml(node.name, id, (name) => node.attr(name), node.text.trim());
  }
}

function sizeOf(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const match = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))/.exec(raw);
  return match ? Number(match[1]) : fallback;
}
