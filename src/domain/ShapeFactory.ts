import { EditorError } from './EditorError';
import { Numbers } from './Numbers';
import { Shape } from './Shape';
import { Circle } from './shapes/Circle';
import { Ellipse } from './shapes/Ellipse';
import { Group } from './shapes/Group';
import { Line } from './shapes/Line';
import { Rect } from './shapes/Rect';
import { Text } from './shapes/Text';

/** The parameter schema of one buildable type. */
interface ShapeSpec {
  /** Geometry parameters, named like the SVG attributes, in `create` order. */
  numbers: readonly string[];
  /** Optional trailing paint parameter (`fill` for areas, `stroke` for lines). */
  paint: 'fill' | 'stroke' | null;
  build(id: string, values: number[]): Shape;
}

/**
 * Name-based dispatch #2 of the two the spec allows (the other one is the
 * command registry in the shell): `type` -> class. Both `create` and the SVG
 * reader go through here, so no other place switches on a tag name. The plugin
 * stage replaces this table with a registry fed by ShapeProviders; see
 * doc/README.md ("待重构").
 */
export class ShapeFactory {
  private static readonly SPECS: Record<string, ShapeSpec> = {
    rect: {
      numbers: ['x', 'y', 'width', 'height'],
      paint: 'fill',
      build: (id, v) => new Rect(id, v[0], v[1], v[2], v[3]),
    },
    circle: {
      numbers: ['cx', 'cy', 'r'],
      paint: 'fill',
      build: (id, v) => new Circle(id, v[0], v[1], v[2]),
    },
    ellipse: {
      numbers: ['cx', 'cy', 'rx', 'ry'],
      paint: 'fill',
      build: (id, v) => new Ellipse(id, v[0], v[1], v[2], v[3]),
    },
    line: {
      numbers: ['x1', 'y1', 'x2', 'y2'],
      paint: 'stroke',
      build: (id, v) => new Line(id, v[0], v[1], v[2], v[3]),
    },
    g: {
      numbers: [],
      paint: null,
      build: (id) => new Group(id),
    },
  };

  static isKnown(type: string): boolean {
    return type === 'text' || ShapeFactory.specOf(type) !== undefined;
  }

  /** Builds a shape from the tokens that follow `create <type> <id>`. */
  static create(type: string, id: string, args: readonly string[]): Shape {
    if (type === 'text') {
      return ShapeFactory.buildText(id, args);
    }
    const spec = ShapeFactory.specOf(type);
    if (!spec) {
      throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    const geometry = spec.numbers.length;
    const max = geometry + (spec.paint ? 1 : 0);
    if (args.length < geometry || args.length > max) {
      throw new EditorError(`create ${type}: wrong number of arguments`);
    }
    const shape = spec.build(id, args.slice(0, geometry).map((raw) => Numbers.parse(raw)));
    const paintValue = args[geometry];
    if (spec.paint && paintValue !== undefined) {
      shape.applyAttribute(spec.paint, paintValue);
    }
    return shape;
  }

  /** Builds a shape from SVG attributes (reader side); null when the element is not supported. */
  static fromXml(
    type: string,
    id: string,
    attribute: (name: string) => string | undefined,
    text: string,
  ): Shape | null {
    if (type === 'text') {
      return new Text(id, ShapeFactory.numberOf(attribute('x')), ShapeFactory.numberOf(attribute('y')), text);
    }
    const spec = ShapeFactory.specOf(type);
    if (!spec) {
      return null;
    }
    return spec.build(
      id,
      spec.numbers.map((name) => ShapeFactory.numberOf(attribute(name))),
    );
  }

  /** Suggested id for an unnamed element read from a file: `rect1`, `rect2`, ... */
  static suggestId(type: string, counters: Map<string, number>): string {
    const next = (counters.get(type) ?? 0) + 1;
    counters.set(type, next);
    return `${type}${next}`;
  }

  /** Own-property lookup, so a type named `constructor` or `toString` is not "known". */
  private static specOf(type: string): ShapeSpec | undefined {
    return Object.prototype.hasOwnProperty.call(ShapeFactory.SPECS, type)
      ? ShapeFactory.SPECS[type]
      : undefined;
  }

  private static numberOf(raw: string | undefined): number {
    return raw === undefined ? 0 : Numbers.parse(raw);
  }

  private static buildText(id: string, args: readonly string[]): Text {
    if (args.length < 3) {
      throw new EditorError('create text: expected <x> <y> "content"');
    }
    return new Text(id, Numbers.parse(args[0]), Numbers.parse(args[1]), args.slice(2).join(' '));
  }
}
