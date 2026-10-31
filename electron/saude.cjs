/* 🩺 Saúde do computador — para o Mini SK para PC.
   Mostra, em português simples: espaço nos discos, memória, o que está usando as portas,
   as peças instaladas (Node, npm, Git, Ollama), o tamanho das pastas do Mini SK e o que dá para limpar.
   Também faz cópia de segurança (backup) dos projetos para outra pasta / HD externo.
   Nada é apagado sem você confirmar. Arquivos de projeto NUNCA são apagados (só peças e lixo que voltam sozinhos). */
const { spawnSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const WIN = process.platform === 'win32';

function rodar(cmd, args, ms) {
  try { const r = spawnSync(cmd, args, { windowsHide: true, encoding: 'utf8', timeout: ms || 8000, shell: WIN && !/\.exe$/i.test(cmd) && !['netstat', 'tasklist', 'taskkill'].includes(cmd) }); return (r.stdout || '') + (r.stderr || ''); } catch { return ''; }
}
const GB = (b) => (b / 1024 / 1024 / 1024).toFixed(1).replace('.', ',') + ' GB';
const MB = (b) => b >= 1024 * 1024 * 1024 ? GB(b) : b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + ' KB' : Math.round(b / 1024 / 1024) + ' MB';

async function tamanho(pasta, limiteMs) {
  const fim = Date.now() + (limiteMs || 6000); let total = 0, cortado = false;
  const pilha = [pasta];
  while (pilha.length) {
    if (Date.now() > fim) { cortado = true; break; }
    const d = pilha.pop(); let itens;
    try { itens = await fs.promises.readdir(d, { withFileTypes: true }); } catch { continue; }
    for (const it of itens) {
      const p = path.join(d, it.name);
      if (it.isDirectory()) pilha.push(p);
      else if (it.isFile()) { try { total += (await fs.promises.stat(p)).size; } catch {} }
    }
  }
  return { bytes: total, cortado };
}

function discos() {
  const out = [];
  const letras = WIN ? 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => l + ':\\') : ['/'];
  for (const raiz of letras) {
    try {
      if (!fs.existsSync(raiz)) continue;
      const s = fs.statfsSync(raiz); const total = s.blocks * s.bsize, livre = s.bavail * s.bsize;
      if (!total) continue;
      const pct = Math.round((1 - livre / total) * 100);
      out.push({ raiz, total: GB(total), livre: GB(livre), usado: pct, alerta: livre < 10 * 1024 ** 3 || pct > 90 });
    } catch {}
  }
  return out;
}

