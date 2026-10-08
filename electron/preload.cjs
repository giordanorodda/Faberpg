/**
 * The bridge between the pages and the app: free conversations with the
 * villagers go through the main process, which holds the API key (stored
 * encrypted by the operating system) so the pages never see it.
 */
const { contextBridge, ipcRenderer } = require('electron');

let next = 0;
contextBridge.exposeInMainWorld('faber', {
  hasKey: () => ipcRenderer.invoke('faber:hasKey'),
  setKey: (key) => ipcRenderer.invoke('faber:setKey', key),
  chat: (req, onText) => {
    const id = ++next;
    const listener = (_e, rid, text) => {
      if (rid === id) onText(text);
    };
    ipcRenderer.on('faber:text', listener);
    return ipcRenderer.invoke('faber:chat', id, req).finally(() => ipcRenderer.removeListener('faber:text', listener));
  },
});
