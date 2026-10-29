import { Output } from '../ports/Output';

export class ConsoleOutput implements Output {
  line(text: string): void {
    process.stdout.write(`${text}\n`);
  }
}
