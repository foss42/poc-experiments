import * as pty from 'node-pty';
import chalk from 'chalk';
import os from 'os';

/**
 * Execute a shell command and stream output to stdout/stderr.
 * Uses node-pty for full terminal serialization.
 */
export async function executeShell(command: string): Promise<void> {
  const isWindows = os.platform() === 'win32';
  
  // Choose the shell
  const shell = isWindows ? 'powershell.exe' : (process.env.SHELL || 'bash');
  
  // Format args differently based on OS
  const shellArgs = isWindows 
    ? ['-NoProfile', '-Command', command]
    : ['-c', command];

  return new Promise((resolve, reject) => {
    console.log(chalk.dim(`$ ${command}`));
    const env = { ...process.env, CLI_TOOL: '1' } as any;

    const ptyProcess = pty.spawn(shell, shellArgs, {
      name: 'xterm-color',
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      cwd: process.cwd(),
      env: env
    });

    let stdoutData = '';

    ptyProcess.onData((data) => {
      stdoutData += data;
      process.stdout.write(data);
    });

    // For interactive support, we could pipe stdin:
    // process.stdin.setRawMode(true);
    // process.stdin.pipe(ptyProcess as any);

    ptyProcess.onExit(({ exitCode }) => {
      // process.stdin.setRawMode(false);
      // process.stdin.unpipe();
      if (exitCode !== 0) {
        console.log(chalk.red(`\nProcess exited with code ${exitCode}`));
      }
      resolve();
    });
  });
}
