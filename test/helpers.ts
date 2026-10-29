import { Shell } from '../src/cli/Shell';
import { createShell } from '../src/cli/ShellFactory';
import { StringOutput } from '../src/cli/StringOutput';
import { FileSystem } from '../src/ports/FileSystem';

/** In-memory file system so the shell tests never touch the disk. */
export class MemoryFileSystem implements FileSystem {
  readonly files = new Map<string, string>();

  readText(path: string): string {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`cannot read file: ${path}`);
    }
    return content;
  }

  writeText(path: string, content: string): void {
    this.files.set(path, content);
  }
}

export interface Harness {
  shell: Shell;
  out: StringOutput;
  fs: MemoryFileSystem;
  run(...lines: string[]): string[];
  output(): string[];
}

export function harness(): Harness {
  const out = new StringOutput();
  const fs = new MemoryFileSystem();
  const { shell } = createShell(out, { fs });
  const run = (...lines: string[]): string[] => {
    const before = out.lines.length;
    for (const line of lines) {
      shell.runLine(line);
    }
    return out.lines.slice(before);
  };
  return { shell, out, fs, run, output: () => out.lines };
}
