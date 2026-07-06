(function () {
  'use strict';

  var KEY     = 'salus_utm';
  var PHONE   = '5519996995087';
  var UTMS    = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  var CLICK_IDS = ['gclid','gbraid','wbraid']; // IDs de clique do Google
  var WEBHOOK = 'https://n8n.salusbrasil.com.br/webhook/gclid-capture';

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

    // Guarda o gclid/gbraid/wbraid REAL (alem do rotulo) p/ conversao offline
    CLICK_IDS.forEach(function (k) { var v = p.get(k); if (v) found[k] = v; });

    if (Object.keys(found).length > 0 && !sessionStorage.getItem(KEY)) {
      found.entry_page = window.location.href;
      sessionStorage.setItem(KEY, JSON.stringify(found));
    }
  } catch (e) {}

  // Fallback: le o gclid do cookie _gcl_aw (setado pelo Conversion Linker do GTM)
  // Formato: GCL.<timestamp>.<gclid>
  function gclidFromCookie() {
    try {
      var m = document.cookie.match(/(?:^|;\s*)_gcl_aw=([^;]+)/);
      if (!m) return null;
      var parts = decodeURIComponent(m[1]).split('.');
      return parts.length >= 3 ? parts.slice(2).join('.') : null;
    } catch (e) { return null; }
  }

  // Codigo curto (unico o suficiente p/ nosso volume). Vai na mensagem; o gclid vai pelo webhook.
  function genCode() {
    try { return 'S' + Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 6); }
    catch (e) { return 'S' + Math.random().toString(36).slice(2, 12); }
  }

  // Envia {code, gclid,...} pro n8n. sendBeacon (URLSearchParams = CORS-safe, sobrevive a navegacao).
  function sendToN8N(payload) {
    try {
      var data = new URLSearchParams(payload);
      if (navigator && navigator.sendBeacon && navigator.sendBeacon(WEBHOOK, data)) return true;
    } catch (e) {}
    try {
      fetch(WEBHOOK, {
        method: 'POST', keepalive: true, mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload).toString()
      });
      return true;
    } catch (e) { return false; }
  }

  // Mensagem base — IDENTICA a original (sem linha de id)
  function buildBaseMsg(utm, saida, titulo) {
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
    return msg;
  }

  // 2. Intercepta clique no botao WhatsApp e injeta a origem + (se houver gclid) o codigo
  function buildMsg() {
    try {
      var stored = sessionStorage.getItem(KEY);
      var utm    = stored ? JSON.parse(stored) : null;
      var saida  = window.location.href;
      var titulo = document.title;

      var msg = buildBaseMsg(utm, saida, titulo);

      var gclid  = (utm && utm.gclid)  || gclidFromCookie();
      var gbraid = (utm && utm.gbraid) || null;
      var wbraid = (utm && utm.wbraid) || null;

      if (gclid || gbraid || wbraid) {
        var code = genCode();
        var ok = sendToN8N({
          code: code,
          gclid: gclid || '', gbraid: gbraid || '', wbraid: wbraid || '',
          entry_page: (utm && utm.entry_page) || saida,
          page: saida,
          ts: String(Date.now())
        });
        if (ok) {
          msg += '\ncod: ' + code;                 // mensagem limpa; gclid segue pelo webhook
        } else {
          if (gclid)  msg += '\ngclid: '  + gclid; // fallback: nao perde o dado
          if (gbraid) msg += '\ngbraid: ' + gbraid;
          if (wbraid) msg += '\nwbraid: ' + wbraid;
        }
      }

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
