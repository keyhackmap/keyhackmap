/* v12 — fixed caption stage, alternating sides, media-clock typing, swipe scroll.
   No dependencies. Captions are read from window.lyricsData in index.html. */
(() => {
'use strict';
if(window.__captionV9) return; window.__captionV9=true;
const audio=document.getElementById('bg-audio'), play=document.getElementById('play-music-btn'), status=document.getElementById('music-status'), widget=document.getElementById('floating-music-widget'), layout=document.querySelector('.layout');
if(!audio||!play||!widget||!layout) return;
const style=document.createElement('style'); style.textContent=`
html.caption-scroll{scroll-behavior:auto!important}body{overflow-x:clip}
.layout{transform-origin:50% 50%;transition:transform .9s cubic-bezier(.2,.75,.25,1);backface-visibility:hidden}
body.caption-playing .layout{transform:translateZ(0) rotateZ(var(--camera-angle,-.22deg)) scale(.995)}
#floating-music-widget{position:fixed;left:50%;bottom:calc(12px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:80;display:flex;gap:7px;align-items:center;flex-wrap:wrap;width:max-content;max-width:calc(100vw - 24px);padding:10px 12px;border:1px solid #6ccbb64d;border-radius:20px;background:#0b1828ed;box-shadow:0 16px 50px #0008;backdrop-filter:blur(22px)}
#floating-music-widget button{border:1px solid #40556a;border-radius:10px;background:#192c3c;padding:7px 10px;font:600 12px system-ui;white-space:nowrap}
#floating-music-widget #play-music-btn{background:#9ef5d9;color:#10252d;border-color:#9ef5d9}#music-status{font:11px system-ui;color:#bcd4df;max-width:160px}#caption-seek{width:100%;height:4px;margin:3px 0;accent-color:#9ef5d9}
#caption-stage{position:fixed;inset:0;z-index:35;pointer-events:none;overflow:hidden;opacity:0;transition:opacity .6s}
#caption-dimmer{position:fixed;inset:0;z-index:30;pointer-events:none;background:#02050bd9;opacity:0;transition:opacity .75s cubic-bezier(.2,.8,.2,1);backdrop-filter:saturate(.72) brightness(.82)}
body.caption-playing #caption-dimmer{opacity:.54}
body.caption-paused #caption-dimmer{opacity:.36}#caption-stage.visible{opacity:1}
#caption-stage:before{content:'';position:absolute;inset:0;background:linear-gradient(0deg,#040b1966,transparent 28%,transparent 76%,#080d1922)}
.caption-glow{position:absolute;width:65vw;height:65vw;max-width:800px;max-height:800px;left:var(--glow-x,60%);top:48%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#60e5ce18,transparent 64%);transition:left .9s cubic-bezier(.2,.75,.25,1)}
.caption-card{position:absolute;top:48%;width:clamp(210px,25vw,340px);min-height:126px;max-height:36vh;padding:18px 21px;border:1px solid #ffffff70;border-radius:17px;background:linear-gradient(135deg,#fffef7c7,#e8fff5b8);color:#112532;box-shadow:0 18px 52px #0006,0 0 42px #7cffd01c;backdrop-filter:blur(12px) saturate(.92);-webkit-backdrop-filter:blur(12px) saturate(.92);transform:translateY(-50%) rotate(var(--card-angle));overflow:hidden;will-change:transform,opacity;isolation:isolate;contain:layout paint}
.caption-card.right{right:6vw;--card-angle:.8deg}.caption-card.left{left:6vw;--card-angle:-.8deg}
.caption-card:before{content:'';position:absolute;width:100%;height:200%;top:-50%;left:-120%;transform:rotate(25deg);background:linear-gradient(90deg,transparent,#fff9,transparent);animation:caption-shine 1.05s ease .12s forwards;z-index:-1}
.caption-kicker{display:flex;justify-content:space-between;gap:10px;font:700 10px system-ui;letter-spacing:.16em;color:#50776e;margin-bottom:13px}.caption-text{font:640 clamp(17px,1.65vw,24px)/1.42 system-ui;letter-spacing:-.03em;overflow-wrap:anywhere;white-space:pre-wrap}
.caption-char{display:inline;opacity:0;transition:opacity .10s linear,filter .12s linear,text-shadow .12s linear,color .12s linear}.caption-char.shown{opacity:.80}
.caption-char.near2{opacity:.9;text-shadow:0 0 4px #aaffea55}
.caption-char.near1{opacity:1;color:#07352f;text-shadow:0 0 6px #78f7d8c0,0 0 12px #78f7d866}
.caption-char.hot{opacity:1;color:#003a31;text-shadow:0 0 4px #fff,0 0 9px #baffed,0 0 18px #63f2cfaa,0 0 28px #63f2cf70;filter:brightness(1.12)}.caption-caret{display:inline-block;width:2px;height:1em;vertical-align:-.1em;margin-left:3px;background:#168577;animation:caption-blink .7s steps(1) infinite}.caption-line{position:absolute;bottom:0;left:0;height:3px;width:100%;background:#44bea3;transform:scaleX(var(--line-progress,0));transform-origin:left}
.caption-card.past{background:#090e17;color:white;border-color:#ffffff20;box-shadow:0 18px 48px #0007;transition:background .22s,color .22s}.caption-card.past .caption-kicker{color:#a9c9c1}.caption-card.past .caption-caret{display:none}
.caption-dot{position:absolute;width:3px;height:3px;border-radius:50%;background:#baffdf;opacity:.35;box-shadow:0 0 12px #79efd0;animation:caption-drift 8s ease-in-out infinite alternate}
body.caption-paused #caption-stage *{animation-play-state:paused!important}
@keyframes caption-shine{to{left:160%}}@keyframes caption-blink{50%{opacity:0}}@keyframes caption-drift{to{transform:translate3d(15px,-28px,0);opacity:.65}}
@media(max-width:600px){.caption-card{width:68vw;min-height:112px;padding:16px 18px;top:46%;background:linear-gradient(135deg,#fffef7bd,#e8fff5aa)}.caption-card.right{right:6vw}.caption-card.left{left:6vw}.caption-text{font-size:18px}#floating-music-widget{justify-content:center;width:calc(100vw - 24px);gap:6px}#music-status{width:100%;max-width:none;text-align:center;font-size:11px}.return-top{bottom:140px!important}}
@media(prefers-reduced-motion:reduce){body.caption-playing .layout{transform:none}.caption-card{transform:translateY(-50%)}.caption-dot,.caption-caret{animation:none!important}.caption-card:before{display:none}}
.motion-off body.caption-playing .layout{transform:none}.motion-off .caption-card{transform:translateY(-50%)}
@media print{#caption-stage,#caption-dimmer,#floating-music-widget{display:none!important}}
`;document.head.append(style);
const dimmer=document.createElement('div');dimmer.id='caption-dimmer';dimmer.setAttribute('aria-hidden','true');document.body.append(dimmer);
const stage=document.createElement('div');stage.id='caption-stage';stage.setAttribute('aria-hidden','true');stage.innerHTML='<div class="caption-glow"></div>';document.body.append(stage);
for(let i=0;i<16;i++){const d=document.createElement('i');d.className='caption-dot';d.style.cssText=`left:${(i*47+7)%100}%;top:${(i*31+13)%96}%;animation-delay:-${i*.47}s`;stage.append(d);}
function button(text,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;widget.append(b);return b;}
const replay=button('↺ Phát lại',()=>{audio.currentTime=0;index=-2;auto=true;syncAuto();start();});
const follow=button('Cuộn: bật',()=>{auto=!auto;syncAuto();if(auto&&index>=0) scrollCue(index);});
const seek=document.createElement('input');seek.id='caption-seek';seek.type='range';seek.min=0;seek.max=24.74;seek.step=.01;seek.value=0;seek.setAttribute('aria-label','Vị trí phát nhạc');widget.append(seek);
let cues=Array.isArray(window.lyricsData)?window.lyricsData:[],index=-2,current=null,raf=0,auto=true,lastFrame=0,visibleCount=-1;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');const moving=()=>!reduced.matches&&!document.documentElement.classList.contains('motion-off');
function syncAuto(){follow.textContent=`Cuộn: ${auto?'bật':'tắt'}`;follow.setAttribute('aria-pressed',String(auto));}
syncAuto();
function stopAuto(){if(!audio.paused){auto=false;syncAuto();}}
addEventListener('wheel',stopAuto,{passive:true});addEventListener('touchstart',e=>{if(!widget.contains(e.target))stopAuto();},{passive:true});
addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key)&&!['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName))stopAuto();});
function scrollCue(i){if(!auto||!moving())return;const sections=[document.querySelector('.intro'),document.querySelector('.lab'),...document.querySelectorAll('.lesson')];const target=sections[Math.round(i*(sections.length-1)/Math.max(1,cues.length-1))];if(!target)return;const y=Math.min(document.documentElement.scrollHeight-innerHeight,Math.max(0,target.getBoundingClientRect().top+scrollY-innerHeight*.22));window.scrollTo({top:y,behavior:'smooth'});}
function change(i,animate=true){index=i;visibleCount=-1;
 stage.querySelectorAll('.caption-card.past').forEach(n=>n.remove());
 if(current){const old=current;old.classList.add('past');if(animate&&moving()){const base=getComputedStyle(old).transform;const a=old.animate([{transform:base,opacity:1},{transform:`translateY(calc(-50% - 105px)) rotate(${i%2?-2:2}deg) scale(.96)`,opacity:0}],{duration:760,easing:'cubic-bezier(.2,.75,.25,1)',fill:'forwards'});a.onfinish=()=>old.remove();}else old.remove();current=null;}
 if(i<0)return;
 const right=i%2===0;layout.style.setProperty('--camera-angle',right?'-.22deg':'.22deg');stage.style.setProperty('--glow-x',right?'77%':'23%');
 const card=document.createElement('div');card.className=`caption-card ${right?'right':'left'}`;card.innerHTML=`<div class="caption-kicker"><span>${String(i+1).padStart(2,'0')} / ${String(cues.length).padStart(2,'0')}</span><span>♪</span></div><div class="caption-text"><span class="typed"></span><i class="caption-caret"></i></div><div class="caption-line"></div>`;stage.append(card);current=card;
 const typed=card.querySelector('.typed');const frag=document.createDocumentFragment();for(const ch of glyphs[i]){const sp=document.createElement('span');sp.className='caption-char';sp.textContent=ch;frag.append(sp);}typed.append(frag);
 if(cues[i].text.length>100)card.querySelector('.caption-text').style.fontSize=cues[i].text.length>170?'14px':'16px';
 if(animate&&moving())card.animate([{opacity:0,transform:`translate(${right?38:-38}px,calc(-50% + 28px)) rotate(${right?2.5:-2.5}deg) scale(.97)`},{opacity:1,transform:`translate(0,-50%) rotate(${right?.8:-.8}deg) scale(1)`}],{duration:760,easing:'cubic-bezier(.2,.75,.25,1)'});
 scrollCue(i);
}
const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('vi',{granularity:'grapheme'}):null;
function letters(t){return segmenter?[...segmenter.segment(t)].map(s=>s.segment):Array.from(t);}
let glyphs=cues.map(c=>letters(c.text));
function paintTyped(i,n){
 const typed=current?.querySelector('.typed');if(!typed)return;
 const chars=typed.children;
 if(n!==visibleCount){
   const a=Math.max(0,visibleCount),b=Math.min(n,chars.length);
   if(n>visibleCount){for(let k=a;k<b;k++)chars[k].classList.add('shown');}
   else{for(let k=Math.max(0,n);k<Math.min(visibleCount,chars.length);k++)chars[k].classList.remove('shown');}
   visibleCount=n;
 }
 for(const el of chars)el.classList.remove('hot','near1','near2');
 if(n>0){chars[n-1]?.classList.add('hot');chars[n-2]?.classList.add('near1');chars[n-3]?.classList.add('near2');}
}
function render(t){let i=-1;for(let j=0;j<cues.length;j++){if(t>=cues[j].time)i=j;else break;}if(i!==index)change(i,!audio.seeking);
 if(current&&i>=0){const end=cues[i+1]?.time||(Number.isFinite(audio.duration)?audio.duration:cues[i].time+2.4);const span=Math.max(.2,end-cues[i].time),p=Math.min(1,Math.max(0,(t-cues[i].time)/span));const n=Math.min(glyphs[i].length,Math.floor(Math.max(0,t-cues[i].time-.10)/Math.max(.1,span*.78)*glyphs[i].length));paintTyped(i,n);current.style.setProperty('--line-progress',p);current.querySelector('.caption-caret').style.visibility=n>=glyphs[i].length?'hidden':'visible';}
 seek.value=t;
}
function tick(now){raf=0;if(audio.paused||audio.ended)return;render(audio.currentTime);
 if(now-lastFrame>250){status.textContent=`${audio.currentTime.toFixed(1)}s · ${Number.isFinite(audio.duration)?audio.duration.toFixed(1):'…'}s`;lastFrame=now;}
 raf=requestAnimationFrame(tick);}
async function start(){try{await audio.play();}catch{status.textContent='Không mở được video. Kiểm tra tên file MP4.';}}
play.onclick=()=>audio.paused?start():audio.pause();
audio.addEventListener('play',()=>{document.body.classList.add('caption-playing');document.body.classList.remove('caption-paused');document.documentElement.classList.add('caption-scroll');stage.classList.add('visible');play.textContent='Ⅱ Tạm dừng';play.setAttribute('aria-pressed','true');stage.getAnimations({subtree:true}).forEach(a=>a.play());if(!raf)raf=requestAnimationFrame(tick);});
audio.addEventListener('pause',()=>{cancelAnimationFrame(raf);raf=0;document.body.classList.add('caption-paused');play.textContent='▶ Tiếp tục';play.setAttribute('aria-pressed','false');status.textContent='Đã tạm dừng';stage.getAnimations({subtree:true}).forEach(a=>a.pause());});
audio.addEventListener('ended',()=>{render(audio.duration);stage.classList.remove('visible');document.body.classList.remove('caption-playing');document.documentElement.classList.remove('caption-scroll');play.textContent='↺ Phát lại';status.textContent='Đã phát xong';});
audio.addEventListener('loadedmetadata',()=>{seek.max=audio.duration;if(audio.duration<cues.at(-1).time)status.textContent='Một số mốc vượt độ dài nhạc';});
audio.addEventListener('error',()=>status.textContent='Không mở được video. Kiểm tra tên file MP4.');
seek.addEventListener('input',()=>{audio.currentTime=Number(seek.value);render(audio.currentTime);});audio.addEventListener('seeked',()=>render(audio.currentTime));
addEventListener('resize',()=>{});
})();
