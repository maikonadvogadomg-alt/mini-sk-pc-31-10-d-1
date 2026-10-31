/* 🩺 Saúde do computador (só no Mini SK para PC).
   Um toque: mostra discos, memória, quem está usando cada porta, as peças instaladas (Node, npm, Git, Ollama),
   o tamanho das pastas dos projetos e o que dá para limpar. Faz backup dos projetos para outra pasta / HD externo.
   Também tem os botões 📱 Cara de celular / 💻 Tela grande para a janela. */
(function (SK) {
  'use strict';
  const PC = window.miniskPC;
  const esc = (s) => SK.esc(String(s == null ? '' : s));

  function css() {
    if (document.getElementById('pc-saude-css')) return;
    const st = document.createElement('style'); st.id = 'pc-saude-css';
    st.textContent = '.saude{border:1px solid var(--line);border-radius:10px;padding:10px;margin:8px 0;background:var(--bg2)}' +
      '.saude h4{margin:10px 0 4px;font-size:15px}.saude .lin{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:5px 0;border-bottom:1px solid var(--line)}' +
      '.saude .lin:last-child{border-bottom:0}.saude .bar{flex:1;min-width:120px;height:10px;border-radius:6px;background:var(--bg3);overflow:hidden}' +
      '.saude .bar i{display:block;height:100%;background:#3fa36b}.saude .bar i.alto{background:#d9822b}.saude .bar i.critico{background:#d64545}' +
      '.saude .ok{color:#4cc38a}.saude .ruim{color:#f0705f}.saude code{font-size:12px}';
    document.head.appendChild(st);
  }
  const barra = (pct) => '<span class="bar"><i class="' + (pct > 90 ? 'critico' : pct > 75 ? 'alto' : '') + '" style="width:' + Math.min(100, pct) + '%"></i></span>';

  function pintar(caixa, r) {
    if (r.erro) { caixa.innerHTML = '<p class="ruim">❌ Não consegui analisar: ' + esc(r.erro) + '</p>'; return; }
    const h = [];
    h.push('<div class="row wrap"><b>🩺 Saúde do computador</b><span class="muted small">' + esc(r.quando) + '</span><span class="cresce"></span><button class="btn small" data-s="de-novo">🔄 Analisar de novo</button><button class="btn small" data-s="copiar">📋 Copiar para a IA / Claude</button></div>');
    const c = r.computador || {};
    h.push('<p class="small muted">' + esc(c.sistema) + ' · ' + esc(c.processador) + ' (' + esc(c.nucleos) + ' núcleos) · ligado há ' + esc(c.ligadoHa) + '</p>');
    // memória
    const m = r.memoria || {};
    h.push('<h4>🧠 Memória</h4><div class="lin"><span>' + esc(m.livre) + ' livres de ' + esc(m.total) + '</span>' + barra(m.usado) + '<span>' + m.usado + '% em uso</span></div>');
    if (m.usado > 85) h.push('<p class="small ruim">A memória está quase cheia: feche abas do navegador e programas que não está usando (lista abaixo).</p>');
    // discos
    h.push('<h4>💽 Discos</h4>');
    (r.discos || []).forEach((d) => h.push('<div class="lin"><b>' + esc(d.raiz) + '</b><span>' + esc(d.livre) + ' livres de ' + esc(d.total) + '</span>' + barra(d.usado) + '<span class="' + (d.alerta ? 'ruim' : 'ok') + '">' + (d.alerta ? '⚠ pouco espaço' : '✅') + '</span></div>'));
    // peças
    const p = r.pecas || {};
    const peca = (nome, v, falta) => '<div class="lin"><b>' + nome + '</b><span class="' + (v ? 'ok' : 'ruim') + '">' + (v ? '✅ ' + esc(v) : '❌ não instalado') + '</span>' + (!v && falta ? '<span class="small muted">' + falta + '</span>' : '') + '</div>';
    h.push('<h4>🧩 Peças instaladas</h4>' + peca('Node', p.node, 'baixe em nodejs.org (versão LTS)') + peca('npm', p.npm, 'vem junto com o Node') + peca('Git', p.git, 'git-scm.com (para o GitHub pelo terminal)') + peca('🦙 Ollama', p.ollama, 'ollama.com/download (IA grátis no PC)') + peca('Python', p.python, 'só se algum projeto pedir'));
    // portas
    h.push('<h4>🔌 Portas em uso</h4><p class="small muted">Cada programa que serve uma tela usa uma "porta" (um número). Se duas coisas querem a mesma porta, uma delas não liga.</p>');
    if (!(r.portas || []).length) h.push('<p class="small muted">Nenhuma porta de projeto em uso.</p>');
    (r.portas || []).forEach((x) => h.push('<div class="lin"><code>' + x.porta + '</code><span>' + esc(x.oQue || 'outro programa') + '</span><span class="small muted">' + esc(x.programa) + (x.pid ? ' · pid ' + x.pid : '') + '</span><span class="cresce"></span>' +
      (x.porta < 49152 && x.porta !== 135 && x.porta !== 139 && x.porta !== 445 ? '<button class="btn small" data-s="ver" data-porta="' + x.porta + '">👁 Ver</button>' : '') +
      (x.podeFechar ? '<button class="btn small" data-s="fechar" data-pid="' + x.pid + '" data-nome="' + esc(x.programa) + '" data-porta="' + x.porta + '">⏹ Fechar</button>' : '') + '</div>'));
    // pesados
    if ((r.pesados || []).length) {
      h.push('<h4>🏋 Programas que mais usam memória</h4>');
      r.pesados.forEach((x) => h.push('<div class="lin"><span>' + esc(x.nome) + '</span><span class="cresce"></span><span class="muted">' + esc(x.mem) + '</span></div>'));
    }
    // pastas e limpeza
    const pa = r.pastas || {};
    h.push('<h4>🧹 Limpeza (só o que volta sozinho)</h4>');
    h.push('<div class="lin"><span>Arquivos temporários do Windows</span><span class="muted">' + esc(pa.temporarios) + '</span><span class="cresce"></span><button class="btn small" data-s="limpar" data-tipo="temporarios">🧹 Limpar</button></div>');
    h.push('<div class="lin"><span>Cache de peças do npm</span><span class="muted">' + esc(pa.npmCache) + '</span><span class="cresce"></span><button class="btn small" data-s="limpar" data-tipo="npm-cache">🧹 Limpar</button></div>');
    h.push('<h4>📁 Projetos na pasta <code>' + esc(pa.casa) + '</code></h4><p class="small muted">"Peças" = a pasta node_modules (é o que pesa). Apagar as peças <b>não mexe no seu código</b>: elas voltam sozinhas no 🚀 Ligar tudo.</p>');
    (pa.projetos || []).forEach((x) => h.push('<div class="lin"><b>' + esc(x.nome) + '</b><span class="muted small">total ' + esc(x.total) + (x.temPecas ? ' · peças ' + esc(x.pecas) : ' · sem peças') + '</span><span class="cresce"></span>' + (x.temPecas ? '<button class="btn small" data-s="limpar" data-tipo="pecas" data-alvo="' + esc(x.nome) + '">🧹 Apagar as peças</button>' : '') + '</div>'));
    if (!(pa.projetos || []).length) h.push('<p class="small muted">Nenhum projeto na pasta ainda.</p>');
    h.push('<h4>💾 Backup</h4><div class="lin"><span>Copia <b>todos os projetos</b> (sem as peças, que voltam sozinhas) para a pasta que você escolher — por exemplo, o <b>HD externo</b>. Não apaga nada.</span><span class="cresce"></span><button class="btn small primary" data-s="backup">💾 Fazer backup</button></div>');
    h.push('<div id="saude-msg" class="small" style="margin-top:6px"></div>');
    caixa.innerHTML = h.join('');
    caixa._dados = r;
  }

  function resumoTexto(r) {
    const l = ['🩺 Saúde do computador — ' + r.quando, 'Sistema: ' + r.computador.sistema + ' · ' + r.computador.processador + ' (' + r.computador.nucleos + ' núcleos)',
      'Memória: ' + r.memoria.livre + ' livres de ' + r.memoria.total + ' (' + r.memoria.usado + '% em uso)'];
    (r.discos || []).forEach((d) => l.push('Disco ' + d.raiz + ': ' + d.livre + ' livres de ' + d.total + (d.alerta ? ' ⚠ pouco espaço' : '')));
    l.push('Peças: ' + Object.entries(r.pecas || {}).map(([k, v]) => k + ' ' + (v || 'NÃO instalado')).join(' · '));
    l.push('Portas: ' + ((r.portas || []).map((x) => x.porta + ' (' + (x.oQue || x.programa || '?') + ')').join(', ') || 'nenhuma'));
    l.push('Projetos: ' + ((r.pastas.projetos || []).map((x) => x.nome + ' ' + x.total + (x.temPecas ? ' [peças ' + x.pecas + ']' : '')).join(', ') || 'nenhum'));
    return l.join('\n');
  }

  async function analisar(caixa) {
    caixa.hidden = false; caixa.innerHTML = '<p>⏳ Analisando o computador… (uns 10 segundos)</p>';
    let r; try { r = await PC.analisar(); } catch (e) { r = { erro: e.message }; }
    pintar(caixa, r);
  }

  function montar(lugar) {
    if (!PC || typeof PC.analisar !== 'function' || !lugar) return;
    css();
    const linha = document.createElement('div'); linha.className = 'row wrap'; linha.style.margin = '6px 0';
    linha.innerHTML = '<button class="btn" id="pc-saude-btn" title="Discos, memória, portas, peças instaladas, limpeza e backup">🩺 Saúde do computador</button>' +
      (typeof PC.tamanho === 'function' ? '<button class="btn small" data-tam="celular" title="Janela estreita, com a mesma cara do celular">📱 Cara de celular</button><button class="btn small" data-tam="tablet">📟 Média</button><button class="btn small" data-tam="grande">🖥 Tela cheia</button>' : '');
    const caixa = document.createElement('div'); caixa.className = 'saude'; caixa.hidden = true;
    lugar.after(linha); linha.after(caixa);
    linha.querySelector('#pc-saude-btn').onclick = () => (caixa.hidden ? analisar(caixa) : (caixa.hidden = true));
    linha.querySelectorAll('[data-tam]').forEach((b) => { b.onclick = () => { PC.tamanho(b.dataset.tam); SK.pref.set('pcJanela', b.dataset.tam); }; });
    caixa.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-s]'); if (!b) return;
      const msg = (t) => { const m = caixa.querySelector('#saude-msg'); if (m) m.textContent = t; SK.toast(t); };
      const s = b.dataset.s;
      if (s === 'de-novo') return analisar(caixa);
      if (s === 'copiar') { try { await navigator.clipboard.writeText(resumoTexto(caixa._dados)); SK.toast('📋 Copiado. Cole na conversa.'); } catch { SK.toast('Não consegui copiar', 'err'); } return; }
      if (s === 'ver') { const inp = document.getElementById('tx-porta'), v = document.getElementById('tx-ver'); if (inp && v) { inp.value = b.dataset.porta; v.click(); v.scrollIntoView({ block: 'center' }); } return; }
      if (s === 'fechar') {
        if (!(await SK.confirm('Fechar o programa "' + b.dataset.nome + '" que está usando a porta ' + b.dataset.porta + '? (o que ele estava rodando para)', { okText: '⏹ Fechar', danger: true }))) return;
        msg(await PC.fechar(Number(b.dataset.pid))); return analisar(caixa);
      }
      if (s === 'limpar') {
        const t = b.dataset.tipo;
        const pergunta = t === 'pecas' ? 'Apagar as peças (node_modules) de "' + b.dataset.alvo + '"? O seu código NÃO é apagado. As peças voltam no 🚀 Ligar tudo (demora alguns minutos). Pare o projeto antes (⏹ Parar).'
          : t === 'npm-cache' ? 'Limpar o cache do npm? As peças são baixadas de novo da internet quando precisar.'
          : 'Limpar os arquivos temporários do Windows (com mais de 1 dia)? Os que estiverem em uso ficam.';
        if (!(await SK.confirm(pergunta, { okText: '🧹 Limpar' }))) return;
        b.disabled = true; msg('⏳ Limpando…');
        msg(await PC.limpar(t, b.dataset.alvo || ''));
        return analisar(caixa).then(() => msg(''));
      }
      if (s === 'backup') {
        b.disabled = true; msg('📂 Escolha a pasta (ex.: o HD externo)…');
        const r = await PC.backup(); b.disabled = false;
        if (r.cancelado) return msg('Backup cancelado.');
        if (r.erro) return msg('❌ Backup falhou: ' + r.erro);
        msg('✅ Backup pronto: ' + r.arquivos + ' arquivos (' + r.tamanho + ') em ' + r.pasta);
      }
    });
  }

  SK.saudePC = { montar, resumoTexto };
})(window.SK);
