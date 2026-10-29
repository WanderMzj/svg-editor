import { XmlNode } from './XmlNode';

/** Thrown when the input is not well-formed enough to be read. */
export class XmlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XmlParseError';
  }
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

/**
 * A small recursive-descent XML parser: tags, attributes, text, comments,
 * CDATA and the usual entities. That is all an SVG document needs here, and
 * it keeps the project free of third-party runtime dependencies.
 */
export class XmlParser {
  private pos = 0;

  constructor(private readonly source: string) {}

  static parse(source: string): XmlNode {
    return new XmlParser(source).parseDocument();
  }

  private parseDocument(): XmlNode {
    this.skipProlog();
    const root = this.parseElement();
    this.skipMisc();
    if (this.pos < this.source.length) {
      throw new XmlParseError(`unexpected content at offset ${this.pos}`);
    }
    return root;
  }

  private parseElement(): XmlNode {
    this.expect('<');
    const name = this.readName();
    const attributes: Array<[string, string]> = [];
    for (;;) {
      this.skipWhitespace();
      if (this.startsWith('/>')) {
        this.pos += 2;
        return new XmlNode(name, attributes);
      }
      if (this.startsWith('>')) {
        this.pos += 1;
        break;
      }
      const attrName = this.readName();
      this.skipWhitespace();
      this.expect('=');
      this.skipWhitespace();
      attributes.push([attrName, this.readQuoted()]);
    }
    const node = new XmlNode(name, attributes);
    for (;;) {
      if (this.pos >= this.source.length) {
        throw new XmlParseError(`unclosed element <${name}>`);
      }
      if (this.startsWith('</')) {
        this.pos += 2;
        const closing = this.readName();
        if (closing !== name) {
          throw new XmlParseError(`mismatched closing tag </${closing}> for <${name}>`);
        }
        this.skipWhitespace();
        this.expect('>');
        return node;
      }
      if (this.startsWith('<!--')) {
        this.skipComment();
      } else if (this.startsWith('<![CDATA[')) {
        node.text += this.readCData();
      } else if (this.startsWith('<?')) {
        this.skipProcessingInstruction();
      } else if (this.startsWith('<')) {
        node.children.push(this.parseElement());
      } else {
        node.text += this.readText();
      }
    }
  }

  private readText(): string {
    const start = this.pos;
    while (this.pos < this.source.length && this.source[this.pos] !== '<') {
      this.pos += 1;
    }
    return decodeEntities(this.source.slice(start, this.pos));
  }

  private readCData(): string {
    const end = this.source.indexOf(']]>', this.pos);
    if (end < 0) {
      throw new XmlParseError('unterminated CDATA section');
    }
    const text = this.source.slice(this.pos + 9, end);
    this.pos = end + 3;
    return text;
  }

  private skipComment(): void {
    const end = this.source.indexOf('-->', this.pos);
    if (end < 0) {
      throw new XmlParseError('unterminated comment');
    }
    this.pos = end + 3;
  }

  private skipProcessingInstruction(): void {
    const end = this.source.indexOf('?>', this.pos);
    if (end < 0) {
      throw new XmlParseError('unterminated processing instruction');
    }
    this.pos = end + 2;
  }

  private skipProlog(): void {
    this.skipMisc();
    if (this.startsWith('<!DOCTYPE')) {
      const end = this.source.indexOf('>', this.pos);
      if (end < 0) {
        throw new XmlParseError('unterminated DOCTYPE');
      }
      this.pos = end + 1;
      this.skipMisc();
    }
  }

  private skipMisc(): void {
    for (;;) {
      this.skipWhitespace();
      if (this.startsWith('<!--')) {
        this.skipComment();
      } else if (this.startsWith('<?')) {
        this.skipProcessingInstruction();
      } else {
        return;
      }
    }
  }

  private skipWhitespace(): void {
    while (this.pos < this.source.length && /\s/.test(this.source[this.pos])) {
      this.pos += 1;
    }
  }

  private readName(): string {
    const start = this.pos;
    while (this.pos < this.source.length && /[^\s=/>]/.test(this.source[this.pos])) {
      this.pos += 1;
    }
    if (start === this.pos) {
      throw new XmlParseError(`expected a name at offset ${this.pos}`);
    }
    return this.source.slice(start, this.pos);
  }

  private readQuoted(): string {
    const quote = this.source[this.pos];
    if (quote !== '"' && quote !== "'") {
      throw new XmlParseError(`expected a quoted value at offset ${this.pos}`);
    }
    const end = this.source.indexOf(quote, this.pos + 1);
    if (end < 0) {
      throw new XmlParseError('unterminated attribute value');
    }
    const value = this.source.slice(this.pos + 1, end);
    this.pos = end + 1;
    return decodeEntities(value);
  }

  private expect(char: string): void {
    if (!this.startsWith(char)) {
      throw new XmlParseError(`expected '${char}' at offset ${this.pos}`);
    }
    this.pos += char.length;
  }

  private startsWith(token: string): boolean {
    return this.source.startsWith(token, this.pos);
  }
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      return String.fromCodePoint(parseInt(body.slice(2), 16));
    }
    if (body.startsWith('#')) {
      return String.fromCodePoint(parseInt(body.slice(1), 10));
    }
    return ENTITIES[body] ?? whole;
  });
}

export function encodeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
