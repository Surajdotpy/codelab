// Launches Electron with ELECTRON_RUN_AS_NODE removed. VS Code (itself Electron)
// sets that variable in its terminals, which makes Electron behave like plain Node.
const { spawn } = require('child_process');
const electron = require('electron'); // path to electron.exe when required from Node

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, ['.', ...process.argv.slice(2)], { stdio: 'inherit', env });
child.on('close', (code) => process.exit(code ?? 0));
