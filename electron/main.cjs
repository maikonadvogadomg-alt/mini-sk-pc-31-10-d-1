/* Mini SK para PC — abre o Mini SK numa janela própria e liga, por dentro:
   - o 💻 Terminal do computador (cmd do Windows), no lugar do Termux;
   - a ⇅ ponte de arquivos (Mandar / Trazer) numa pasta de verdade:
     Documentos\Mini-SK\NOME-DO-PROJETO
   - e libera o Ollama (IA grátis no seu PC) sem configurar nada. */
const { app, BrowserWindow, shell, session, dialog, ipcMain, nativeTheme, screen } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
// 🎮 31/10: usa a PLACA DE VÍDEO (fica bonito e liso como no celular).
// 🖤 Se um dia abrir com a tela toda preta (placa/driver antigo), ele percebe sozinho, anota no arquivo
// "sem-placa-de-video.txt" (na pasta C:\Mini-SK) e abre de novo SEM a placa. Para tentar a placa outra vez: apague esse arquivo.
const CASA0 = process.env.DADOS_EM || (process.platform === 'win32' ? 'C:\\Mini-SK' : path.join(app.getPath('documents'), 'Mini-SK'));
const SEM_PLACA = path.join(CASA0, 'sem-placa-de-video.txt');
const usarPlaca = !fs.existsSync(SEM_PLACA);
if (!usarPlaca) { app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu-compositing'); }
function desligarPlaca(motivo) {
  try { fs.mkdirSync(CASA0, { recursive: true }); fs.writeFileSync(SEM_PLACA, new Date().toLocaleString('pt-BR') + ' — ' + motivo + '\nApague este arquivo para o Mini SK tentar usar a placa de vídeo de novo.\n'); } catch {}
  app.relaunch(); app.exit(0);
}
const http = require('http');
const net = require('net');
const crypto = require('crypto');

const SO_TESTAR = process.env.TESTE_SAIR === '1';
if (!SO_TESTAR && !app.requestSingleInstanceLock()) { app.quit(); return; }

// 30/10: no Windows os projetos ficam em C:\\Mini-SK (fora de Documentos: lá o OneDrive se mete e o npm install quebra).
const CASA = CASA0;  // (o app NOVO usa a mesma pasta de projetos: assim nada se perde)
fs.mkdirSync(CASA, { recursive: true });
const REGISTRO = path.join(CASA, 'registro.txt');
const log = (...a) => { try { fs.appendFileSync(REGISTRO, new Date().toLocaleString('pt-BR') + ' ' + a.map((x) => (x instanceof Error ? x.stack : String(x))).join(' ') + '\n'); } catch {} console.log(...a); };
process.on('uncaughtException', (e) => log('ERRO:', e));

// o Mini SK fica na pasta app/ (Mini-SK-PC) ou na própria raiz (gerado pelo 🚀 Publicar do celular)
const APP = fs.existsSync(path.join(__dirname, '..', 'app', 'index.html')) ? path.join(__dirname, '..', 'app') : path.join(__dirname, '..');
const CODIGO = crypto.randomBytes(16).toString('hex');
// portas: 7680/7681/7682 no Mini SK normal. Um "app NOVO" (📦 → 🆕) ganha outras, guardadas no package.json,
// para rodar AO LADO do outro sem misturar os projetos.
let PKG = {}; try { PKG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')); } catch {}
const PORTA_APP = Number(PKG.portaDoPrograma) || 7680;
// 31/10: o terminal e a ponte escolhem uma porta LIVRE sozinhos (a da tela continua fixa: os projetos ficam guardados por endereço)
let PORTA_TERMINAL = PORTA_APP + 1, PORTA_PONTE = PORTA_APP + 2;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.md': 'text/markdown; charset=utf-8', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8' };

function portaOcupada(p) { return new Promise((ok) => { const s = net.createServer(); s.once('error', () => ok(true)); s.listen(p, '127.0.0.1', () => s.close(() => ok(false))); }); }

async function portaLivre(desde, evitar) {
  for (let p = desde; p < desde + 60; p++) { if (evitar.includes(p)) continue; if (!(await portaOcupada(p))) return p; }
  return 0;
}
function rodarSaida(cmd, args) { try { return require('child_process').spawnSync(cmd, args, { windowsHide: true, encoding: 'utf8', timeout: 8000 }).stdout || ''; } catch { return ''; } }
/** Quem está usando a porta? No Windows devolve { pid, nome }. */
function donoDaPorta(p) {
  if (process.platform !== 'win32') return null;
  const linha = rodarSaida('netstat', ['-ano', '-p', 'tcp']).split(/\r?\n/).find((l) => new RegExp('[:.]' + p + '\\s.*(LISTEN|ESCUTA)', 'i').test(l));
  if (!linha) return null;
  const pid = Number(linha.trim().split(/\s+/).pop()); if (!pid) return null;
  const csv = rodarSaida('tasklist', ['/FI', 'PID eq ' + pid, '/FO', 'CSV', '/NH']);
  const nome = (csv.match(/^"([^"]+)"/) || [])[1] || '';
  return { pid, nome };
}

function servirApp() {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      let u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (u === '/' || u === '') u = '/index.html';
      const f = path.join(APP, path.normalize(u).replace(/^([/\\])+/, ''));
      if (!f.startsWith(APP) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('não existe'); }
      const h = { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
      res.writeHead(200, h); fs.createReadStream(f).pipe(res);
    });
    // porta FIXA: os projetos ficam guardados "por endereço"; se a porta mudasse, eles sumiriam
    let tentou = false;
    srv.on('error', async (e) => {
      log('ERRO ao abrir a porta ' + PORTA_APP + ':', e);
      // um Mini SK velho que ficou "preso" por trás (sem janela) segura a porta: fecha ele sozinho e tenta de novo
      const dono = donoDaPorta(PORTA_APP);
      if (!tentou && dono && dono.pid !== process.pid && /mini-?sk|electron/i.test(dono.nome)) {
        tentou = true; log('Fechando o Mini SK antigo preso (' + dono.nome + ' pid ' + dono.pid + ')');
        rodarSaida('taskkill', ['/pid', String(dono.pid), '/T', '/F']);
        await new Promise((r) => setTimeout(r, 1500));
        return srv.listen(PORTA_APP, '127.0.0.1');
      }
      dialog.showErrorBox('Mini SK', 'A porta ' + PORTA_APP + ' está ocupada' + (dono && dono.nome ? ' pelo programa "' + dono.nome + '"' : ' por outro programa') + '.\n\nFeche esse programa (ou reinicie o computador) e abra o Mini SK de novo.');
      app.exit(1);
    });
    srv.on('listening', () => ok(PORTA_APP));
    srv.listen(PORTA_APP, '127.0.0.1');
  });
}

