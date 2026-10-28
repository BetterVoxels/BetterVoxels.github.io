/* Motion Blur: the easter-egg reward. While the page scrolls, its content is smeared vertically in
   proportion to the scroll speed (an SVG blur, vertical only), like a camera's motion blur.
   Off until the grass block under the footer is found; then it stays on (localStorage bv-mblur) on
   every page that loads this script, until the visitor switches it off in the notice.
   window.BVMotionBlur = {on(), enable(rampMs), disable(), notice()} */
(function(){
  var KEY = 'bv-mblur', MAXB = 7, GAIN = .085;      // max blur in px, and px of blur per px/frame of scroll
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sc = document.getElementById('sc');            // the main page scrolls inside #sc, other pages scroll the window
  // never the body: a filter there would unpin the fixed side menu while it blurs
  var target = sc || document.querySelector('main, body > .wrap') || document.body;
  function pos(){ return sc ? sc.scrollTop : (window.scrollY || document.documentElement.scrollTop); }

  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  var f = document.createElementNS(svgNS, 'filter');
  f.setAttribute('id', 'bv-mb'); f.setAttribute('x', '0'); f.setAttribute('y', '-5%'); f.setAttribute('width', '100%'); f.setAttribute('height', '110%');
  f.setAttribute('color-interpolation-filters', 'sRGB');
  var gb = document.createElementNS(svgNS, 'feGaussianBlur'); gb.setAttribute('stdDeviation', '0 0');
  f.appendChild(gb); svg.appendChild(f); document.body.appendChild(svg);

  var on = false, strength = 0, goal = 0, rampFrom = 0, rampT0 = 0, rampDur = 0;
  try { on = localStorage.getItem(KEY) === '1'; } catch (e) {}
  if (reduce) on = false;
  strength = goal = on ? 1 : 0;

  var last = pos(), v = 0, blur = 0, raf = 0, shown = -1;
  function frame(now){
    raf = 0;
    // strength eases towards its goal (the slow ramp after the egg is found, or the fade when switched off)
    if (rampDur){
      var t = Math.min(1, (now - rampT0) / rampDur), e = t * t * (3 - 2 * t);
      strength = rampFrom + (goal - rampFrom) * e;
      if (t >= 1) rampDur = 0;
    }
    var p = pos(), dv = p - last; last = p;
    v += (Math.abs(dv) - v) * .35;                      // smoothed speed, px per frame
    var want = Math.min(MAXB, v * GAIN) * strength;
    blur += (want - blur) * .4;
    var b = blur < .12 ? 0 : Math.round(blur * 10) / 10;
    if (b !== shown){
      shown = b;
      gb.setAttribute('stdDeviation', '0 ' + b);
      target.style.filter = b ? 'url(#bv-mb)' : '';
    }
    if (b || v > .05 || rampDur) raf = requestAnimationFrame(frame);
  }
  function kick(){ if (!raf) raf = requestAnimationFrame(frame); }
  (sc || window).addEventListener('scroll', function(){ if (strength > 0 || goal > 0) kick(); }, {passive: true});

  // ---- notice: slides in at the top right (clay card in the page's own tokens) ----
  var css = document.createElement('style');
  css.textContent = '.mb-notice{position:fixed;top:calc(env(safe-area-inset-top,0px) + 16px);right:16px;z-index:60;display:flex;align-items:center;gap:12px;' +
    'padding:10px 10px 10px 16px;border-radius:999px;background:var(--bg);color:var(--ink);font-family:var(--f-body);font-size:14px;' +
    'box-shadow:8px 8px 18px var(--lo),-8px -8px 18px var(--hi);transform:translateX(calc(100% + 32px));opacity:0;' +
    'transition:transform .6s cubic-bezier(.16,1,.3,1),opacity .35s ease;pointer-events:none}' +
    '.mb-notice.show{transform:none;opacity:1;pointer-events:auto}' +
    '.mb-notice svg{flex:none;width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round}' +
    '.mb-notice .mb-t{font-weight:600;white-space:nowrap}' +
    '.mb-off{border:0;border-radius:999px;padding:8px 14px;background:var(--bg);color:var(--ink);cursor:pointer;font-family:var(--f-mono);font-size:12px;letter-spacing:.03em;' +
    'box-shadow:3px 3px 7px var(--lo),-3px -3px 7px var(--hi),inset 0 0 0 transparent,inset 0 0 0 transparent;transition:box-shadow .25s,scale .15s}' +
    '.mb-off:active{scale:.97;box-shadow:0 0 0 transparent,0 0 0 transparent,inset 3px 3px 7px var(--lo),inset -3px -3px 7px var(--hi)}' +
    '@media (max-width:560px){.mb-notice{left:16px;right:16px;justify-content:space-between}}';
  document.head.appendChild(css);
  var box = null, hideT = 0;
  function notice(){
    if (!box){
      box = document.createElement('div');
      box.className = 'mb-notice'; box.setAttribute('role', 'status');
      box.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h9M3 12h13M3 16h9"/><circle cx="18" cy="12" r="3"/></svg>' +
        '<span class="mb-t">Motion Blur включён!</span><button type="button" class="mb-off">Отключить</button>';
      document.body.appendChild(box);
      box.querySelector('.mb-off').addEventListener('click', function(){ api.disable(); hide(); });
    }
    clearTimeout(hideT);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ box.classList.add('show'); }); });
    hideT = setTimeout(hide, 9000);
  }
  function hide(){ if (box) box.classList.remove('show'); }

  var api = window.BVMotionBlur = {
    on: function(){ return goal > 0; },
    enable: function(ms){
      if (reduce) return;
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      rampFrom = strength; goal = 1; rampT0 = performance.now(); rampDur = ms || 1;
      kick();
    },
    disable: function(){
      try { localStorage.setItem(KEY, '0'); } catch (e) {}
      rampFrom = strength; goal = 0; rampT0 = performance.now(); rampDur = 400;
      kick();
    },
    notice: notice
  };
})();
