(function () {
  'use strict';

  var KEY   = 'salus_utm';
  var PHONE = '5519996995087';
  var UTMS  = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];

  // 1. Captura UTMs na entrada (roda imediatamente)
  try {
    var p = new URLSearchParams(window.location.search);
    var found = {};
    UTMS.forEach(function (k) { var v = p.get(k); if (v) found[k] = v; });
    if (Object.keys(found).length > 0 && !sessionStorage.getItem(KEY)) {
      found.entry_page = window.location.href;
      sessionStorage.setItem(KEY, JSON.stringify(found));
    }
  } catch (e) {}

  // 2. Atualiza botao — roda apos window.load (depois do script do tema)
  function updateBtn() {
    var btn = document.getElementById('whatsapp-float');
    if (!btn) return;
    try {
      var stored = sessionStorage.getItem(KEY);
      var utm    = stored ? JSON.parse(stored) : null;
      var saida  = window.location.href;
      var titulo = document.title;

      var msg = 'Ola! Gostaria de mais informacoes sobre "' + titulo + '"\n';

      if (utm) {
        msg += '\nOrigem: '    + (utm.utm_source   || '-');
        if (utm.utm_medium)   msg += ' | Meio: '     + utm.utm_medium;
        if (utm.utm_campaign) msg += ' | Campanha: ' + utm.utm_campaign;
        if (utm.utm_content)  msg += ' | Anuncio: '  + utm.utm_content;
        msg += '\nEntrou em: ' + utm.entry_page;
        if (utm.entry_page !== saida) {
          msg += '\nSaiu de: ' + saida;
        }
      } else {
        msg += '\nOrigem: Acesso direto';
        msg += '\nPagina: ' + saida;
      }

      btn.setAttribute('href',
        'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(msg)
      );
    } catch (e) {}
  }

  // Rodar APOS window.load para garantir que o script do tema ja executou
  if (document.readyState === 'complete') {
    updateBtn();
  } else {
    window.addEventListener('load', updateBtn);
  }

})();
