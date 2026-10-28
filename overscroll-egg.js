/* Easter egg under the footer: at the very bottom the page can be pulled a little further, with growing
   resistance like an app's rubber band, and a grass block shows up underneath. Let go and the page
   springs back. Works with the mouse wheel / touchpad and with a finger.
   A notched wheel sends big jumps (~100 px a click), so input only moves a TARGET; the page follows it
   through a smooth per-frame ease, never jumping straight to it. */
(function(){
  var sc = document.getElementById('sc'), main = sc && sc.querySelector('main');
  if (!sc || !main) return;
  var egg = document.createElement('img');
  egg.className = 'egg'; egg.alt = ''; egg.setAttribute('aria-hidden', 'true'); egg.decoding = 'async';
  egg.src = 'shots/egg-block.webp';
  document.body.appendChild(egg);

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MAX = 360, K = 650;             // how far it can go, and how quickly it stiffens (bigger K = harder)
  var DEAD = 140;                     // the first bit of pulling past the bottom does nothing: no accidental peeks
  var FOLLOW = 160, BACK = 170;       // ms time constants: following the pull, springing back
  var raw = 0, target = 0, o = 0, timer = 0, raf = 0, lastT = 0, touching = false;

  function maxScroll(){ return sc.scrollHeight - sc.clientHeight; }
  function atBottom(){ return sc.scrollTop >= maxScroll() - 2; }
  function rubber(r){ r = Math.max(0, r - DEAD); return MAX * (1 - Math.exp(-r / K)); }   // the further you pull, the less it gives
  function place(){
    // the block's centre sits 90 px + 1.5 heights below the bottom edge (60 px lower than at first), risen
    // by the pull.
    var r = main.getBoundingClientRect(), h = egg.offsetHeight || 130;
    var pad = parseFloat(getComputedStyle(main).paddingLeft) || 0;
    egg.style.left = (r.left + pad + (r.width - pad) / 2) + 'px';
    egg.style.transform = 'translate(-50%,' + (90 + h * 1.5 - o * 1.08).toFixed(1) + 'px) rotate(' + (-6 + o / MAX * 6).toFixed(2) + 'deg)';
    egg.style.opacity = o > 2 ? Math.min(1, o / 120).toFixed(3) : '0';
  }
  function apply(){
    main.style.transform = o > .5 ? 'translateY(' + (-o).toFixed(1) + 'px)' : '';
    place();
  }
  function tick(now){
    raf = 0;
    var dt = lastT ? Math.min(50, now - lastT) : 16; lastT = now;
    var tau = target < o ? BACK : FOLLOW;
    o += (target - o) * (1 - Math.exp(-dt / tau));
    if (Math.abs(target - o) < .3) o = target;
    apply();
    if (o >= FOUND) return found();
    if (o !== target) raf = requestAnimationFrame(tick); else lastT = 0;
  }

  // ---- found: the block is fully out. The page is thrown back to the top (fast, then a long soft
  // slow-down), Motion Blur fades in from 0 over the same time, and a notice slides in ----
  var FOUND = 285, THROW = 1800, throwing = false;
  function found(){
    if (throwing) return;
    throwing = true; clearTimeout(timer); raw = 0; target = 0;
    cancelAnimationFrame(raf); raf = 0;
    var mb = window.BVMotionBlur;
    if (mb){ mb.enable(THROW * .75); mb.notice(); }
    var from = sc.scrollTop, o0 = o, t0 = performance.now();
    sc.style.scrollBehavior = 'auto';
    (function step(now){
      var t = Math.min(1, (now - t0) / THROW);
      // ease-out with a gentle start: a quick throw that settles slowly at the top
      var e = 1 - Math.pow(1 - t, 3.2);
      sc.scrollTop = from * (1 - e);
      o = o0 * Math.max(0, 1 - t * 4); apply();
      if (t < 1) requestAnimationFrame(step);
      else { sc.scrollTop = 0; o = 0; apply(); sc.style.scrollBehavior = ''; throwing = false; }
    })(t0);
  }
  function kick(){ if (reduce){ o = target; apply(); return; } if (!raf){ lastT = 0; raf = requestAnimationFrame(tick); } }
  function pull(r){ raw = Math.max(0, r); target = rubber(raw); kick(); }
  function release(){ clearTimeout(timer); raw = 0; target = 0; kick(); }

  // wheel / touchpad: past the bottom the deltas stretch the band; a short pause lets it go
  sc.addEventListener('wheel', function(e){
    if (e.ctrlKey) return;
    var d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? sc.clientHeight : 1);
    if (throwing){ e.preventDefault(); return; }
    if (raw > 0 || (d > 0 && atBottom())){
      e.preventDefault();
      pull(raw + (Math.abs(d) > 60 ? d * .6 : d));
      clearTimeout(timer); timer = setTimeout(release, 260);
    }
  }, {passive: false});

  // touch: drag up past the bottom (the finger is followed directly), let go to spring back.
  // A phone screen is short, so the finger band is looser than the wheel's. One finger is tracked by
  // its id: a second finger neither restarts nor drops the pull. When the tracked finger lifts while
  // another is still down, that one takes over from the same spot. The band lets go only when
  // the last finger lifts.
  var T_DEAD = DEAD, T_K = K, T_GAIN = .9;          // same stiffness as before (the user wants it hard)
  function rubberT(r){ r = Math.max(0, r - T_DEAD); return MAX * (1 - Math.exp(-r / T_K)); }
  var ty = null, tid = null;
  function find(list, id){ for (var i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i]; return null; }
  function grab(t){ tid = t.identifier; ty = t.clientY + raw / T_GAIN; }   // re-anchored so the pull carries on
  sc.addEventListener('touchstart', function(e){
    if (throwing) return;
    touching = true;
    if (tid === null && atBottom()) grab(e.changedTouches[0]);
  }, {passive: true});
  sc.addEventListener('touchmove', function(e){
    if (throwing){ e.preventDefault(); return; }
    var t = tid === null ? null : find(e.touches, tid);
    if (!t){ if (atBottom()) grab(e.touches[0]); return; }
    var dy = ty - t.clientY;
    if (dy > 0 && atBottom()){
      e.preventDefault();
      raw = dy * T_GAIN; target = o = rubberT(raw); apply();   // under a finger it should not lag
      if (o >= FOUND){ tid = ty = null; found(); }
    } else if (raw > 0){ raw = 0; release(); }
  }, {passive: false});
  function end(e){
    if (tid !== null && !find(e.touches, tid)){
      if (e.touches.length) grab(e.touches[0]); else tid = ty = null;
    }
    if (e.touches.length) return;                    // other fingers are still down: keep holding
    touching = false; tid = ty = null;
    if (!throwing && (raw > 0 || o > 0)) release();
  }
  sc.addEventListener('touchend', end, {passive: true});
  sc.addEventListener('touchcancel', end, {passive: true});

  addEventListener('resize', place);
  egg.addEventListener('load', place);
  place();
})();
