// 🌐 o Navegador do Mini SK só pode pedir uma coisa ao programa: abrir a página no navegador do Windows
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('navegadorPC', { fora: (u) => ipcRenderer.invoke('navegador-fora', u) });
