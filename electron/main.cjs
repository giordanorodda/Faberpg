/**
 * The desktop app: the same pages as in the browser, in a window of their
 * own. A tiny local server hands the built files to the window (browsers
 * refuse ES modules over file://), and a menu moves between the places.
 *
 *   npm run app        build, then open the app
 *   npm run app:mac    build a double-clickable app in release/
 */
const { app, BrowserWindow, Menu, shell } = require('electron');
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
      const file = path.normalize(path.join(ROOT, url === '/' ? 'casa.html' : url));
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
    // only this computer can reach it
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

async function main() {
  const port = await serve();
  const base = `http://127.0.0.1:${port}/`;
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#000000',
    title: 'Un piccolo mondo in cui abitare',
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  const go = (page) => win.loadURL(base + page);
  const template = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    {
      label: 'Luoghi',
      submenu: [
        { label: 'La casa', accelerator: 'CmdOrCtrl+1', click: () => go('casa.html') },
        { label: 'La bottega', accelerator: 'CmdOrCtrl+2', click: () => go('bottega-cartoon.html') },
        { label: 'Il villaggio (2D)', accelerator: 'CmdOrCtrl+3', click: () => go('index.html') },
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
  go('casa.html');
}

app.whenReady().then(main);
app.on('window-all-closed', () => app.quit());