async function ligarTudo() {
  const porta = await servirApp();
  const origem = 'http://127.0.0.1:' + porta;
  log('Mini SK em ' + origem + ' · pasta ' + CASA);
  PORTA_PONTE = await portaLivre(PORTA_APP + 2, [PORTA_APP]);
  if (!PORTA_PONTE) log('⚠ Nenhuma porta livre para a ponte.');
  else { process.env.PONTE_CODIGO = CODIGO; process.env.PONTE_PORTA = String(PORTA_PONTE); process.env.PONTE_BASE = CASA; require('./ponte.cjs'); }
  PORTA_TERMINAL = await portaLivre(PORTA_APP + 1, [PORTA_APP, PORTA_PONTE]);
  if (!PORTA_TERMINAL) log('⚠ Nenhuma porta livre para o terminal.');
  else require('./terminal.cjs')({ porta: PORTA_TERMINAL, base: CASA, origem });
  log('portas: tela ' + PORTA_APP + ' · terminal ' + PORTA_TERMINAL + ' · ponte ' + PORTA_PONTE);
  return origem;
}

function pedir(url, headers) { return new Promise((ok) => { const q = http.get(url, { headers }, (r) => { r.resume(); ok(r.statusCode); }); q.on('error', () => ok(0)); q.setTimeout(4000, () => q.destroy()); }); }

