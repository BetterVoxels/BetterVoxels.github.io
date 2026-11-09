(function(){
  'use strict';
  function play(button){
    var animations=[],duration=2300;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||!button.animate)return {animations:animations,duration:duration};
    function stage(el,frames,time,delay,ease,fill){
      animations.push(el.animate(frames,{duration:time,delay:delay,easing:ease,fill:fill||'forwards'}));
    }
    var ready=button.querySelector('.dl-ready'),success=button.querySelector('.dl-success');
    var haloFill=button.parentElement.querySelector('.dl-halo-fill');
    var haloPaint=button.parentElement.querySelector('.dl-halo-paint');
    var base=button.querySelector('.dl-base'),restHalo=button.parentElement.querySelector('.dl-rest-halo');
    var smooth='cubic-bezier(.22,1,.36,1)';
    stage(ready,[{transform:'translateX(0)',opacity:1},{transform:'translateX(70%)',opacity:0}],240,0,'ease-in');
    var fillFrames=[{transform:'translateX(-100%) skewX(-18deg)'},{transform:'translateX(0) skewX(-18deg)'}];
    stage(button.querySelector('.dl-fill'),fillFrames,680,80,smooth,'both');
    if(haloFill)stage(haloFill,fillFrames,680,80,smooth,'both');
    stage(success,[{transform:'translateX(-65%)',opacity:0},{transform:'translateX(0)',opacity:1}],480,280,smooth,'both');
    if(restHalo)stage(restHalo,[{opacity:1},{opacity:0}],180,80,smooth,'both');
    if(base)stage(base,[{opacity:1},{opacity:0}],680,80,'steps(1,end)','both');
    var exitFrames=[{transform:'translateY(0)'},{transform:'translateY(110%)'}];
    stage(button.querySelector('.dl-paint'),exitFrames,520,1500,'cubic-bezier(.4,0,.4,1)');
    if(haloPaint)stage(haloPaint,exitFrames,520,1500,'cubic-bezier(.4,0,.4,1)');
    stage(success,[{transform:'translateY(0)',opacity:1},{transform:'translateY('+(button.clientHeight+18)+'px)',opacity:1}],520,1500,'cubic-bezier(.4,0,.4,1)');
    if(base)stage(base,[{opacity:1},{opacity:1}],520,1500,'linear');
    if(restHalo)stage(restHalo,[{opacity:0},{opacity:1}],520,1500,'cubic-bezier(.4,0,.4,1)');
    stage(ready,[{transform:'translateY(-7px)',opacity:0},{transform:'translateY(0)',opacity:1}],360,1730,smooth);
    return {animations:animations,duration:duration};
  }
  window.BVDownloadMotion={play:play};
})();
