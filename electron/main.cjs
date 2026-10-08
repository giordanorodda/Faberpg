/**
 * The desktop app: the same pages as in the browser, in a window of their
 * own. A tiny local server hands the built files to the window (browsers
 * refuse ES modules over file://), and a menu moves between the places.
 *
 *   npm run app        build, then open the app
 *   npm run app:mac    build a double-clickable app in release/
 */
const { app, BrowserWindow, ipcMain, Menu, safeStorage, shell } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', 'dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.hdr': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      const file = path.normalize(path.join(ROOT, url === '/' ? 'index.html' : url));
      if (!file.startsWith(ROOT)) {
        res.writeHead(403).end();
        return;
      }
      fs.readFile(file, (err, data) => {
        if (err) {
          res.writeHead(404).end();
          return;
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    // only this computer can reach it. Always the same port if possible: the
    // saved world lives in the page's storage, which belongs to the address
    server.once('error', () => server.listen(0, '127.0.0.1'));
    server.on('listening', () => resolve(server.address().port));
    server.listen(47213, '127.0.0.1');
  });
}

// ------------------------------------------------------------------ talking with the villagers
// The key is kept in the user's app folder, encrypted with the system keychain
// when there is one; ANTHROPIC_API_KEY in the environment works too.
const keyFile = () => path.join(app.getPath('userData'), 'chiave.bin');
function readKey() {
  try {
    const data = fs.readFileSync(keyFile());
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(data) : data.toString('utf8');
  } catch {
    return process.env.ANTHROPIC_API_KEY || '';
  }
}
ipcMain.handle('faber:hasKey', () => !!readKey());
ipcMain.handle('faber:setKey', (_e, key) => {
  const text = String(key).trim();
  const data = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(text) : Buffer.from(text, 'utf8');
  fs.writeFileSync(keyFile(), data, { mode: 0o600 });
});
ipcMain.handle('faber:chat', async (e, id, req) => {
  const sdk = require('@anthropic-ai/sdk');
  const Anthropic = sdk.default || sdk.Anthropic;
  const client = new Anthropic({ apiKey: readKey() });
  const stream = client.beta.messages.stream(req);
  stream.on('text', (text) => {
    if (!e.sender.isDestroyed()) e.sender.send('faber:text', id, text);
  });
  const final = await stream.finalMessage();
  return { content: final.content, stop_reason: final.stop_reason };
});

async function main() {
  const port = await serve();
  const base = `http://127.0.0.1:${port}/`;
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#000000',
    title: 'Un piccolo mondo in cui abitare',
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.cjs') },
  });
  const go = (page) => win.loadURL(base + page);
  const template = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    {
      label: 'Luoghi',
      submenu: [
        { label: 'Il villaggio (2D)', accelerator: 'CmdOrCtrl+1', click: () => go('index.html') },
        { label: 'La casa', accelerator: 'CmdOrCtrl+2', click: () => go('casa.html') },
        { label: 'La Casa delle Erbe (Ysolde)', accelerator: 'CmdOrCtrl+3', click: () => go('erbe.html') },
        { label: 'La casa del Cartografo (Corvino)', accelerator: 'CmdOrCtrl+4', click: () => go('cartografo.html') },
        { type: 'separator' },
        { label: 'La bottega (prova)', click: () => go('bottega-cartoon.html') },
      ],
    },
    {
      label: 'Vista',
      submenu: [{ role: 'togglefullscreen', label: 'Schermo intero' }, { role: 'reload', label: 'Ricarica' }, { role: 'toggleDevTools', label: 'Strumenti' }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  // links that leave the app open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  go('index.html');
}

app.whenReady().then(main);
app.on('window-all-closed', () => app.quit());
