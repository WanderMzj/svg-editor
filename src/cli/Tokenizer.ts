import { EditorError } from '../domain/EditorError';

/**
 * Splits a REPL line into tokens: whitespace separates them, double quotes group
 * (so `create text t1 20 40 "My Diagram"` yields one content token). A line
 * whose first character is `#` is a comment; `#ffffff` mid-line is a colour.
 */
export class Tokenizer {
  static tokenize(line: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let hasCurrent = false;
    let quoted = false;

    const flush = (): void => {
      if (hasCurrent) {
        tokens.push(current);
        current = '';
        hasCurrent = false;
      }
    };

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (quoted) {
        if (char === '"') {
          quoted = false;
          continue;
        }
        if (char === '\\' && i + 1 < line.length && (line[i + 1] === '"' || line[i + 1] === '\\')) {
          current += line[i + 1];
          i += 1;
          continue;
        }
        current += char;
        continue;
      }
      if (char === '"') {
        quoted = true;
        hasCurrent = true;
        continue;
      }
      if (char === '#' && tokens.length === 0 && !hasCurrent) {
        break;
      }
      if (/\s/.test(char)) {
        flush();
        continue;
      }
      current += char;
      hasCurrent = true;
    }
    if (quoted) {
      throw new EditorError('unterminated quote');
    }
    flush();
    return tokens;
  }

  /** One command line may hold several commands separated by `;`. */
  static splitStatements(line: string): string[] {
    const statements: string[] = [];
    let current = '';
    let quoted = false;
    for (const char of line) {
      if (char === '"') {
        quoted = !quoted;
      }
      if (char === ';' && !quoted) {
        statements.push(current);
        current = '';
        continue;
      }
      current += char;
    }
    statements.push(current);
    return statements.map((statement) => statement.trim()).filter((statement) => statement.length > 0);
  }
}