const CONHECIDAS = { 7680: 'Mini SK (a tela)', 11434: '🦙 Ollama', 5000: 'servidor de projeto (ex.: jurídico)', 5173: 'tela de projeto (vite)', 3000: 'projeto (Next/Node)', 8080: 'projeto', 4173: 'projeto (vite preview)', 5432: 'banco PostgreSQL', 3306: 'banco MySQL', 135: 'Windows (normal)', 445: 'Windows — compartilhamento (normal)', 139: 'Windows (normal)', 5040: 'Windows (normal)', 7681: 'Mini SK (terminal)', 7682: 'Mini SK (ponte)' };
function nomesDosProgramas() {
  const m = {}; if (!WIN) return m;
  rodar('tasklist', ['/FO', 'CSV', '/NH']).split(/\r?\n/).forEach((l) => { const c = l.match(/"([^"]*)"/g); if (c && c.length >= 5) { const pid = Number(c[1].replace(/"/g, '')); m[pid] = { nome: c[0].replace(/"/g, ''), mem: Number(c[4].replace(/[^\d]/g, '')) * 1024 }; } });
  return m;
}
function portas(progs) {
  const out = [], vistas = new Set();
  const txt = WIN ? rodar('netstat', ['-ano', '-p', 'tcp']) : rodar('ss', ['-ltnp']);
  txt.split(/\r?\n/).forEach((l) => {
    if (!/LISTEN|ESCUTA/i.test(l)) return;
    const m = l.match(/(?:127\.0\.0\.1|0\.0\.0\.0|\[::\]|\[::1\]|\*|::):(\d+)/); if (!m) return;
    const porta = Number(m[1]); if (vistas.has(porta)) return; vistas.add(porta);
    const pid = WIN ? Number(l.trim().split(/\s+/).pop()) : Number((l.match(/pid=(\d+)/) || [])[1] || 0);
    const prog = (progs[pid] && progs[pid].nome) || (l.match(/\("([^"]+)"/) || [])[1] || '';
    const deFora = /0\.0\.0\.0|\[::\]|\*/.test(m[0]);
    if (porta >= 49152 && !CONHECIDAS[porta] && !/node|ollama|python|mini-sk/i.test(prog)) return; // portas altas do Windows: barulho
    out.push({ porta, pid, programa: prog, oQue: CONHECIDAS[porta] || (/node/i.test(prog) ? 'servidor Node (projeto)' : /python/i.test(prog) ? 'Python' : /ollama/i.test(prog) ? '🦙 Ollama' : /mini-sk|electron/i.test(prog) ? 'Mini SK' : ''), podeFechar: /^(node|ollama|python|pythonw)(\.exe)?$/i.test(prog), aberta: deFora });
  });
  return out.sort((a, b) => a.porta - b.porta);
}
function versao(cmd) { const t = rodar(cmd, ['--version'], 6000).trim().split(/\r?\n/)[0] || ''; return /não é reconhecido|not recognized|not found|ENOENT/i.test(t) ? '' : t; }

async function analisar(CASA) {
  const progs = nomesDosProgramas();
  const memTotal = os.totalmem(), memLivre = os.freemem();
  const pecas = { node: process.versions.node ? versao('node') : '', npm: versao('npm'), git: versao('git'), ollama: versao('ollama'), python: versao(WIN ? 'python' : 'python3') };
  if (/Microsoft Store|Python was not found/i.test(pecas.python)) pecas.python = '';
  // pastas do Mini SK
  const projetos = [];
  try {
    for (const it of fs.readdirSync(CASA, { withFileTypes: true })) {
      if (!it.isDirectory() || it.name.startsWith('.') || /^Backup-Mini-SK/.test(it.name)) continue;
      const p = path.join(CASA, it.name), nm = path.join(p, 'node_modules');
      const temNm = fs.existsSync(nm);
      const t = await tamanho(p, 4000), tn = temNm ? await tamanho(nm, 4000) : { bytes: 0 };
      projetos.push({ nome: it.name, total: MB(t.bytes) + (t.cortado ? '+' : ''), pecas: temNm ? MB(tn.bytes) + (tn.cortado ? '+' : '') : '', bytesPecas: tn.bytes, temPecas: temNm });
    }
  } catch {}
  projetos.sort((a, b) => b.bytesPecas - a.bytesPecas);
  const tmp = await tamanho(os.tmpdir(), 5000);
  const npmCacheDir = WIN && process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'npm-cache') : path.join(os.homedir(), '.npm');
  const npmCache = fs.existsSync(npmCacheDir) ? await tamanho(npmCacheDir, 5000) : { bytes: 0 };
  const pesados = Object.entries(progs).map(([pid, v]) => ({ pid: Number(pid), nome: v.nome, mem: v.mem })).sort((a, b) => b.mem - a.mem).slice(0, 8).map((x) => ({ nome: x.nome, mem: MB(x.mem) }));
  const cpu = os.cpus() || [];
  return {
    quando: new Date().toLocaleString('pt-BR'),
    computador: { sistema: (WIN ? 'Windows ' : '') + os.release(), processador: (cpu[0] && cpu[0].model || '').replace(/\s+/g, ' ').trim(), nucleos: cpu.length, ligadoHa: Math.round(os.uptime() / 3600) + ' h' },
    memoria: { total: GB(memTotal), livre: GB(memLivre), usado: Math.round((1 - memLivre / memTotal) * 100) },
    discos: discos(), pecas, portas: portas(progs), pesados,
    pastas: { casa: CASA, projetos, temporarios: MB(tmp.bytes) + (tmp.cortado ? '+' : ''), npmCache: MB(npmCache.bytes) + (npmCache.cortado ? '+' : '') },
  };
}

async function apagarConteudo(pasta, maisVelhoQueMs) {
  let livre = 0, presos = 0; const agora = Date.now();
  let itens = []; try { itens = await fs.promises.readdir(pasta, { withFileTypes: true }); } catch { return { livre: 0, presos: 0 }; }
  for (const it of itens) {
    const p = path.join(pasta, it.name);
    try {
      const st = await fs.promises.stat(p);
      if (maisVelhoQueMs && agora - st.mtimeMs < maisVelhoQueMs) continue;
      const t = it.isDirectory() ? (await tamanho(p, 3000)).bytes : st.size;
      await fs.promises.rm(p, { recursive: true, force: true, maxRetries: 1 });
      livre += t;
    } catch { presos++; }
  }
  return { livre, presos };
}

/** 🧹 limpeza: só o que volta sozinho. tipo: 'temporarios' | 'npm-cache' | 'pecas' (node_modules de UM projeto) */
async function limpar(CASA, tipo, alvo) {
  if (tipo === 'temporarios') { const r = await apagarConteudo(os.tmpdir(), 24 * 3600 * 1000); return '🧹 Arquivos temporários: liberei ' + MB(r.livre) + (r.presos ? ' (' + r.presos + ' estavam em uso e ficaram — normal)' : '') + '.'; }
  if (tipo === 'npm-cache') { const antes = await tamanho(WIN ? path.join(process.env.LOCALAPPDATA || '', 'npm-cache') : path.join(os.homedir(), '.npm'), 4000); rodar('npm', ['cache', 'clean', '--force'], 120000); return '🧹 Cache do npm limpo (era ' + MB(antes.bytes) + '). As peças são baixadas de novo quando precisar.'; }
  if (tipo === 'pecas') {
    const proj = path.resolve(CASA, String(alvo || '')); if (!proj.startsWith(CASA + path.sep)) return 'fora da pasta do Mini SK';
    const nm = path.join(proj, 'node_modules'); if (!fs.existsSync(nm)) return 'Esse projeto não tem peças instaladas.';
    const t = await tamanho(nm, 8000);
    await fs.promises.rm(nm, { recursive: true, force: true, maxRetries: 2 });
    return '🧹 Peças de "' + path.basename(proj) + '" apagadas: liberei ' + MB(t.bytes) + '. Elas voltam sozinhas no 🚀 Ligar tudo (o seu código não foi mexido).';
  }
  return 'tipo desconhecido';
}

/** 💾 backup: copia os projetos (sem as peças node_modules, que voltam sozinhas) para a pasta escolhida */
async function backup(CASA, destino) {
  const nome = 'Backup-Mini-SK-' + new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
  const alvo = path.join(destino, nome);
  let arquivos = 0, bytes = 0;
  await fs.promises.cp(CASA, alvo, {
    recursive: true, errorOnExist: false, force: false,
    filter: (src) => {
      const b = path.basename(src);
      if (b === 'node_modules' || b === '.cache' || b === 'registro.txt') return false;
      try { const st = fs.statSync(src); if (st.isFile()) { arquivos++; bytes += st.size; } } catch {}
      return true;
    },
  });
  return { pasta: alvo, arquivos, tamanho: MB(bytes) };
}

function fecharPrograma(pid) {
  pid = Number(pid); if (!pid || pid === process.pid) return 'não';
  const progs = nomesDosProgramas(); const n = (progs[pid] && progs[pid].nome) || '';
  if (WIN && !/^(node|ollama|python|pythonw)(\.exe)?$/i.test(n)) return 'Por segurança, só fecho programas Node, Python ou Ollama.';
  if (WIN) rodar('taskkill', ['/pid', String(pid), '/T', '/F']); else { try { process.kill(pid); } catch {} }
  return '⏹ Fechei ' + (n || 'o programa') + ' (pid ' + pid + ').';
}

module.exports = { analisar, limpar, backup, fecharPrograma };
