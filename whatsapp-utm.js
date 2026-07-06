(function () {
  'use strict';

  var KEY   = 'salus_utm';
  var PHONE = '5519996995087';
  var UTMS  = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  var CLICK_IDS = ['gclid','gbraid','wbraid']; // IDs de clique do Google (conversao offline)

  // 1. Captura origem na entrada (UTM manual ou Google Ads auto-tagging)
  try {
    var p = new URLSearchParams(window.location.search);
    var found = {};

    UTMS.forEach(function (k) { var v = p.get(k); if (v) found[k] = v; });

    if (!found.utm_source && (p.get('gclid') || p.get('gad_source') || p.get('gbraid') || p.get('wbraid'))) {
      found.utm_source   = 'google';
      found.utm_medium   = 'cpc';
      found.utm_campaign = p.get('gad_campaignid') ? 'ID:' + p.get('gad_campaignid') : 'google-ads';
      found._auto_tagged = true;
    }

    // 1b. Guarda o gclid/gbraid/wbraid REAL (alem do rotulo) p/ conversao offline
    CLICK_IDS.forEach(function (k) { var v = p.get(k); if (v) found[k] = v; });

    if (Object.keys(found).length > 0 && !sessionStorage.getItem(KEY)) {
      found.entry_page = window.location.href;
      sessionStorage.setItem(KEY, JSON.stringify(found));
    }
  } catch (e) {}

  // Fallback: le o gclid do cookie _gcl_aw (setado pelo Conversion Linker do GTM)
  // Formato do cookie: GCL.<timestamp>.<gclid>
  function gclidFromCookie() {
    try {
      var m = document.cookie.match(/(?:^|;\s*)_gcl_aw=([^;]+)/);
      if (!m) return null;
      var parts = decodeURIComponent(m[1]).split('.');
      return parts.length >= 3 ? parts.slice(2).join('.') : null;
    } catch (e) { return null; }
  }

  // 2. Intercepta clique no botao WhatsApp e injeta UTMs na mensagem
  function buildMsg() {
    try {
      var stored = sessionStorage.getItem(KEY);
      var utm    = stored ? JSON.parse(stored) : null;
      var saida  = window.location.href;
      var titulo = document.title;

      var msg = 'Ola! Gostaria de mais informacoes sobre "' + titulo + '"\n';

      if (utm) {
        msg += '\nOrigem: ' + (utm.utm_source || '-');
        if (utm.utm_medium)                       msg += ' | Meio: '     + utm.utm_medium;
        if (utm.utm_campaign)                     msg += ' | Campanha: ' + utm.utm_campaign;
        if (utm.utm_content && !utm._auto_tagged) msg += ' | Anuncio: '  + utm.utm_content;
        msg += '\nEntrou em: ' + utm.entry_page;
        if (utm.entry_page !== saida) msg += '\nSaiu de: ' + saida;
      } else {
        msg += '\nOrigem: Acesso direto';
        msg += '\nPagina: ' + saida;
      }

      // Anexa os IDs de clique do Google (gclid real) p/ match de conversao offline.
      // Linha discreta no fim, parseavel no Kommo. So aparece quando existe ID.
      var ids = {
        gclid:  (utm && utm.gclid)  || gclidFromCookie(),
        gbraid: (utm && utm.gbraid) || null,
        wbraid: (utm && utm.wbraid) || null
      };
      CLICK_IDS.forEach(function (k) { if (ids[k]) msg += '\n' + k + ': ' + ids[k]; });

      return msg;
    } catch (e) { return null; }
  }

  // Interceptacao via capture phase — roda antes do browser seguir o link
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el !== document) {
      if (el.id === 'whatsapp-float') {
        var msg = buildMsg();
        if (msg) {
          el.href = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(msg);
        }
        return;
      }
      el = el.parentElement;
    }
  }, true);

})();