// 🦙 Ollama: se estiver instalado e desligado, liga escondido (sem janela preta)
function ollamaLigado() { return new Promise((ok) => { const q = http.get('http://127.0.0.1:11434/api/version', (r) => { r.resume(); ok(r.statusCode === 200); }); q.on('error', () => ok(false)); q.setTimeout(2500, () => { q.destroy(); ok(false); }); }); }
async function ligarOllama() {
  if (await ollamaLigado()) return 'já estava ligado';
  const tentativas = [['ollama', ['serve']]];
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) tentativas.push([path.join(process.env.LOCALAPPDATA, 'Programs', 'Ollama', 'ollama.exe'), ['serve']]);
  for (const [cmd, args] of tentativas) {
    try { const p = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true }); p.on('error', () => {}); p.unref(); } catch { continue; }
    for (let i = 0; i < 8; i++) { await new Promise((r) => setTimeout(r, 1000)); if (await ollamaLigado()) { log('Ollama ligado pelo Mini SK'); return 'liguei'; } }
  }
  return 'não achei o Ollama instalado';
}
ipcMain.handle('ligar-ollama', () => ligarOllama());
// 🩺 Saúde do computador: analisar, limpar (só o que volta sozinho), backup dos projetos, fechar programa que segura uma porta
const SAUDE = require('./saude.cjs');
ipcMain.handle('pc-analisar', () => SAUDE.analisar(CASA).catch((e) => ({ erro: e.message })));
ipcMain.handle('pc-limpar', (_e, tipo, alvo) => SAUDE.limpar(CASA, tipo, alvo).catch((e) => '❌ ' + e.message));
ipcMain.handle('pc-fechar', (_e, pid) => SAUDE.fecharPrograma(pid));
ipcMain.handle('pc-backup', async () => {
  const r = await dialog.showOpenDialog(janela, { title: 'Onde guardar o backup? (ex.: o HD externo)', properties: ['openDirectory', 'createDirectory'], buttonLabel: 'Guardar aqui' });
  if (r.canceled || !r.filePaths[0]) return { cancelado: true };
  try { const b = await SAUDE.backup(CASA, r.filePaths[0]); shell.openPath(b.pasta); return b; } catch (e) { return { erro: e.message }; }
});
// 🌐 a IA do Mini SK pesquisa na internet por aqui (o programa busca; o navegador sozinho é barrado pelo "CORS")
ipcMain.handle('buscar-web', async (_e, u) => {
  try {
    if (!/^https?:\/\//i.test(String(u || ''))) return { ok: false, texto: 'endereço inválido' };
    const r = await fetch(String(u), { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', 'Accept-Language': 'pt-BR,pt;q=0.9' } });
    const t = (await r.text()).slice(0, 3000000);
    return { ok: r.ok, texto: r.ok ? t : 'HTTP ' + r.status };
  } catch (e) { return { ok: false, texto: e.message }; }
});
// 📂 abrir a pasta do projeto no Explorador do Windows (só dentro de Documentos\Mini-SK)
ipcMain.handle('abrir-pasta', (_e, p) => { const alvo = path.resolve(String(p || CASA)); if (alvo !== CASA && !alvo.startsWith(CASA + path.sep)) return 'fora'; fs.mkdirSync(alvo, { recursive: true }); return shell.openPath(alvo); });
ipcMain.handle('desligar-ollama', () => new Promise((ok) => {
  const cmds = process.platform === 'win32' ? [['taskkill', ['/f', '/im', 'ollama.exe']], ['taskkill', ['/f', '/im', 'ollama app.exe']]] : [['pkill', ['-f', 'ollama']]];
  let n = 0; for (const [c, a] of cmds) { try { const p = spawn(c, a, { windowsHide: true, stdio: 'ignore' }); p.on('error', () => {}); p.on('close', () => { if (++n === cmds.length) ok('ok'); }); } catch { if (++n === cmds.length) ok('ok'); } }
}));

let janela = null;

// 🌐 Navegador de verdade (abre QUALQUER site: YouTube, GitHub, npm, Neon…). Uma janela só, com endereço e ◀ ▶.
let navJanela = null;
function abrirNavegador(url) {
  const ir = () => navJanela.webContents.executeJavaScript('window.irPara(' + JSON.stringify(String(url || '')) + ')').catch(() => {});
  if (navJanela && !navJanela.isDestroyed()) {
    if (navJanela.isMinimized()) navJanela.restore();
    navJanela.show(); navJanela.focus();
    if (url) ir();
    return 'ok';
  }
  navJanela = new BrowserWindow({
    width: 1200, height: 860, title: '🌐 Navegador — Mini SK', autoHideMenuBar: true, backgroundColor: '#0f1420',
    webPreferences: { preload: path.join(__dirname, 'preload-nav.cjs'), contextIsolation: true, webviewTag: true },
  });
  navJanela.loadFile(path.join(__dirname, 'navegador.html'));
  navJanela.webContents.once('did-finish-load', ir);
  navJanela.on('closed', () => { navJanela = null; });
  return 'ok';
}
ipcMain.handle('abrir-navegador', (_e, u) => abrirNavegador(u));
ipcMain.handle('navegador-fora', (_e, u) => { if (/^https?:\/\//i.test(String(u || ''))) shell.openExternal(String(u)); });
app.on('web-contents-created', (_e, wc) => {
  // a página do site dentro do navegador: sem acesso ao computador; "nova aba" abre ali mesmo
  wc.on('will-attach-webview', (ev, prefs) => { delete prefs.preload; prefs.nodeIntegration = false; prefs.contextIsolation = true; });
  if (wc.getType() === 'webview') {
    wc.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) wc.loadURL(url); else shell.openExternal(url); return { action: 'deny' }; });
  }
});
app.whenReady().then(async () => {
  const origem = await ligarTudo();
  if (SO_TESTAR) {
    await new Promise((r) => setTimeout(r, 800));
    const a = await pedir(origem + '/index.html');
    const b = await pedir('http://127.0.0.1:' + PORTA_PONTE + '/ping', { 'X-Codigo': CODIGO });
    log('TESTE: tela=' + a + ' ponte=' + b);
    app.exit(a === 200 && b === 200 ? 0 : 1);
    return;
  }
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(['media', 'clipboard-read', 'clipboard-sanitized-write', 'notifications', 'fullscreen'].includes(perm)));
  ORIGEM = origem;
  abrirJanela();
  ligarOllama().catch(() => {}); // se tiver Ollama no PC, já deixa ligado
});
let ORIGEM = '';
// 🪟 tamanho e lugar da janela ficam guardados (abre do jeito que você deixou)
const JANELA_ARQ = path.join(CASA0, 'janela.json');
function lerJanela() { try { return JSON.parse(fs.readFileSync(JANELA_ARQ, 'utf8')); } catch { return {}; } }
function guardarJanela() { try { if (janela && !janela.isDestroyed() && !janela.isMinimized()) fs.writeFileSync(JANELA_ARQ, JSON.stringify(Object.assign(janela.getNormalBounds(), { max: janela.isMaximized() }))); } catch {} }
ipcMain.handle('janela-tamanho', (_e, modo) => {
  if (!janela || janela.isDestroyed()) return '';
  if (janela.isMaximized()) janela.unmaximize();
  const area = screen.getDisplayMatching(janela.getBounds()).workArea;
  if (modo === 'celular') { const h = Math.min(940, area.height - 20), w = Math.round(h * 0.5); janela.setBounds({ width: w, height: h, x: area.x + Math.round((area.width - w) / 2), y: area.y + 10 }); }
  else if (modo === 'tablet') { const h = Math.min(1000, area.height - 20), w = Math.min(900, area.width - 40); janela.setBounds({ width: w, height: h, x: area.x + Math.round((area.width - w) / 2), y: area.y + 10 }); }
  else janela.maximize();
  guardarJanela(); return modo;
});
function abrirJanela() {
  const origem = ORIGEM;
  nativeTheme.themeSource = 'dark'; // barra de título escura, igual ao app
  const g = lerJanela();
  janela = new BrowserWindow({
    width: g.width || 1360, height: g.height || 900, x: g.x, y: g.y, minWidth: 360, minHeight: 500,
    title: 'Mini SK', autoHideMenuBar: true, backgroundColor: '#0f1420', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, spellcheck: true, additionalArguments: ['--minisk-codigo=' + CODIGO, '--minisk-pasta=' + CASA, '--minisk-portas=' + PORTA_APP + ',' + PORTA_TERMINAL + ',' + PORTA_PONTE] },
  });
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(origem) || url.startsWith('blob:') || url === 'about:blank') return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true } };
    // 🌐 sites abrem no Navegador do Mini SK (e não no Edge)
    if (/^https?:/i.test(url) && !/^http:\/\/(127\.0\.0\.1|localhost)/i.test(url)) abrirNavegador(url); else shell.openExternal(url);
    return { action: 'deny' };
  });
  janela.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(origem)) { e.preventDefault(); if (/^https?:/i.test(url)) abrirNavegador(url); else shell.openExternal(url); } });
  janela.once('ready-to-show', () => { if (g.max) janela.maximize(); janela.show(); });
  setTimeout(() => { if (janela && !janela.isDestroyed() && !janela.isVisible()) janela.show(); }, 4000);
  janela.on('resize', guardarJanela); janela.on('move', guardarJanela); janela.on('close', guardarJanela);
  janela.loadURL(origem + '/index.html');
  janela.on('closed', () => { janela = null; });
  if (usarPlaca) vigiarTelaPreta(janela);
}
// 🖤 confere se a tela abriu toda preta (defeito de placa de vídeo). Se sim, reabre sem a placa.
function vigiarTelaPreta(j) {
  let falhas = 0;
  app.on('child-process-gone', (_e, d) => { if (d && d.type === 'GPU' && d.reason !== 'clean-exit' && ++falhas >= 2) desligarPlaca('a placa de vídeo travou (' + d.reason + ')'); });
  j.webContents.once('did-finish-load', () => setTimeout(async () => {
    try {
      if (!j || j.isDestroyed() || j.isMinimized()) return;
      const img = await j.webContents.capturePage();
      const { width, height } = img.getSize(); if (!width || !height) return;
      const b = img.toBitmap(); let max = 0;
      for (let i = 0; i < b.length; i += 4 * 97) { const v = b[i] + b[i + 1] + b[i + 2]; if (v > max) max = v; if (max > 30) break; }
      if (max <= 6) { log('Tela preta detectada — vou abrir sem a placa de vídeo'); desligarPlaca('a tela abriu toda preta'); }
    } catch (e) { log('conferir tela preta:', e); }
  }, 3500));
}
// abriu de novo com um Mini SK já rodando: mostra a janela dele (ou cria, se tinha ficado sem janela)
app.on('second-instance', () => {
  if (janela && !janela.isDestroyed()) { if (janela.isMinimized()) janela.restore(); janela.show(); janela.focus(); }
  else if (ORIGEM) abrirJanela();
});
app.on('window-all-closed', () => app.quit());
// ao fechar: para tudo o que o terminal ligou (npm, servidores) — assim nada fica preso e o instalador novo não reclama
let saindo = false;
app.on('before-quit', () => { if (saindo) return; saindo = true; try { require('./terminal.cjs').pararTudo(); } catch {} });
app.on('will-quit', () => { setTimeout(() => process.exit(0), 3000).unref(); });
