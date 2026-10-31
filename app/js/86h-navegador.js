/* 🌐 Navegador de verdade — abre QUALQUER site sem sair do Mini SK (YouTube, GitHub, npm, Neon, Expo…).
   - 📦 no APK: é o navegador do próprio Android (AndroidBridge.navegar), com ◀ ▶, endereço e o voltar do celular.
   - 💻 no Mini SK para PC: uma janela de navegador própria (miniskPC.navegador).
   - 🌍 no PWA (navegador comum): os sites grandes proíbem aparecer dentro de outra página,
     então ele abre numa aba nova (isso é uma trava dos sites, não do Mini SK). */
(function (SK) {
  'use strict';
  const A = () => window.AndroidBridge && typeof window.AndroidBridge.navegar === 'function';
  const P = () => window.miniskPC && typeof window.miniskPC.navegador === 'function';
  const temDeVerdade = () => A() || P();

  function arrumar(t) {
    t = String(t || '').trim();
    if (!t) return '';
    if (/^https?:\/\//i.test(t)) return t;
    if (!/\s/.test(t) && /\./.test(t)) return 'https://' + t;
    return 'https://duckduckgo.com/?kl=br-pt&q=' + encodeURIComponent(t);
  }
  function guardar(u) { if (!u) return; const h = SK.pref.get('navRecentes', []).filter((x) => x !== u); h.unshift(u); SK.pref.set('navRecentes', h.slice(0, 30)); }

  /** Abre o endereço (ou a pesquisa) no navegador de verdade. Vazio = a última página. */
  function abrir(texto) {
    const u = arrumar(texto);
    if (u) guardar(u);
    if (A()) { window.AndroidBridge.navegar(u); return true; }
    if (P()) { window.miniskPC.navegador(u); return true; }
    window.open(u || 'https://duckduckgo.com/', '_blank', 'noopener');
    return false;
  }

  async function perguntar() {
    if (temDeVerdade()) return abrir('');
    const t = await SK.prompt('🌐 Endereço ou pesquisa (abre numa aba nova — no APK e no PC abre aqui dentro):', SK.pref.get('navRecentes', [])[0] || '', { okText: '🌐 Abrir' });
    if (t != null) abrir(t);
  }

  function ligar() {
    const b = document.getElementById('abrir-nav');
    if (b) {
      b.onclick = perguntar;
      b.title = temDeVerdade() ? 'Navegador de verdade: abre qualquer site aqui dentro (YouTube, GitHub, npm…)' : 'Abrir um site ou pesquisar (no navegador comum, abre numa aba nova)';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar); else ligar();

  SK.navegador = { abrir, temDeVerdade, arrumar };
})(window.SK);
