/* v11 — fixed caption stage, alternating sides, media-clock typing, swipe scroll.
   No dependencies. Captions are read from window.lyricsData in index.html. */
(() => {
'use strict';
if(window.__captionV9) return; window.__captionV9=true;
const audio=document.getElementById('bg-audio'), play=document.getElementById('play-music-btn'), status=document.getElementById('music-status'), widget=document.getElementById('floating-music-widget'), layout=document.querySelector('.layout');
if(!audio||!play||!widget||!layout) return;
const style=document.createElement('style'); style.textContent=`
html.caption-scroll{scroll-behavior:auto!important}body{overflow-x:clip}
.layout{transform-origin:50% var(--camera-y,300px);transition:transform 1.2s cubic-bezier(.16,1,.3,1);}
body.caption-playing .layout{transform:perspective(1800px) rotateX(.35deg) rotateZ(var(--camera-angle,-.65deg)) scale(.986)}
#floating-music-widget{position:fixed;left:50%;bottom:calc(12px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:80;display:flex;gap:7px;align-items:center;flex-wrap:wrap;width:max-content;max-width:calc(100vw - 24px);padding:10px 12px;border:1px solid #6ccbb64d;border-radius:20px;background:#0b1828ed;box-shadow:0 16px 50px #0008;backdrop-filter:blur(22px)}
#floating-music-widget button{border:1px solid #40556a;border-radius:10px;background:#192c3c;padding:7px 10px;font:600 12px system-ui;white-space:nowrap}
#floating-music-widget #play-music-btn{background:#9ef5d9;color:#10252d;border-color:#9ef5d9}#music-status{font:11px system-ui;color:#bcd4df;max-width:160px}#caption-seek{width:100%;height:4px;margin:3px 0;accent-color:#9ef5d9}
#caption-stage{position:fixed;inset:0;z-index:35;pointer-events:none;overflow:hidden;opacity:0;transition:opacity .6s}
#caption-dimmer{position:fixed;inset:0;z-index:30;pointer-events:none;background:#02050bd9;opacity:0;transition:opacity .75s cubic-bezier(.2,.8,.2,1);backdrop-filter:saturate(.72) brightness(.82)}
body.caption-playing #caption-dimmer{opacity:.62}
body.caption-paused #caption-dimmer{opacity:.42}#caption-stage.visible{opacity:1}
#caption-stage:before{content:'';position:absolute;inset:0;background:linear-gradient(0deg,#040b1966,transparent 28%,transparent 76%,#080d1922)}
.caption-glow{position:absolute;width:65vw;height:65vw;max-width:800px;max-height:800px;left:var(--glow-x,60%);top:48%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#60e5ce18,transparent 64%);transition:left 1.2s ease}
.caption-card{position:absolute;top:48%;width:clamp(240px,29vw,410px);min-height:160px;max-height:42vh;padding:25px 28px;border:1px solid #fff9;border-radius:20px;background:linear-gradient(135deg,#fffef7,#e8fff5);color:#112532;box-shadow:0 24px 70px #0007,0 0 65px #7cffd026;transform:translateY(-50%) rotate(var(--card-angle));overflow:hidden;will-change:transform,opacity;isolation:isolate}
.caption-card.right{right:5vw;--card-angle:2deg}.caption-card.left{left:5vw;--card-angle:-2deg}
.caption-card:before{content:'';position:absolute;width:100%;height:200%;top:-50%;left:-120%;transform:rotate(25deg);background:linear-gradient(90deg,transparent,#fff9,transparent);animation:caption-shine 1.3s ease .15s forwards;z-index:-1}
.caption-kicker{display:flex;justify-content:space-between;gap:10px;font:700 10px system-ui;letter-spacing:.16em;color:#50776e;margin-bottom:20px}.caption-text{font:650 clamp(20px,2.2vw,31px)/1.45 system-ui;letter-spacing:-.03em;overflow-wrap:anywhere;white-space:pre-wrap}
.caption-char{display:inline;opacity:.78;transition:opacity .12s,filter .12s,text-shadow .12s,color .12s}
.caption-char.near2{opacity:.9;text-shadow:0 0 5px #aaffea80}
.caption-char.near1{opacity:1;color:#062d28;text-shadow:0 0 8px #78f7d8,0 0 16px #78f7d888}
.caption-char.hot{opacity:1;color:#003a31;text-shadow:0 0 5px #fff,0 0 12px #baffed,0 0 24px #63f2cf,0 0 42px #63f2cf99;filter:brightness(1.18)}.caption-caret{display:inline-block;width:2px;height:1em;vertical-align:-.1em;margin-left:3px;background:#168577;animation:caption-blink .7s steps(1) infinite}.caption-line{position:absolute;bottom:0;left:0;height:3px;width:100%;background:#44bea3;transform:scaleX(var(--line-progress,0));transform-origin:left}
.caption-card.past{background:#090e17;color:white;border-color:#ffffff20;box-shadow:0 18px 48px #0007;transition:background .22s,color .22s}.caption-card.past .caption-kicker{color:#a9c9c1}.caption-card.past .caption-caret{display:none}
.caption-dot{position:absolute;width:3px;height:3px;border-radius:50%;background:#baffdf;opacity:.35;box-shadow:0 0 12px #79efd0;animation:caption-drift 8s ease-in-out infinite alternate}
body.caption-paused #caption-stage *{animation-play-state:paused!important}
@keyframes caption-shine{to{left:160%}}@keyframes caption-blink{50%{opacity:0}}@keyframes caption-drift{to{transform:translate3d(15px,-28px,0);opacity:.65}}
@media(max-width:600px){.caption-card{width:74vw;min-height:142px;padding:20px 22px;top:46%}.caption-card.right{right:5vw}.caption-card.left{left:5vw}.caption-text{font-size:22px}#floating-music-widget{justify-content:center;width:calc(100vw - 24px);gap:6px}#music-status{width:100%;max-width:none;text-align:center;font-size:11px}.return-top{bottom:140px!important}}
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
let cues=Array.isArray(window.lyricsData)?window.lyricsData:[],index=-2,current=null,raf=0,scrollAnim=null,auto=true,lastFrame=0,visibleCount=-1;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');const moving=()=>!reduced.matches&&!document.documentElement.classList.contains('motion-off');
function syncAuto(){follow.textContent=`Cuộn: ${auto?'bật':'tắt'}`;follow.setAttribute('aria-pressed',String(auto));if(!auto)scrollAnim=null;}
syncAuto();
function stopAuto(){if(!audio.paused){auto=false;syncAuto();}}
addEventListener('wheel',stopAuto,{passive:true});addEventListener('touchstart',e=>{if(!widget.contains(e.target))stopAuto();},{passive:true});
addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key)&&!['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName))stopAuto();});
function scrollCue(i){if(!auto||!moving())return;const sections=[document.querySelector('.intro'),document.querySelector('.lab'),...document.querySelectorAll('.lesson')];const target=sections[Math.round(i*(sections.length-1)/Math.max(1,cues.length-1))];const y=Math.min(document.documentElement.scrollHeight-innerHeight,Math.max(0,target.getBoundingClientRect().top+scrollY-innerHeight*.17));scrollAnim={from:scrollY,to:y,start:performance.now()};}
function change(i,animate=true){index=i;visibleCount=-1;
 stage.querySelectorAll('.caption-card.past').forEach(n=>n.remove());
 if(current){const old=current;old.classList.add('past');if(animate&&moving()){const base=getComputedStyle(old).transform;const a=old.animate([{transform:base,opacity:1},{transform:`translateY(calc(-50% - 160px)) rotate(${i%2?-4:4}deg) scale(.92)`,opacity:0}],{duration:900,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});a.onfinish=()=>old.remove();}else old.remove();current=null;}
 if(i<0)return;
 const right=i%2===0;layout.style.setProperty('--camera-angle',right?'-.65deg':'.65deg');stage.style.setProperty('--glow-x',right?'77%':'23%');
 const card=document.createElement('div');card.className=`caption-card ${right?'right':'left'}`;card.innerHTML=`<div class="caption-kicker"><span>${String(i+1).padStart(2,'0')} / ${String(cues.length).padStart(2,'0')}</span><span>♪</span></div><div class="caption-text"><span class="typed"></span><i class="caption-caret"></i></div><div class="caption-line"></div>`;stage.append(card);current=card;
 if(cues[i].text.length>100)card.querySelector('.caption-text').style.fontSize=cues[i].text.length>170?'16px':'18px';
 if(animate&&moving())card.animate([{opacity:0,transform:`translate(${right?65:-65}px,calc(-50% + 55px)) rotate(${right?8:-8}deg) scale(.94)`},{opacity:1,transform:`translate(0,-50%) rotate(${right?2:-2}deg) scale(1)`}],{duration:950,easing:'cubic-bezier(.16,1,.3,1)'});
 scrollCue(i);
}
const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('vi',{granularity:'grapheme'}):null;
function letters(t){return segmenter?[...segmenter.segment(t)].map(s=>s.segment):Array.from(t);}
let glyphs=cues.map(c=>letters(c.text));
function paintTyped(i,n){
 const typed=current?.querySelector('.typed');if(!typed)return;
 if(n!==visibleCount){
   const frag=document.createDocumentFragment();
   for(let k=0;k<n;k++){const s=document.createElement('span');s.className='caption-char';s.textContent=glyphs[i][k];frag.append(s);}
   typed.replaceChildren(frag);visibleCount=n;
 }
 const chars=typed.querySelectorAll('.caption-char');
 chars.forEach((el,k)=>{el.classList.remove('hot','near1','near2');const d=(n-1)-k;if(d===0)el.classList.add('hot');else if(d===1)el.classList.add('near1');else if(d===2)el.classList.add('near2');});
}
function render(t){let i=-1;for(let j=0;j<cues.length;j++){if(t>=cues[j].time)i=j;else break;}if(i!==index)change(i,!audio.seeking);
 if(current&&i>=0){const end=cues[i+1]?.time||(Number.isFinite(audio.duration)?audio.duration:cues[i].time+2.4);const span=Math.max(.2,end-cues[i].time),p=Math.min(1,Math.max(0,(t-cues[i].time)/span));const n=Math.min(glyphs[i].length,Math.floor(Math.max(0,t-cues[i].time-.10)/Math.max(.1,span*.78)*glyphs[i].length));paintTyped(i,n);current.style.setProperty('--line-progress',p);current.querySelector('.caption-caret').style.visibility=n>=glyphs[i].length?'hidden':'visible';}
 seek.value=t;
}
function tick(now){raf=0;if(audio.paused||audio.ended)return;render(audio.currentTime);if(!moving())scrollAnim=null;if(scrollAnim){const p=Math.min(1,(now-scrollAnim.start)/1150);const ease=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;window.scrollTo({top:scrollAnim.from+(scrollAnim.to-scrollAnim.from)*ease,behavior:'instant'});if(p===1)scrollAnim=null;}
 if(now-lastFrame>150){layout.style.setProperty('--camera-y',`${scrollY+innerHeight*.5-layout.offsetTop}px`);status.textContent=`${audio.currentTime.toFixed(1)}s · ${Number.isFinite(audio.duration)?audio.duration.toFixed(1):'…'}s`;lastFrame=now;}raf=requestAnimationFrame(tick);}
async function start(){try{await audio.play();}catch{status.textContent='Không mở được video. Kiểm tra tên file MP4.';}}
play.onclick=()=>audio.paused?start():audio.pause();
audio.addEventListener('play',()=>{document.body.classList.add('caption-playing');document.body.classList.remove('caption-paused');document.documentElement.classList.add('caption-scroll');stage.classList.add('visible');play.textContent='Ⅱ Tạm dừng';play.setAttribute('aria-pressed','true');stage.getAnimations({subtree:true}).forEach(a=>a.play());if(!raf)raf=requestAnimationFrame(tick);});
audio.addEventListener('pause',()=>{cancelAnimationFrame(raf);raf=0;scrollAnim=null;document.body.classList.add('caption-paused');play.textContent='▶ Tiếp tục';play.setAttribute('aria-pressed','false');status.textContent='Đã tạm dừng';stage.getAnimations({subtree:true}).forEach(a=>a.pause());});
audio.addEventListener('ended',()=>{render(audio.duration);stage.classList.remove('visible');document.body.classList.remove('caption-playing');document.documentElement.classList.remove('caption-scroll');play.textContent='↺ Phát lại';status.textContent='Đã phát xong';});
audio.addEventListener('loadedmetadata',()=>{seek.max=audio.duration;if(audio.duration<cues.at(-1).time)status.textContent='Một số mốc vượt độ dài nhạc';});
audio.addEventListener('error',()=>status.textContent='Không mở được video. Kiểm tra tên file MP4.');
seek.addEventListener('input',()=>{audio.currentTime=Number(seek.value);render(audio.currentTime);});audio.addEventListener('seeked',()=>render(audio.currentTime));
addEventListener('resize',()=>{scrollAnim=null;});
})();
