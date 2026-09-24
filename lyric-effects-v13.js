/* v13 — slow ambient lyric motion, continuous chill scroll, mathematical atmosphere. */
(() => {
'use strict';
if (window.__captionV13) return;
window.__captionV13 = true;

const audio = document.getElementById('bg-audio');
const play = document.getElementById('play-music-btn');
const status = document.getElementById('music-status');
const widget = document.getElementById('floating-music-widget');
const layout = document.querySelector('.layout');
if (!audio || !play || !widget || !layout) return;

const style = document.createElement('style');
style.textContent = `
html.caption-scroll{scroll-behavior:auto!important}body{overflow-x:clip}
.layout{transform-origin:50% 40%;backface-visibility:hidden;will-change:transform;transition:transform 1.7s cubic-bezier(.16,.72,.22,1)}
body.caption-playing .layout{animation:caption-camera-breathe 13s ease-in-out infinite alternate}
@keyframes caption-camera-breathe{0%{transform:translate3d(0,0,0) rotateZ(-.08deg) scale(.998)}100%{transform:translate3d(0,-2px,0) rotateZ(.08deg) scale(1)}}

#floating-music-widget{position:fixed;left:50%;bottom:calc(12px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;display:flex;gap:7px;align-items:center;flex-wrap:wrap;width:max-content;max-width:calc(100vw - 24px);padding:9px 11px;border:1px solid #6ccbb642;border-radius:19px;background:#091522e8;box-shadow:0 14px 42px #0007;backdrop-filter:blur(20px) saturate(.9);-webkit-backdrop-filter:blur(20px) saturate(.9)}
#floating-music-widget button{border:1px solid #40556a;border-radius:10px;background:#172938;padding:7px 10px;font:600 12px system-ui;white-space:nowrap}
#floating-music-widget #play-music-btn{background:#a8f7df;color:#10252d;border-color:#a8f7df}#music-status{font:11px system-ui;color:#bfd4dd;max-width:160px}#caption-seek{width:100%;height:4px;margin:2px 0;accent-color:#9ef5d9}

#caption-dimmer{position:fixed;inset:0;z-index:30;pointer-events:none;background:linear-gradient(180deg,#02050bd8,#07111ad1 52%,#02050be3);opacity:0;transition:opacity 1.45s cubic-bezier(.2,.7,.2,1);backdrop-filter:saturate(.75) brightness(.82);-webkit-backdrop-filter:saturate(.75) brightness(.82)}
body.caption-playing #caption-dimmer{opacity:.48}body.caption-paused #caption-dimmer{opacity:.34}

#caption-stage{position:fixed;inset:0;z-index:35;pointer-events:none;overflow:hidden;opacity:0;transition:opacity 1.2s ease;contain:layout paint style}
#caption-stage.visible{opacity:1}
#caption-stage:before{content:'';position:absolute;inset:-15%;background:radial-gradient(ellipse at 70% 45%,#4ae6c00d,transparent 34%),radial-gradient(ellipse at 20% 70%,#7895ff0c,transparent 30%);animation:ambient-wash 18s ease-in-out infinite alternate;will-change:transform}
@keyframes ambient-wash{to{transform:translate3d(2.5%,-1.5%,0) scale(1.035)}}

.caption-aurora{position:absolute;border-radius:50%;filter:blur(30px);opacity:.18;will-change:transform;mix-blend-mode:screen}
.caption-aurora.a{width:48vw;height:48vw;left:-12vw;top:18%;background:radial-gradient(circle,#56e8c84a,transparent 66%);animation:aurora-a 17s ease-in-out infinite alternate}
.caption-aurora.b{width:42vw;height:42vw;right:-8vw;top:34%;background:radial-gradient(circle,#8e9dff3b,transparent 68%);animation:aurora-b 21s ease-in-out infinite alternate}
@keyframes aurora-a{to{transform:translate3d(12vw,-5vh,0) scale(1.09)}}
@keyframes aurora-b{to{transform:translate3d(-10vw,7vh,0) scale(.94)}}

.caption-glow{position:absolute;width:54vw;height:54vw;max-width:680px;max-height:680px;left:var(--glow-x,70%);top:48%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#72f2d51a 0,#6be8ce0b 36%,transparent 68%);filter:blur(8px);transition:left 2.2s cubic-bezier(.16,.72,.22,1);animation:glow-breathe 7s ease-in-out infinite alternate;will-change:transform,left}
@keyframes glow-breathe{to{transform:translate(-50%,-50%) scale(1.08);opacity:.75}}

.caption-math{position:absolute;left:var(--x);top:var(--y);font:500 var(--s) / 1.2 "Cambria Math",Georgia,serif;color:#cffff2;opacity:0;text-shadow:0 0 16px #73efd055;white-space:nowrap;will-change:transform,opacity;animation:math-float var(--d) ease-in-out var(--delay) infinite alternate}
@keyframes math-float{0%{opacity:.035;transform:translate3d(-8px,18px,0) rotate(var(--r)) scale(.96)}45%{opacity:.11}100%{opacity:.045;transform:translate3d(15px,-34px,0) rotate(calc(var(--r) * -1)) scale(1.025)}}

.caption-orbit{position:absolute;width:56vw;height:56vw;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid #9cf6df0b;border-radius:50%;animation:orbit-turn 40s linear infinite;will-change:transform}
.caption-orbit:before,.caption-orbit:after{content:'';position:absolute;inset:12%;border:1px solid #9fb7ff0a;border-radius:50%}.caption-orbit:after{inset:28%;border-color:#93f7dc0b}
@keyframes orbit-turn{to{transform:translate(-50%,-50%) rotate(360deg)}}

.caption-curve{position:absolute;inset:0;width:100%;height:100%;opacity:.16;overflow:visible}
.caption-curve path{fill:none;stroke:#9ef5dc;stroke-width:.7;stroke-linecap:round;stroke-dasharray:8 20;vector-effect:non-scaling-stroke;animation:curve-flow 15s linear infinite}
.caption-curve path:nth-child(2){stroke:#abb7ff;opacity:.45;animation-duration:21s;animation-direction:reverse}
@keyframes curve-flow{to{stroke-dashoffset:-180}}

.caption-dot{position:absolute;width:2.5px;height:2.5px;border-radius:50%;background:#d8fff5;opacity:.12;box-shadow:0 0 10px #79efd0;animation:caption-drift var(--dd,14s) ease-in-out infinite alternate;will-change:transform,opacity}
@keyframes caption-drift{0%{transform:translate3d(0,8px,0);opacity:.08}100%{transform:translate3d(var(--dx,12px),-36px,0);opacity:.34}}

.caption-card{position:absolute;top:47%;width:clamp(200px,22vw,292px);min-height:102px;max-height:32vh;will-change:transform,opacity;transform:translate3d(0,-50%,0);contain:layout paint}
.caption-card.right{right:7vw}.caption-card.left{left:7vw}
.caption-surface{position:relative;min-height:102px;padding:15px 18px;border:1px solid #ffffff47;border-radius:16px;background:linear-gradient(135deg,#f7fff4a0,#dcfff37a);color:#112932;box-shadow:0 16px 46px #0005,0 0 38px #7cffd016;backdrop-filter:blur(15px) saturate(.92);-webkit-backdrop-filter:blur(15px) saturate(.92);overflow:hidden;isolation:isolate;animation:card-float 7.5s ease-in-out infinite alternate;will-change:transform}
.caption-card.right .caption-surface{--float-r:.26deg}.caption-card.left .caption-surface{--float-r:-.26deg}
@keyframes card-float{0%{transform:translate3d(0,3px,0) rotate(var(--float-r))}100%{transform:translate3d(0,-5px,0) rotate(calc(var(--float-r) * -.7))}}
.caption-surface:before{content:'';position:absolute;width:70%;height:220%;top:-60%;left:-100%;transform:rotate(23deg);background:linear-gradient(90deg,transparent,#ffffff68,transparent);animation:caption-shine 3.8s ease-in-out .5s infinite;z-index:-1}
@keyframes caption-shine{0%,58%{left:-105%;opacity:0}70%{opacity:.55}100%{left:160%;opacity:0}}
.caption-kicker{display:flex;justify-content:space-between;gap:10px;font:700 9px system-ui;letter-spacing:.15em;color:#537b72;margin-bottom:10px;opacity:.8}.caption-text{font:630 clamp(16px,1.45vw,21px)/1.44 system-ui;letter-spacing:-.025em;overflow-wrap:anywhere;white-space:pre-wrap}
.caption-char{display:inline;opacity:0;transition:opacity .22s ease,filter .28s ease,text-shadow .28s ease,color .28s ease}.caption-char.shown{opacity:.76}.caption-char.near2{opacity:.90;text-shadow:0 0 5px #b6ffed70}.caption-char.near1{opacity:1;color:#073a32;text-shadow:0 0 7px #91ffe4bc,0 0 14px #78f7d864}.caption-char.hot{opacity:1;color:#003e34;text-shadow:0 0 5px #fff,0 0 11px #ccfff3,0 0 21px #70efd1b5,0 0 34px #70efd16b;filter:brightness(1.08)}
.caption-caret{display:inline-block;width:1.5px;height:.92em;vertical-align:-.08em;margin-left:3px;background:#168577;opacity:.75;animation:caption-blink 1s ease-in-out infinite}.caption-line{position:absolute;bottom:0;left:0;height:2px;width:100%;background:linear-gradient(90deg,#59cbb0,#a2f3df);transform:scaleX(var(--line-progress,0));transform-origin:left;opacity:.7}
@keyframes caption-blink{50%{opacity:.18}}
.caption-card.past .caption-surface{background:#0a111ab8;color:#e9fff8;border-color:#ffffff17;box-shadow:0 12px 34px #0007}.caption-card.past .caption-kicker{color:#a9c9c1}.caption-card.past .caption-caret{display:none}

body.caption-paused #caption-stage *{animation-play-state:paused!important}
@media(max-width:600px){.caption-card{width:min(62vw,258px);top:45.5%}.caption-card.right{right:7vw}.caption-card.left{left:7vw}.caption-surface{min-height:96px;padding:14px 16px;border-radius:15px;background:linear-gradient(135deg,#f7fff48f,#dcfff36b)}.caption-text{font-size:16.5px;line-height:1.45}.caption-kicker{font-size:8.5px;margin-bottom:9px}.caption-math{font-size:calc(var(--s) * .82)}#floating-music-widget{justify-content:center;width:calc(100vw - 24px);gap:6px}#music-status{width:100%;max-width:none;text-align:center;font-size:11px}.return-top{bottom:140px!important}}
@media(max-width:380px){.caption-card{width:min(66vw,235px)}.caption-text{font-size:16px}}
@media(prefers-reduced-motion:reduce){body.caption-playing .layout{animation:none;transform:none}.caption-aurora,.caption-glow,.caption-math,.caption-orbit,.caption-curve path,.caption-dot,.caption-surface,.caption-surface:before,.caption-caret{animation:none!important}.caption-card{transform:translateY(-50%)}}
.motion-off body.caption-playing .layout{animation:none;transform:none}.motion-off .caption-aurora,.motion-off .caption-glow,.motion-off .caption-math,.motion-off .caption-orbit,.motion-off .caption-curve path,.motion-off .caption-dot,.motion-off .caption-surface,.motion-off .caption-surface:before{animation:none!important}
@media print{#caption-stage,#caption-dimmer,#floating-music-widget{display:none!important}}
`;
document.head.append(style);

const dimmer = document.createElement('div');
dimmer.id = 'caption-dimmer';
dimmer.setAttribute('aria-hidden','true');
document.body.append(dimmer);

const stage = document.createElement('div');
stage.id = 'caption-stage';
stage.setAttribute('aria-hidden','true');
stage.innerHTML = `
  <div class="caption-aurora a"></div><div class="caption-aurora b"></div>
  <div class="caption-orbit"></div><div class="caption-glow"></div>
  <svg class="caption-curve" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
    <path d="M-80 545 C 160 390, 260 620, 510 470 S 820 310, 1080 430"/>
    <path d="M-90 230 C 130 360, 320 130, 540 280 S 860 520, 1090 350"/>
  </svg>`;
document.body.append(stage);

const mathItems = [
  ['∂f/∂x',8,16,17], ['∂f/∂y',79,14,16], ['∇f',15,63,21], ['dz = fₓdx + fᵧdy',67,72,15],
  ['H = [ fₓₓ  fₓᵧ ; fᵧₓ  fᵧᵧ ]',4,82,13], ['Δ = AC − B²',74,44,15], ['f(x,y)',41,13,17],
  ['lim  f(x,y)',37,83,14], ['∂²f/∂x²',88,82,15], ['∇f = λ∇g',6,42,16], ['dx = Δx',57,27,14], ['dy = Δy',29,55,14]
];
mathItems.forEach((item,i)=>{
  const el=document.createElement('span'); el.className='caption-math'; el.textContent=item[0];
  el.style.cssText=`--x:${item[1]}%;--y:${item[2]}%;--s:${item[3]}px;--d:${16+(i%5)*2.2}s;--delay:-${(i*1.7)%12}s;--r:${i%2?'-2deg':'2deg'}`;
  stage.append(el);
});
for(let i=0;i<14;i++){
  const d=document.createElement('i');d.className='caption-dot';
  d.style.cssText=`left:${(i*43+9)%96}%;top:${(i*29+7)%92}%;--dd:${11+(i%5)*2.1}s;--dx:${i%2?'-14px':'14px'};animation-delay:-${i*.83}s`;
  stage.append(d);
}

function makeButton(text,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);widget.append(b);return b;}
const replay = makeButton('↺ Phát lại',()=>{audio.currentTime=0;index=-2;auto=true;captureScroll();syncAuto();start();});
const follow = makeButton('Trôi: bật',()=>{auto=!auto;syncAuto();if(auto)captureScroll();});
const seek=document.createElement('input');seek.id='caption-seek';seek.type='range';seek.min=0;seek.max=24.74;seek.step=.01;seek.value=0;seek.setAttribute('aria-label','Vị trí phát nhạc');widget.append(seek);

let cues = Array.isArray(window.lyricsData) ? window.lyricsData : [];
let index=-2,current=null,raf=0,auto=true,lastStatus=0,visibleCount=-1;
let scrollStart=scrollY,scrollRange=0,scrollVisual=scrollY,lastNow=performance.now();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const moving=()=>!reduced.matches&&!document.documentElement.classList.contains('motion-off');

function syncAuto(){follow.textContent=`Trôi: ${auto?'bật':'tắt'}`;follow.setAttribute('aria-pressed',String(auto));}
function captureScroll(){scrollStart=scrollY;scrollVisual=scrollY;const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);scrollRange=Math.min(Math.max(0,max-scrollStart),Math.max(innerHeight*1.65,720));}
function stopAuto(){if(!audio.paused){auto=false;syncAuto();}}
addEventListener('wheel',stopAuto,{passive:true});
addEventListener('touchstart',e=>{if(!widget.contains(e.target))stopAuto();},{passive:true});
addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key)&&!['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName||''))stopAuto();});

function easeFloat(p){return p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;}
function updateScroll(t,now){
  if(!auto||!moving()||scrollRange<1)return;
  const start=cues[0]?.time??0,end=(Number.isFinite(audio.duration)?audio.duration:(cues.at(-1)?.time??start)+2.4);
  const p=Math.max(0,Math.min(1,(t-start)/Math.max(.1,end-start)));
  const target=scrollStart+scrollRange*easeFloat(p);
  const dt=Math.min(.05,Math.max(.001,(now-lastNow)/1000));
  const a=1-Math.exp(-dt*2.35);
  scrollVisual += (target-scrollVisual)*a;
  if(Math.abs(scrollY-scrollVisual)>.45) document.scrollingElement.scrollTop=scrollVisual;
}

const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('vi',{granularity:'grapheme'}):null;
function letters(t){return segmenter?[...segmenter.segment(t)].map(s=>s.segment):Array.from(t);}
let glyphs=cues.map(c=>letters(c.text));

function clearGlow(chars,n){
  for(const k of [n-1,n-2,n-3,n-4]) if(k>=0&&chars[k]) chars[k].classList.remove('hot','near1','near2');
}
function paintTyped(i,n){
  const typed=current?.querySelector('.typed');if(!typed)return;
  const chars=typed.children;
  if(n===visibleCount)return;
  const prev=visibleCount;
  clearGlow(chars,prev);
  if(n>prev){for(let k=Math.max(0,prev);k<Math.min(n,chars.length);k++)chars[k].classList.add('shown');}
  else{for(let k=Math.max(0,n);k<Math.min(prev,chars.length);k++)chars[k].classList.remove('shown');}
  if(n>0){chars[n-1]?.classList.add('hot');chars[n-2]?.classList.add('near1');chars[n-3]?.classList.add('near2');}
  visibleCount=n;
}

function change(i,animate=true){
  index=i;visibleCount=-1;
  stage.querySelectorAll('.caption-card.past').forEach(n=>n.remove());
  if(current){
    const old=current;old.classList.add('past');
    if(animate&&moving()){
      const a=old.animate([
        {opacity:1,transform:'translate3d(0,-50%,0) scale(1)'},
        {opacity:.72,offset:.45,transform:'translate3d(0,calc(-50% - 12px),0) scale(.99)'},
        {opacity:0,transform:'translate3d(0,calc(-50% - 42px),0) scale(.975)'}
      ],{duration:1280,easing:'cubic-bezier(.16,.72,.22,1)',fill:'forwards'});
      a.onfinish=()=>old.remove();
    }else old.remove();
    current=null;
  }
  if(i<0)return;
  const right=i%2===0;stage.style.setProperty('--glow-x',right?'75%':'25%');
  const card=document.createElement('div');card.className=`caption-card ${right?'right':'left'}`;
  card.innerHTML=`<div class="caption-surface"><div class="caption-kicker"><span>${String(i+1).padStart(2,'0')} / ${String(cues.length).padStart(2,'0')}</span><span>∿</span></div><div class="caption-text"><span class="typed"></span><i class="caption-caret"></i></div><div class="caption-line"></div></div>`;
  stage.append(card);current=card;
  const typed=card.querySelector('.typed');const frag=document.createDocumentFragment();
  for(const ch of glyphs[i]){const sp=document.createElement('span');sp.className='caption-char';sp.textContent=ch;frag.append(sp);}typed.append(frag);
  if(cues[i].text.length>100)card.querySelector('.caption-text').style.fontSize=cues[i].text.length>170?'13.5px':'15px';
  if(animate&&moving())card.animate([
    {opacity:0,transform:`translate3d(${right?22:-22}px,calc(-50% + 14px),0) scale(.985)`,filter:'blur(2.2px)'},
    {opacity:.82,offset:.55,filter:'blur(.4px)'},
    {opacity:1,transform:'translate3d(0,-50%,0) scale(1)',filter:'blur(0)'}
  ],{duration:1350,easing:'cubic-bezier(.16,.72,.22,1)'});
}

function render(t){
  let i=-1;for(let j=0;j<cues.length;j++){if(t>=cues[j].time)i=j;else break;}
  if(i!==index)change(i,!audio.seeking);
  if(current&&i>=0){
    const end=cues[i+1]?.time||(Number.isFinite(audio.duration)?audio.duration:cues[i].time+2.4);
    const span=Math.max(.2,end-cues[i].time),p=Math.min(1,Math.max(0,(t-cues[i].time)/span));
    const n=Math.min(glyphs[i].length,Math.floor(Math.max(0,t-cues[i].time-.10)/Math.max(.1,span*.80)*glyphs[i].length));
    paintTyped(i,n);current.style.setProperty('--line-progress',p);
    current.querySelector('.caption-caret').style.visibility=n>=glyphs[i].length?'hidden':'visible';
  }
  seek.value=t;
}

function tick(now){
  raf=0;if(audio.paused||audio.ended)return;
  render(audio.currentTime);updateScroll(audio.currentTime,now);lastNow=now;
  if(now-lastStatus>500){status.textContent=`${audio.currentTime.toFixed(1)}s · ${Number.isFinite(audio.duration)?audio.duration.toFixed(1):'…'}s`;lastStatus=now;}
  raf=requestAnimationFrame(tick);
}
async function start(){try{await audio.play();}catch{status.textContent='Không mở được nguồn nhạc';}}
play.addEventListener('click',()=>audio.paused?start():audio.pause());

audio.addEventListener('play',()=>{
  document.body.classList.add('caption-playing');document.body.classList.remove('caption-paused');
  document.documentElement.classList.add('caption-scroll');stage.classList.add('visible');
  play.textContent='Ⅱ Tạm dừng';play.setAttribute('aria-pressed','true');
  stage.getAnimations({subtree:true}).forEach(a=>a.play());captureScroll();lastNow=performance.now();
  if(!raf)raf=requestAnimationFrame(tick);
});
audio.addEventListener('pause',()=>{
  cancelAnimationFrame(raf);raf=0;document.body.classList.add('caption-paused');
  play.textContent='▶ Tiếp tục';play.setAttribute('aria-pressed','false');status.textContent='Đã tạm dừng';
  stage.getAnimations({subtree:true}).forEach(a=>a.pause());
});
audio.addEventListener('ended',()=>{
  render(audio.duration);stage.classList.remove('visible');document.body.classList.remove('caption-playing','caption-paused');
  document.documentElement.classList.remove('caption-scroll');play.textContent='↺ Phát lại';status.textContent='Đã phát xong';
});
audio.addEventListener('loadedmetadata',()=>{seek.max=audio.duration;if(audio.duration<cues.at(-1)?.time)status.textContent='Một số mốc vượt độ dài nhạc';});
audio.addEventListener('error',()=>status.textContent='Không mở được nguồn nhạc');
seek.addEventListener('input',()=>{audio.currentTime=Number(seek.value);render(audio.currentTime);captureScroll();});
audio.addEventListener('seeked',()=>render(audio.currentTime));
addEventListener('resize',()=>{if(auto)captureScroll();});
syncAuto();captureScroll();
})();
