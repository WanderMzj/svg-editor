/** Port for user-facing output, so the shell can be driven in tests. */
export interface Output {
  line(text: string): void;
}
