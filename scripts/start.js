// Launches Electron with ELECTRON_RUN_AS_NODE removed. VS Code (itself Electron)
// sets that variable in its terminals, which makes Electron behave like plain Node.
//   node scripts/start.js                      -> runs the app
//   node scripts/start.js scripts/some-file.js -> runs that script inside Electron
const { spawn } = require('child_process');
const electron = require('electron'); // path to electron.exe when required from Node

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = process.argv.slice(2);
const target = args[0] && args[0].endsWith('.js') ? args : ['.', ...args];

const child = spawn(electron, target, { stdio: 'inherit', env });
child.on('close', (code) => process.exit(code ?? 0));
