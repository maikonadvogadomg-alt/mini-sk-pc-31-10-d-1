/* =========================================================================
   Mini SK — 91c-projetos-gh.js
   🐙 PROJETOS NO GITHUB — igual ao SK da Replit:
   - Com o token do GitHub, a lista dos seus repositórios aparece em 🗂 Projetos
     (os 100 mais recentes primeiro + "Mais antigos" + 🔎 pesquisa em todos).
     Eles NÃO ocupam espaço: são só o endereço. Toque em ⬇ Abrir e ele baixa.
   - Cada projeto do aparelho mostra se está ✅ igual no GitHub, ✏️ mudou
     depois do envio, ou ⚠ só neste aparelho.
   - ⬆ Mandar para o GitHub (repositório PRIVADO, criado sozinho) e
     🧹 Liberar espaço (tira do aparelho só o que já está IGUAL no GitHub).
   - O 💾 Backup de tudo pode deixar de fora o que já está no GitHub.
   ========================================================================= */
(function (SK) {
  'use strict';
  const fs = () => SK.fs;
  const gh = () => SK.github;
  let repos = [], pagina = 0, acabou = false, carregando = false, box = null, erro = '';

  // ── o que existe neste aparelho e a ligação de cada projeto com o GitHub ──
  function lerPref(k) { try { const v = localStorage.getItem('minisk:' + k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } }
  const linkDe = (nome) => lerPref('ghLink:' + nome);
  const sincDe = (nome) => lerPref('ghSinc:' + nome);
  /** situação de um projeto: 'igual' | 'mudou' | 'ligado' (tem repositório, nunca conferido) | 'so-aqui' */
  function situacao(p) {
    const l = linkDe(p.name);
    if (!l) return { tipo: 'so-aqui', l: null };
    const s = sincDe(p.name);
    if (!s) return { tipo: 'ligado', l };
    return { tipo: (p.alterado || p.updated || 0) <= (s.updated || 0) ? 'igual' : 'mudou', l, s };
  }
  function selo(p) {
    const st = situacao(p);
    if (st.tipo === 'igual') return '<span class="pill ok" title="O GitHub tem tudo deste projeto">✅ igual no GitHub</span>';
    if (st.tipo === 'mudou') return '<span class="pill warn" title="Você mudou depois do último envio">✏️ mudou — falta ⬆ enviar</span>';
    if (st.tipo === 'ligado') return '<span class="pill" title="Tem repositório, mas ainda não conferi se está igual">🐙 ' + SK.esc(st.l.repo) + '</span>';
    return '<span class="pill bad" title="Este projeto só existe neste aparelho">⚠ só neste aparelho</span>';
  }
  function botoes(p) {
    const st = situacao(p);
    let h = '';
    if (st.tipo !== 'igual') h += '<button class="btn tiny" data-gh="enviar" title="Manda para o GitHub (cria o repositório PRIVADO se não existir)">⬆ Enviar</button>';
    if (st.tipo === 'igual') h += '<button class="btn tiny" data-gh="tirar" title="Apaga só a cópia deste aparelho. O projeto continua no GitHub e volta com um toque.">🧹 Tirar do aparelho</button>';
    return h;
  }
  async function locaisPorRepo() {
    const map = new Map();
    for (const p of await fs().listProjects()) { const l = linkDe(p.name); if (l) map.set((l.owner + '/' + l.repo).toLowerCase(), p.name); }
    return map;
  }

  // ── lista do GitHub (só endereços: não pesa nada) ──
  async function carregar(mais) {
    if (!gh() || !gh().token || carregando) return;
    if (!mais) { repos = []; pagina = 0; acabou = false; }
    if (acabou) return;
    carregando = true; erro = ''; pintar();
    try {
      pagina++;
      const l = await gh().gh('/user/repos?per_page=100&sort=pushed&direction=desc&affiliation=owner,collaborator&page=' + pagina);
      const ja = new Set(repos.map((r) => r.full_name));
      l.forEach((r) => { if (!ja.has(r.full_name)) repos.push(r); });
      if (l.length < 100) acabou = true;
    } catch (e) { erro = e.message; pagina--; }
    carregando = false; pintar();
  }
  async function pesquisar(q) {
    q = String(q || '').trim(); if (!q || !gh().token) return;
    carregando = true; erro = ''; pintar();
    try {
      const u = await gh().ensureUser();
      const r = await gh().gh('/search/repositories?per_page=50&q=' + encodeURIComponent(q + ' user:' + u.login + ' fork:true'));
      const ja = new Set(repos.map((x) => x.full_name));
      (r.items || []).forEach((x) => { if (!ja.has(x.full_name)) repos.push(x); });
      if (!(r.items || []).length) SK.toast('Nenhum repositório com "' + q + '" no nome', 'error');
    } catch (e) { erro = e.message; }
    carregando = false; pintar();
  }

  async function pintar() {
    if (!box) return;
    const el = box;
    if (!gh() || !gh().token) {
      el.innerHTML = '<h4>🐙 Meus projetos no GitHub</h4><p class="muted small">Coloque o <b>token do GitHub</b> (em 🐙 GitHub, ou traga pelo ⚙️ → 🔐 Cofre) e a lista dos seus projetos aparece aqui — sem ocupar espaço. Igual ao SK da Replit.</p><button class="btn small" data-gh="abrir-gh">🐙 Colocar o token</button>';
      return;
    }
    const q = (SK.$('#pjg-q', el) || {}).value || '';
    const locais = await locaisPorRepo();
    const todos = await fs().listProjects();
    const soAqui = todos.filter((p) => ['so-aqui', 'mudou', 'ligado'].includes(situacao(p).tipo));
    const iguais = todos.filter((p) => situacao(p).tipo === 'igual');
    const filtro = q.toLowerCase();
    const lista = repos.filter((r) => !filtro || r.full_name.toLowerCase().includes(filtro) || String(r.description || '').toLowerCase().includes(filtro));
    el.innerHTML = '<h4>🐙 Meus projetos no GitHub <button class="btn tiny" data-gh="recarregar" title="Atualizar a lista">🔄</button></h4>' +
      '<p class="muted small" style="margin:0">Só o endereço — não ocupa espaço. <b>⬇ Abrir</b> baixa e abre; <b>📱</b> = já está neste aparelho.</p>' +
      '<div class="row"><input class="inp grow" id="pjg-q" placeholder="🔎 Pesquisar (Enter procura em todos)" value="' + SK.esc(q) + '" autocomplete="off"></div>' +
      (erro ? '<p class="msg error">' + SK.esc(erro) + '</p>' : '') +
      '<div class="pj-list" id="pjg-lista" style="max-height:46vh;overflow:auto">' +
      (lista.length ? lista.map((r) => {
        const local = locais.get(r.full_name.toLowerCase());
        return '<div class="pj" data-full="' + SK.esc(r.full_name) + '"><div style="min-width:0"><b>' + SK.esc(r.name) + '</b>' + (r.private ? ' 🔒' : '') + (local ? ' <span class="pill ok">📱 neste aparelho</span>' : '') +
          '<div class="muted small">' + (r.pushed_at ? new Date(r.pushed_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '') + (r.owner && gh().user && r.owner.login !== gh().user.login ? ' · ' + SK.esc(r.owner.login) : '') + (r.size ? ' · ' + SK.bytes(r.size * 1024) : '') + '</div></div>' +
          '<div class="row tight"><button class="btn tiny primary" data-gh="abrir">' + (local ? 'Abrir' : '⬇ Abrir') + '</button></div></div>';
      }).join('') : '<p class="muted small">' + (carregando ? 'Carregando…' : (q ? 'Nada com esse nome nos carregados. Aperte Enter para procurar em todos.' : 'Nenhum repositório ainda.')) + '</p>') +
      '</div>' +
      '<div class="row wrap">' + (!acabou ? '<button class="btn small" data-gh="mais"' + (carregando ? ' disabled' : '') + '>⤓ Mais antigos</button>' : '') + '<span class="muted small">' + repos.length + ' carregado(s)' + (carregando ? ' · carregando…' : '') + '</span></div>' +
      '<div class="gh-sec" style="margin-top:8px"><b class="small">Neste aparelho</b>' +
      '<p class="muted small" style="margin:2px 0">' + todos.length + ' projeto(s): <b>' + iguais.length + '</b> já iguais no GitHub · <b>' + soAqui.length + '</b> com coisa que ainda não está lá.</p>' +
      '<div class="row wrap">' +
      (soAqui.length ? '<button class="btn small primary" data-gh="mandar-todos" title="Cria repositório PRIVADO para cada um que não tem">⬆ Mandar os ' + soAqui.length + ' para o GitHub</button>' : '') +
      (iguais.length ? '<button class="btn small" data-gh="liberar" title="Apaga só as cópias deste aparelho que já estão iguais no GitHub">🧹 Liberar espaço (' + iguais.length + ')</button>' : '') +
      '</div><div class="gh-status" id="pjg-status"></div></div>';
    const inp = SK.$('#pjg-q', el);
    inp.oninput = SK.debounce(() => { const pos = inp.selectionStart; pintar().then(() => { const n = SK.$('#pjg-q', el); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }); }, 250);
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); pesquisar(inp.value); } };
  }
  const st = (t, k) => { const e = box && SK.$('#pjg-status', box); if (e) { e.textContent = t; e.className = 'gh-status ' + (k || ''); } SK.toast(t, k === 'error' ? 'error' : undefined); };

  // ── ações ──
  async function abrirRepo(full) {
    const [owner, repo] = full.split('/');
    const local = (await locaisPorRepo()).get(full.toLowerCase());
    if (local) { await fs().open(local); SK.toast('📱 Aberto: ' + local); return; }
    SK.toast('⬇ Baixando ' + full + '…');
    await gh().importRepo(owner, repo, '', false);
    SK.toast('✅ ' + full + ' aberto', 'ok');
  }
  /** manda um projeto (aberto ou não) para o GitHub; volta para o projeto que estava aberto */
  async function enviarProjeto(nome) {
    const antes = fs().project && fs().project.name;
    await fs().saveNow();
    if (antes !== nome) await fs().open(nome);
    try {
      const l = linkDe(nome);
      const alvo = l ? l.owner + '/' + l.repo : gh().repoSlug(nome) || 'projeto-' + Date.now();
      const r = await gh().sendTo(alvo, 'Enviado pelo Mini SK (' + new Date().toLocaleString('pt-BR') + ')', { priv: true, mirror: false, branch: l && l.branch ? l.branch : '' });
      return r;
    } finally { if (antes && antes !== nome) await fs().open(antes); }
  }
  async function tirarDoAparelho(nome) {
    const p = (await fs().listProjects()).find((x) => x.name === nome);
    if (!p || situacao(p).tipo !== 'igual') throw new Error('"' + nome + '" não está igual no GitHub. Envie antes de tirar.');
    const eraAberto = fs().project && fs().project.name === nome;
    await fs().deleteProject(nome);
    try { localStorage.removeItem('minisk:ghLink:' + nome); localStorage.removeItem('minisk:ghSinc:' + nome); } catch (e) {}
    if (eraAberto) { const rest = await fs().listProjects(); if (rest.length) await fs().open(rest[0].name); else await fs().create('Meu projeto', { 'index.html': fs().recordFromBytes('index.html', new TextEncoder().encode('<!doctype html>\n<h1>Olá</h1>\n')) }); }
  }

  async function onClick(e) {
    const b = e.target.closest('[data-gh]'); if (!b) return;
    const a = b.dataset.gh;
    const row = b.closest('[data-name]'); const nome = row ? row.dataset.name : '';
    const btns = [b]; b.disabled = true;
    try {
      if (a === 'abrir-gh') SK.app.openSide('gh');
      if (a === 'recarregar') await carregar(false);
      if (a === 'mais') await carregar(true);
      if (a === 'abrir') { await abrirRepo(b.closest('[data-full]').dataset.full); SK.emit('pj-mudou'); }
      if (a === 'enviar' && nome) { st('⬆ Enviando "' + nome + '"…'); const r = await enviarProjeto(nome); st('✅ "' + nome + '" está no GitHub: ' + r.owner + '/' + r.repo + (r.created ? ' (repositório privado criado)' : ''), 'ok'); SK.emit('pj-mudou'); }
      if (a === 'tirar' && nome) {
        if (!(await SK.confirm('Tirar "' + nome + '" deste aparelho?\n\nEle está IGUAL no GitHub: volta com um toque em ⬇ Abrir. Os pontos de volta (📸) dele são apagados.', { okText: '🧹 Tirar do aparelho' }))) return;
        await tirarDoAparelho(nome); st('🧹 "' + nome + '" saiu do aparelho (continua no GitHub).', 'ok'); SK.emit('pj-mudou');
      }
      if (a === 'mandar-todos') {
        const todos = (await fs().listProjects()).filter((p) => ['so-aqui', 'mudou', 'ligado'].includes(situacao(p).tipo));
        if (!(await SK.confirm('Mandar ' + todos.length + ' projeto(s) para o GitHub?\n\nOs que não têm repositório ganham um PRIVADO (só você vê). Nada é apagado no GitHub. Pode demorar.', { okText: '⬆ Mandar todos' }))) return;
        let ok = 0; const falhas = [];
        for (const p of todos) {
          st('⬆ ' + (ok + falhas.length + 1) + '/' + todos.length + ': ' + p.name + '…');
          try { await enviarProjeto(p.name); ok++; } catch (er) { falhas.push(p.name + ': ' + er.message); }
        }
        st('✅ ' + ok + ' enviado(s)' + (falhas.length ? ' · ⚠ ' + falhas.length + ' com erro: ' + falhas.join(' | ') : ''), falhas.length ? 'error' : 'ok');
        SK.emit('pj-mudou');
      }
      if (a === 'liberar') {
        const iguais = (await fs().listProjects()).filter((p) => situacao(p).tipo === 'igual');
        if (!(await SK.confirm('Tirar deste aparelho os ' + iguais.length + ' projeto(s) que já estão IGUAIS no GitHub?\n\n' + iguais.map((p) => '• ' + p.name).join('\n') + '\n\nEles continuam no GitHub e voltam com ⬇ Abrir.', { okText: '🧹 Liberar espaço' }))) return;
        for (const p of iguais) await tirarDoAparelho(p.name);
        st('🧹 ' + iguais.length + ' projeto(s) saíram do aparelho. Continuam no GitHub.', 'ok'); SK.emit('pj-mudou');
      }
    } catch (er) { st('⚠ ' + er.message, 'error'); }
    finally { btns.forEach((x) => { x.disabled = false; }); pintar(); }
  }

  function montar(el) {
    box = el;
    el.addEventListener('click', onClick);
    pintar();
    if (gh() && gh().token && !repos.length) carregar(false);
  }
  /** usado pelo 🗂 Projetos (lista de projetos do aparelho) */
  function ligarLista(el) { el.addEventListener('click', onClick); }

  SK.on('cofre-aplicado', () => { if (box) { repos = []; pintar(); if (gh().token) carregar(false); } });
  SK.on('gh-sinc', () => { if (box) pintar(); });

  /** ao abrir 🗂 Projetos: redesenha e, se acabou de pôr o token, carrega a lista */
  function atualizar() { if (!box) return; if (gh() && gh().token && !repos.length && !carregando) carregar(false); else pintar(); }
  SK.projGH = { atualizar, montar, ligarLista, selo, botoes, situacao, carregar, enviarProjeto, tirarDoAparelho, get repos() { return repos; } };
})(window.SK);
