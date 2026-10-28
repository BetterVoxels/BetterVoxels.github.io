/* Technologies page: the arrows on the link tiles.
   Hover: the tile's arrow speeds off to the right, then a flock of faint arrows glides in and slows
   to a stop: the front one about mid-tile, the rest strung back to the left edge, each a different
   size and height, never overlapping. They pass behind the text.
   Leave: every animation simply plays backwards from wherever it is, so the flock speeds back the way
   it came and the tile's arrow eases back in, however far they had got. Come back mid-way and they
   turn round again.
   Coming and going they carry a horizontal motion blur that follows their speed.
   Click: the flock flies off to the right (~0.5 s), then the link opens.
   Mouse only for the hover part; a tap just sends the tile's arrow off before opening.
   Off under prefers-reduced-motion. */
(function(){
  if (!document.querySelector('.tech-link') || !Element.prototype.animate) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var hoverable = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var IN = 'cubic-bezier(.7,0,.84,0)', OUT = 'cubic-bezier(.16,1,.3,1)';
  var NS = 'http://www.w3.org/2000/svg';
  // the filled arrow from the reference, turned to point right
  var SHAPE = 'M2 10.2h11.6L9.2 5.8a1 1 0 0 1 0-1.4l1.3-1.3a1 1 0 0 1 1.4 0l8.2 8.2a1 1 0 0 1 0 1.4l-8.2 8.2a1 1 0 0 1-1.4 0l-1.3-1.3a1 1 0 0 1 0-1.4l4.4-4.4H2a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1z';
  var LEAD_OP = .2, TRAIL_OP = [.05, .13];          // opacity of the front arrow, range for the rest

  function arrowEl(size){
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 22 24'); s.setAttribute('class', 'ta');
    s.style.width = size + 'px'; s.style.height = size + 'px';
    var p = document.createElementNS(NS, 'path'); p.setAttribute('d', SHAPE);
    s.appendChild(p);
    return s;
  }

  // motion blur: a few horizontal-only blur filters; every frame each moving arrow gets the one that
  // matches its speed, so it smears while fast and sharpens as it slows to a stop
  var LEVELS = [1.2, 2.5, 4, 6, 9, 13];
  var defs = document.createElementNS(NS, 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0'); defs.setAttribute('aria-hidden', 'true');
  defs.style.position = 'absolute';
  LEVELS.forEach(function(d, i){
    var f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', 'ta-mb' + i);
    f.setAttribute('x', '-80%'); f.setAttribute('width', '260%'); f.setAttribute('y', '-10%'); f.setAttribute('height', '120%');
    var g = document.createElementNS(NS, 'feGaussianBlur'); g.setAttribute('stdDeviation', d + ' 0');
    f.appendChild(g); defs.appendChild(f);
  });
  document.body.appendChild(defs);
  function blurFor(v){                       // v: speed in px per ms
    var want = v * 4.5;
    if (want < .8) return '';
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i] >= want) return 'url(#ta-mb' + i + ')';
    return 'url(#ta-mb' + (LEVELS.length - 1) + ')';
  }
  function posX(el){
    var t = getComputedStyle(el).transform;
    return t && t !== 'none' ? new DOMMatrix(t).m41 : 0;
  }

  Array.prototype.forEach.call(document.querySelectorAll('.tech-link'), function(a){
    var own = a.querySelector(':scope > svg'), text = a.querySelector(':scope > span');
    var fx = document.createElement('span'); fx.className = 'ta-fx'; fx.setAttribute('aria-hidden', 'true');
    a.insertBefore(fx, a.firstChild);
    var flock = [], ownAnim = null, state = 'idle', leaving = false, gen = 0;

    function clear(){ flock.forEach(function(f){ f.anim.cancel(); f.el.remove(); }); flock = []; }

    // the blur follows each arrow's speed, measured frame to frame while anything here is animating
    var raf = 0, lastT = 0, lastX = new Map();
    function trackBlur(){ if (!raf){ lastT = 0; raf = requestAnimationFrame(blurTick); } }
    function blurTick(t){
      raf = 0;
      var dt = lastT ? Math.max(1, t - lastT) : 16; lastT = t;
      var moving = false;
      flock.map(function(f){ return f.el; }).concat([own]).forEach(function(el){
        if (!el.isConnected) return;
        var x = posX(el), px = lastX.get(el); lastX.set(el, x);
        var v = px === undefined ? 0 : Math.abs(x - px) / dt;
        var b = blurFor(v);
        if (el._mb !== b){ el._mb = b; el.style.filter = b; }
        if (v > .01) moving = true;
      });
      var running = a.getAnimations({subtree: true}).some(function(an){ return an.playState === 'running'; });
      if (running || moving) raf = requestAnimationFrame(blurTick);
      else lastX = new Map();
    }

    function build(){
      clear();
      var W = a.clientWidth, H = a.clientHeight;
      // the flock runs across the whole tile, behind the text (the text sits above it)
      var x = W * (.46 + Math.random() * .08), i = 0;
      while (x > -H * .2 && i < 14){
        var size = Math.round(H * (i === 0 ? .62 : .26 + Math.random() * .4));
        var left = x - size;
        var top = Math.max(2, Math.min(H - size - 2, (H - size) / 2 + (Math.random() - .5) * H * .55 * (i ? 1 : .3)));
        var el = arrowEl(size);
        el.style.left = left + 'px'; el.style.top = top + 'px';
        var op = i === 0 ? LEAD_OP : TRAIL_OP[0] + Math.random() * (TRAIL_OP[1] - TRAIL_OP[0]);
        fx.appendChild(el);
        var from = -(left + size + 20);                                 // starts just off the left edge
        var anim = el.animate([{transform: 'translateX(' + from + 'px)', opacity: 0},
                               {transform: 'translateX(0)', opacity: op}],
                              {duration: 700 + i * 40, delay: 140 + i * 30, easing: OUT, fill: 'both'});
        flock.push({el: el, op: op, anim: anim});
        x = left - (6 + Math.random() * 18);                            // a gap before the next one
        i++;
      }
    }

    // the direction is kept on the animation itself: playbackRate only updates on the next frame, so a
    // quick in-out-in within one frame would read a stale value
    function forward(anim){ if (anim && anim._dir === -1){ anim.reverse(); anim._dir = 1; } }
    function backward(anim){ if (anim && anim._dir !== -1){ anim.reverse(); anim._dir = -1; } }

    function enter(){
      if (leaving) return;
      state = 'in'; gen++;
      if (flock.length){
        // still on the way back: turn everything round from where it is
        flock.forEach(function(f){ forward(f.anim); });
        forward(ownAnim);
        trackBlur();
        return;
      }
      if (ownAnim) ownAnim.cancel();
      ownAnim = own.animate([{transform: 'translateX(0)', opacity: 1}, {transform: 'translateX(46px)', opacity: 0}],
                            {duration: 260, easing: IN, fill: 'forwards'});
      build();
      trackBlur();
    }

    function leave(){
      if (leaving || state !== 'in') return;
      state = 'out';
      var my = ++gen;
      // play everything backwards from its current point: the arrows speed back out (the reverse of
      // their slow-down), the tile's arrow eases back in (the reverse of its speed-up)
      flock.forEach(function(f){ backward(f.anim); });
      backward(ownAnim);
      trackBlur();
      Promise.all(flock.map(function(f){ return f.anim.finished; }).concat(ownAnim ? [ownAnim.finished] : []))
        .then(function(){ if (my === gen && state === 'out'){ clear(); if (ownAnim){ ownAnim.cancel(); ownAnim = null; } state = 'idle'; } }, function(){});
    }

    function go(e){
      // keep the browser's own behaviour for new-tab / new-window clicks
      if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (leaving) return;
      leaving = true; gen++;
      var W = a.clientWidth, url = a.href;
      if (flock.length){
        flock.forEach(function(f, k){
          // freeze where it is now (it may still be gliding in), then send it past the right edge
          var now = getComputedStyle(f.el), tf = now.transform === 'none' ? 'translateX(0)' : now.transform, op = +now.opacity;
          f.anim.cancel();
          f.anim = f.el.animate([{transform: tf, opacity: op},
                                 {transform: 'translateX(' + (W - parseFloat(f.el.style.left) + 10) + 'px)', opacity: op * .6}],
                                {duration: 420 + k * 10, delay: k * 6, easing: IN, fill: 'forwards'});
        });
      } else {
        if (ownAnim) ownAnim.cancel();
        ownAnim = own.animate([{transform: 'translateX(0)', opacity: 1}, {transform: 'translateX(' + W * .3 + 'px)', opacity: 0}],
                              {duration: 420, easing: IN, fill: 'forwards'});
      }
      trackBlur();
      setTimeout(function(){
        if (a.target === '_blank') window.open(url, '_blank', 'noopener');
        else location.href = url;
        // back to rest for when the visitor returns to this tab
        setTimeout(function(){ clear(); if (ownAnim){ ownAnim.cancel(); ownAnim = null; } own.style.filter = ''; own._mb = ''; leaving = false; state = 'idle'; }, 60);
      }, 500);
    }

    if (hoverable){
      a.addEventListener('mouseenter', enter);
      a.addEventListener('mouseleave', leave);
    }
    a.addEventListener('click', go);
  });
})();
