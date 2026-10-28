/* Better Voxels site: page translation (ru is the source, en / fr / zh come from i18n-dict.js).
   The pages are written in Russian. Each piece of Russian text is looked up as it stands:
   - a "unit" is the nearest element around a text node once inline tags (b, i, br...) are climbed over;
     when a unit has only inline children, its whole innerHTML is the key, so a sentence with <b> in it
     is translated as one sentence;
   - otherwise the text node alone is the key.
   Text the page scripts write later (version notes, scene names, the download popup) is caught by a
   MutationObserver, so the scripts stay in Russian and need no changes.
   The language is remembered in localStorage (bv-lang); a first visit picks it from the browser. */
(function(){
  var LANGS = ['ru', 'en', 'fr', 'zh'];
  var NAMES = {ru:'Русский', en:'English', fr:'Français', zh:'中文'};
  var SHORT = {ru:'RU', en:'EN', fr:'FR', zh:'中文'};
  var D = window.BV_I18N || {};
  var CYR = /[А-Яа-яЁё]/;
  var INLINE = {B:1, I:1, EM:1, U:1, CODE:1, BR:1, SUP:1, SUB:1, MARK:1, S:1};
  var SKIP = {SCRIPT:1, STYLE:1, NOSCRIPT:1, TEXTAREA:1};
  var ATTRS = ['aria-label', 'title', 'alt', 'placeholder'];
  var root = document.documentElement;
  var lang = 'ru', busy = false, obs = null;
  var units = new Set(), texts = new Set(), attrEls = new Set();
  var uRec = new WeakMap(), tRec = new WeakMap(), aRec = new WeakMap();
  var titleKey = document.title;
  var miss = window.BV_I18N_MISS = {};

  function norm(s){ return s.replace(/\s+/g, ' ').trim(); }
  function tr(key){
    if (lang === 'ru' || !CYR.test(key)) return key;
    var d = D[lang] || {};
    if (Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    // computed strings ("…, 20,9 МБ"): word-level rules for the parts the scripts glue together
    var rules = (D.rules || {})[lang], out = key;
    if (rules) for (var i = 0; i < rules.length; i++) out = out.replace(new RegExp(rules[i][0], 'g'), rules[i][1]);
    if (!CYR.test(out)) return out;
    miss[key] = 1;
    return key;
  }
  function skipped(el){
    for (; el && el !== root; el = el.parentNode){
      if (el.nodeType === 1 && (SKIP[el.tagName] || el.hasAttribute('data-noi18n'))) return true;
    }
    return false;
  }
  function unitOf(tn){
    var el = tn.parentNode;
    while (el && el.nodeType === 1 && INLINE[el.tagName] && el.parentNode && el.parentNode.nodeType === 1) el = el.parentNode;
    if (!el || el.nodeType !== 1 || el.namespaceURI !== 'http://www.w3.org/1999/xhtml') return null;
    for (var c = el.firstElementChild; c; c = c.nextElementSibling) if (!INLINE[c.tagName]) return null;
    return el;
  }

  function doUnit(el){
    var cur = norm(el.innerHTML), rec = uRec.get(el);
    // content that is not what we last wrote is new source text from the page (Russian)
    if (!rec || cur !== rec.applied){ rec = {key: cur}; uRec.set(el, rec); units.add(el); }
    // keep the unit's own leading/trailing space (" качества" -> " profiles", not "Qualityprofiles")
    if (rec.pre === undefined){ var m = /^(\s*)[\s\S]*?(\s*)$/.exec(el.innerHTML); rec.pre = m[1] ? ' ' : ''; rec.post = m[2] ? ' ' : ''; }
    var out = rec.pre + tr(rec.key) + rec.post;
    if (norm(out) !== cur || el.innerHTML !== out) el.innerHTML = out;
    rec.applied = norm(el.innerHTML);
  }
  function doText(tn){
    var v = tn.nodeValue, rec = tRec.get(tn);
    if (!rec || v !== rec.applied){
      var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(v);
      rec = {key: norm(m[2]), pre: m[1], post: m[3]}; tRec.set(tn, rec); texts.add(tn);
    }
    var out = rec.pre + tr(rec.key) + rec.post;
    if (out !== v) tn.nodeValue = out;
    rec.applied = tn.nodeValue;
  }
  function doAttrs(el){
    var rec = aRec.get(el) || {};
    ATTRS.forEach(function(a){
      if (!el.hasAttribute(a)) return;
      var v = el.getAttribute(a), r = rec[a];
      if (!r || v !== r.applied){
        if (!CYR.test(v) && !r) return;
        r = rec[a] = {key: norm(v)};
      }
      var out = tr(r.key);
      if (out !== v) el.setAttribute(a, out);
      r.applied = el.getAttribute(a);
    });
    if (Object.keys(rec).length){ aRec.set(el, rec); attrEls.add(el); }
  }

  function scan(node){
    if (!node) return;
    if (node.nodeType === 3){ handleText(node); return; }
    if (node.nodeType !== 1 || skipped(node)) return;
    var w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null), t, list = [];
    while ((t = w.nextNode())) if (CYR.test(t.nodeValue)) list.push(t);
    list.forEach(handleText);
    var els = node.querySelectorAll('[aria-label],[title],[alt],[placeholder]');
    if (node.matches && node.matches('[aria-label],[title],[alt],[placeholder]')) doAttrs(node);
    Array.prototype.forEach.call(els, function(e){ if (!skipped(e)) doAttrs(e); });
  }
  function handleText(t){
    if (!t.parentNode || skipped(t.parentNode)) return;
    var u = unitOf(t);
    if (u){ if (!skipped(u)) doUnit(u); } else doText(t);
  }

  function applyAll(){
    busy = true;
    units.forEach(function(u){ if (u.isConnected) doUnit(u); else units.delete(u); });
    texts.forEach(function(t){ if (t.isConnected) doText(t); else texts.delete(t); });
    attrEls.forEach(function(e){ if (e.isConnected) doAttrs(e); else attrEls.delete(e); });
    scan(document.body);
    document.title = tr(titleKey);
    if (obs) obs.takeRecords();
    busy = false;
  }

  function onMut(list){
    if (busy) return;
    busy = true;
    list.forEach(function(m){
      if (m.type === 'characterData') handleText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
      else {
        Array.prototype.forEach.call(m.addedNodes, scan);
        // a unit whose children were replaced (textContent = '…') is re-read as a whole
        if (m.target.nodeType === 1 && uRec.has(m.target)) doUnit(m.target);
      }
    });
    obs.takeRecords();
    busy = false;
  }

  function setLang(n, save){
    if (LANGS.indexOf(n) < 0) n = 'ru';
    lang = n;
    root.lang = n === 'zh' ? 'zh-CN' : n;
    LANGS.forEach(function(l){ root.classList.toggle('lang-' + l, l === n); });
    if (save){ try { localStorage.setItem('bv-lang', n); } catch (e) {} }
    applyAll();
    syncPickers();
    root.classList.remove('i18n-wait');
  }

  // ---- language pickers: every [data-langsel] gets a button + a small menu ----
  var pickers = [];
  function buildPicker(host){
    host.classList.add('langsel');
    host.setAttribute('data-noi18n', '');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'lang-btn';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg><span class="lang-cur"></span>';
    var menu = document.createElement('ul');
    menu.className = 'lang-menu'; menu.setAttribute('role', 'listbox');
    LANGS.forEach(function(l){
      var li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'option'); b.dataset.lang = l; b.lang = l;
      b.innerHTML = '<span>' + NAMES[l] + '</span><small>' + SHORT[l] + '</small>';
      b.addEventListener('click', function(){ close(); setLang(l, true); btn.focus(); });
      li.appendChild(b); menu.appendChild(li);
    });
    host.appendChild(btn); host.appendChild(menu);
    function open(){ host.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); var on = menu.querySelector('[aria-selected="true"]'); (on || menu.querySelector('button')).focus({preventScroll:true}); }
    function close(){ host.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function(e){ e.stopPropagation(); host.classList.contains('open') ? close() : open(); });
    document.addEventListener('click', function(e){ if (!host.contains(e.target)) close(); });
    host.addEventListener('keydown', function(e){
      if (e.key === 'Escape'){ close(); btn.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
        var bs = Array.prototype.slice.call(menu.querySelectorAll('button')), k = bs.indexOf(document.activeElement);
        if (k >= 0){ e.preventDefault(); bs[(k + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus(); }
      }
    });
    pickers.push({btn: btn, menu: menu});
  }
  function syncPickers(){
    pickers.forEach(function(p){
      p.btn.querySelector('.lang-cur').textContent = SHORT[lang];
      p.btn.setAttribute('aria-label', {ru:'Язык: русский', en:'Language: English', fr:'Langue : français', zh:'语言：中文'}[lang]);
      Array.prototype.forEach.call(p.menu.querySelectorAll('button'), function(b){ b.setAttribute('aria-selected', b.dataset.lang === lang ? 'true' : 'false'); });
    });
  }

  function pick(){
    try { var s = localStorage.getItem('bv-lang'); if (LANGS.indexOf(s) >= 0) return s; } catch (e) {}
    var nav = (navigator.languages || [navigator.language || 'ru']);
    for (var i = 0; i < nav.length; i++){
      var p = String(nav[i]).toLowerCase().slice(0, 2);
      if (p === 'ru' || p === 'uk' || p === 'be' || p === 'kk') return 'ru';
      if (LANGS.indexOf(p) >= 0) return p;
    }
    return 'en';
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-langsel]'), buildPicker);
  obs = new MutationObserver(onMut);
  obs.observe(document.body, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:ATTRS});
  setLang(pick(), false);
  window.BVI18N = {set: function(l){ setLang(l, true); }, get: function(){ return lang; }, t: tr,
    // for building the dictionary: every source string the page has shown so far
    keys: function(){
      var out = {};
      units.forEach(function(u){ var r = uRec.get(u); if (r && CYR.test(r.key)) out[r.key] = 1; });
      texts.forEach(function(t){ var r = tRec.get(t); if (r && CYR.test(r.key)) out[r.key] = 1; });
      attrEls.forEach(function(e){ var r = aRec.get(e); if (r) Object.keys(r).forEach(function(a){ if (CYR.test(r[a].key)) out[r[a].key] = 1; }); });
      if (CYR.test(titleKey)) out[titleKey] = 1;
      return Object.keys(out);
    }};
})();
