import { SvgDocument } from '../domain/SvgDocument';

/** Serializes the document back to SVG text. */
export interface ShapeWriter {
  write(document: SvgDocument): string;
}
