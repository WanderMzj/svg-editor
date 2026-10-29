/** A minimal, dependency-free XML element tree (enough for SVG round-trips). */
export class XmlNode {
  readonly name: string;
  readonly attributes: Map<string, string>;
  readonly children: XmlNode[] = [];
  text = '';

  constructor(name: string, attributes: Iterable<[string, string]> = []) {
    this.name = name;
    this.attributes = new Map(attributes);
  }

  get id(): string | undefined {
    return this.attributes.get('id');
  }

  attr(name: string): string | undefined {
    return this.attributes.get(name);
  }

  child(name: string): XmlNode | undefined {
    return this.children.find((node) => node.name === name);
  }
}
