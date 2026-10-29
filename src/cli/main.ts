import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import { ConsoleOutput } from './ConsoleOutput';
import { createShell } from './ShellFactory';
import { StringOutput } from './StringOutput';

const VERSION = '0.1';

interface Options {
  script: string | null;
  exec: string[] | null;
}

function parseArgs(argv: readonly string[]): Options {
  let script: string | null = null;
  const exec: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--script' || arg === '-s') {
      script = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === '--exec' || arg === '-e') {
      exec.push(argv[i + 1] ?? '');
      i += 1;
    } else if (arg === '--version' || arg === '-v') {
      process.stdout.write(`svg-editor ${VERSION}\n`);
      process.exit(0);
    } else if (arg === '--help' || arg === '-h') {
      process.stdout.write('usage: svg-editor [--script file] [--exec "cmd"]...\n');
      process.exit(0);
    }
  }
  return { script, exec: exec.length > 0 ? exec : null };
}

/** Runs a list of lines through the shell (script mode). */
function runLines(lines: readonly string[], echoCommands: boolean): string[] {
  const out = new StringOutput();
  const { shell } = createShell(out);
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (echoCommands && line.trim() !== '') {
      out.line(`svg> ${line}`);
    }
    shell.runLine(line);
  }
  return out.lines;
}

function runInteractive(): void {
  const out = new ConsoleOutput();
  const { shell } = createShell(out);
  out.line(`svg-editor ${VERSION} — type 'help' for commands`);
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'svg> ' });
  rl.prompt();
  rl.on('line', (line) => {
    shell.runLine(line);
    rl.prompt();
  });
  rl.on('close', () => {
    process.stdout.write('\n');
    process.exit(0);
  });
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  if (options.exec) {
    for (const line of runLines(options.exec, false)) {
      process.stdout.write(`${line}\n`);
    }
    return;
  }
  if (options.script) {
    const text = readFileSync(options.script, 'utf8');
    for (const line of runLines(text.split('\n'), true)) {
      process.stdout.write(`${line}\n`);
    }
    return;
  }
  runInteractive();
}

main();
