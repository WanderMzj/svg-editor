/** Port for the outside world: the application layer never touches `fs` directly. */
export interface FileSystem {
  readText(path: string): string;

  writeText(path: string, content: string): void;
}
