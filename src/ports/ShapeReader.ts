import { SvgDocument } from '../domain/SvgDocument';

export interface ReadResult {
  document: SvgDocument;
  warnings: string[];
}

/** Parses an SVG text into a document (missing ids get generated names). */
export interface ShapeReader {
  read(svgText: string, sourcePath: string): ReadResult;
}
