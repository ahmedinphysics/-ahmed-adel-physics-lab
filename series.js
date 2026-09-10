const defaults={voltage:6,resistances:[10,10,10],switches:[true,true,true],main:true,battery:true};
const state=structuredClone(defaults);
const svgNS='http://www.w3.org/2000/svg';
const circuit=document.getElementById('circuit');

function lampMarkup(cx,i){
  const y=100;
  return `<g class="lamp" data-lamp="${i}">
    <ellipse class="aura" cx="${cx}" cy="${y-7}" rx="72" ry="58"/>
    <path class="light-spill" d="M${cx-37} ${y-22}c8-34 66-39 74 0 7 25-5 46-14 63h-46c-10-18-18-39-14-63Z"/>
    <path class="glass" d="M${cx-37} ${y-16}c0-28 16-47 37-47s37 19 37 47c0 18-8 29-17 40-5 6-7 11-8 18h-24c-1-7-3-12-8-18-9-11-17-22-17-40Z"/>
    <path class="glass-highlight" d="M${cx-22} ${y-44}c-8 8-11 19-10 31 1 8 4 14 7 19"/>
    <path class="support-wire" d="M${cx-10} ${y+41}l3-32m17 32-3-32"/>
    <path class="filament" d="M${cx-16} ${y-7}l11 14 10-27 12 27"/>
    <rect class="base" x="${cx-20}" y="${y+40}" width="40" height="25" rx="4"/>
    <path class="base-ribs" d="M${cx-17} ${y+46}h34m-34 6h34m-31 6h28"/>
    <circle class="contact" cx="${cx}" cy="${y+65}" r="4"/>
    <text x="${cx}" y="${y+88}">L${i+1} (<tspan id="lampR${i}">10 Ω</tspan>)</text>
  </g>`;
}

circuit.innerHTML=`
  <title id="svgTitle">Three lamps connected in series</title>
  <desc id="svgDesc">One closed path contains three lamps, three individual switches, a main switch and a detachable battery.</desc>
  <defs>
    <radialGradient id="bulbOn" cx=".38" cy=".28"><stop offset="0" stop-color="#fffde1"/><stop offset=".24" stop-color="#fff5a9"/><stop offset=".63" stop-color="#ffd04d"/><stop offset="1" stop-color="#da8012"/></radialGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0f5f7"/><stop offset=".48" stop-color="#8fa4ae"/><stop offset="1" stop-color="#536973"/></linearGradient>
    <linearGradient id="copperWire" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#5d1d09"/><stop offset=".24" stop-color="#ff8a38"/><stop offset=".48" stop-color="#ffd0a1"/><stop offset=".62" stop-color="#d95017"/><stop offset="1" stop-color="#541607"/></linearGradient>
    <radialGradient id="copperNode" cx=".35" cy=".28"><stop offset="0" stop-color="#ffe0bd"/><stop offset=".26" stop-color="#ff8738"/><stop offset=".66" stop-color="#9e300e"/><stop offset="1" stop-color="#321006"/></radialGradient>
    <linearGradient id="cellBody" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#263b48"/><stop offset=".18" stop-color="#0d1b24"/><stop offset=".48" stop-color="#02070b"/><stop offset=".76" stop-color="#132b39"/><stop offset="1" stop-color="#05090c"/></linearGradient>
    <linearGradient id="cellRed" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ff774d"/><stop offset=".22" stop-color="#f22f1f"/><stop offset=".58" stop-color="#9f160f"/><stop offset=".82" stop-color="#e4321c"/><stop offset="1" stop-color="#671109"/></linearGradient>
    <linearGradient id="bulbGlass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eaf8ff" stop-opacity=".46"/><stop offset=".18" stop-color="#7094a9" stop-opacity=".22"/><stop offset=".52" stop-color="#17384e" stop-opacity=".66"/><stop offset=".82" stop-color="#071e30" stop-opacity=".88"/><stop offset="1" stop-color="#416277" stop-opacity=".45"/></linearGradient>
    <linearGradient id="bulbBase" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#44545b"/><stop offset=".18" stop-color="#dce5e8"/><stop offset=".38" stop-color="#6f858e"/><stop offset=".58" stop-color="#f3f6f7"/><stop offset=".82" stop-color="#697d85"/><stop offset="1" stop-color="#283a43"/></linearGradient>
    <filter id="copperGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="softBloom" x="-180%" y="-180%" width="460%" height="460%"><feGaussianBlur stdDeviation="22"/></filter>
    <filter id="filamentBloom" x="-250%" y="-250%" width="600%" height="600%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g class="wire-shadow"><path d="M80 100H140M175 100H208M282 100H330M365 100H398M472 100H520M555 100H588M662 100H740V430H580M520 430H390M278 430H80V100"/></g>
  <g class="wire-layer"><path d="M80 100H140M175 100H208M282 100H330M365 100H398M472 100H520M555 100H588M662 100H740V430H580M520 430H390M278 430H80V100"/></g>
  <g id="chargeLayer"></g>
  <g class="switch" data-switch="0" role="button" tabindex="0" aria-label="Toggle switch S1" aria-pressed="true"><text x="155" y="65">S₁</text><circle cx="140" cy="100" r="8"/><circle cx="175" cy="100" r="8"/><line x1="147" y1="97" x2="168" y2="100"/><text class="switch-state" x="157" y="130">ON</text><rect class="hit" x="120" y="55" width="70" height="90"/></g>
  ${lampMarkup(245,0)}
  <g class="switch" data-switch="1" role="button" tabindex="0" aria-label="Toggle switch S2" aria-pressed="true"><text x="345" y="65">S₂</text><circle cx="330" cy="100" r="8"/><circle cx="365" cy="100" r="8"/><line x1="337" y1="97" x2="358" y2="100"/><text class="switch-state" x="347" y="130">ON</text><rect class="hit" x="310" y="55" width="70" height="90"/></g>
  ${lampMarkup(435,1)}
  <g class="switch" data-switch="2" role="button" tabindex="0" aria-label="Toggle switch S3" aria-pressed="true"><text x="535" y="65">S₃</text><circle cx="520" cy="100" r="8"/><circle cx="555" cy="100" r="8"/><line x1="527" y1="97" x2="548" y2="100"/><text class="switch-state" x="537" y="130">ON</text><rect class="hit" x="500" y="55" width="70" height="90"/></g>
  ${lampMarkup(625,2)}
  <g class="battery" id="batterySvg" role="button" tabindex="0" aria-label="Connect or disconnect battery" aria-pressed="true">
    <ellipse class="battery-floor-shadow" cx="335" cy="465" rx="70" ry="12"/><rect class="terminal terminal-left" x="266" y="416" width="16" height="25" rx="4"/><rect class="terminal terminal-right" x="388" y="416" width="16" height="25" rx="4"/>
    <rect class="cell-shell" x="278" y="397" width="112" height="63" rx="27"/><path class="cell-red" d="M305 397h-4c-14 0-23 12-23 27v9c0 15 9 27 23 27h4Z"/><rect class="cell-band" x="304" y="397" width="10" height="63"/><rect class="cell-band silver" x="314" y="397" width="7" height="63"/><path class="cell-highlight" d="M300 403h65c9 0 15 5 18 12H292c2-7 4-10 8-12Z"/><circle class="battery-bolt" cx="352" cy="429" r="10"/><path class="bolt-mark" d="M354 416l-9 14h7l-4 13 12-17h-7Z"/><text class="sign plus-sign" x="294" y="435">+</text><text class="sign minus-sign" x="375" y="435">−</text><text x="335" y="493">V = <tspan id="batteryLabel">6.0 V</tspan></text><rect class="hit" x="258" y="388" width="150" height="112"/>
  </g>
  <g class="switch main-switch-svg" id="mainSvg" role="button" tabindex="0" aria-label="Toggle main switch" aria-pressed="true"><text x="550" y="394">S (Main)</text><circle cx="520" cy="430" r="8"/><circle cx="580" cy="430" r="8"/><line x1="527" y1="427" x2="573" y2="430"/><text class="switch-state" x="550" y="461">ON</text><rect class="hit" x="495" y="380" width="110" height="95"/></g>
`;

const controls=document.getElementById('resistanceControls');
state.resistances.forEach((r,i)=>controls.insertAdjacentHTML('beforeend',`<div class="slider-control"><label for="r${i}"><span>R<sub>${i+1}</sub> (Ω)</span><output id="rOut${i}">${r} Ω</output></label><input id="r${i}" type="range" min="2" max="30" step="1" value="${r}" aria-label="Resistance R${i+1}"></div>`));

const closed=()=>state.battery&&state.main&&state.switches.every(Boolean);
const fixed=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):'—';

function render(){
  const req=state.resistances.reduce((a,b)=>a+b,0);
  const current=closed()?state.voltage/req:0;
  document.getElementById('voltageOut').textContent=`${state.voltage.toFixed(1)} V`;
  document.getElementById('batteryLabel').textContent=`${state.voltage.toFixed(1)} V`;
  document.getElementById('current').textContent=`${fixed(current)} A`;
  document.getElementById('rEq').textContent=`${fixed(req,1)} Ω`;
  document.getElementById('pTotal').textContent=`${fixed(state.voltage*current,2)} W`;
  state.resistances.forEach((r,i)=>{
    const drop=current*r,power=current*current*r;
    document.getElementById(`v${i+1}`).textContent=`${fixed(drop,1)} V`;
    document.getElementById(`rOut${i}`).textContent=`${r} Ω`;
    document.getElementById(`lampR${i}`).textContent=`${r} Ω`;
    const lamp=document.querySelector(`[data-lamp="${i}"]`);
    lamp.classList.toggle('on',closed());
    const energy=Math.min(1,power/16);
    lamp.style.setProperty('--lamp-halo',(0.13+energy*.52).toFixed(3));
    lamp.style.setProperty('--lamp-spill',(0.05+energy*.28).toFixed(3));
    setSwitch(i);
  });
  setMasters();drawCharges(current);updateStatus();
  document.body.classList.add('series-ready');
}

function setSwitch(i){
  const value=state.switches[i],graphic=document.querySelector(`[data-switch="${i}"]`),button=document.querySelector(`[data-control-switch="${i}"]`);
  graphic.classList.toggle('off',!value);graphic.setAttribute('aria-pressed',value);graphic.querySelector('.switch-state').textContent=value?'ON':'OFF';
  button.classList.toggle('on',value);button.setAttribute('aria-pressed',value);button.querySelector('span').textContent=value?'ON':'OFF';
}
function setMasters(){
  const mb=document.getElementById('mainButton'),ms=document.getElementById('mainSvg');
  mb.classList.toggle('on',state.main);mb.setAttribute('aria-pressed',state.main);mb.querySelector('span').textContent=state.main?'ON':'OFF';
  ms.classList.toggle('off',!state.main);ms.setAttribute('aria-pressed',state.main);ms.querySelector('.switch-state').textContent=state.main?'ON':'OFF';
  const bb=document.getElementById('batteryButton'),bs=document.getElementById('batterySvg');
  bb.classList.toggle('on',state.battery);bb.setAttribute('aria-pressed',state.battery);bb.querySelector('span').textContent=state.battery?'connected':'disconnected';
  bs.classList.toggle('disconnected',!state.battery);bs.setAttribute('aria-pressed',state.battery);
}
function updateStatus(){
  let label='Circuit active';
  if(!state.battery)label='Battery disconnected';else if(!state.main)label='Main switch open';else{const i=state.switches.findIndex(v=>!v);if(i>=0)label=`S${i+1} open — whole circuit stopped`;}
  document.getElementById('headerState').textContent=label;
  const active=closed(),dot=document.getElementById('statusDot');dot.style.background=active?'var(--green)':'var(--red)';dot.style.boxShadow=`0 0 10px ${active?'var(--green)':'var(--red)'}`;
}
function drawCharges(current){
  const layer=document.getElementById('chargeLayer');layer.replaceChildren();if(!closed())return;
  const path='M278 430H80V100H740V430H390Z',count=8,duration=Math.max(2.5,8-current*8);
  for(let n=0;n<count;n++){
    const particle=document.createElementNS(svgNS,'g'),dot=document.createElementNS(svgNS,'circle'),arrow=document.createElementNS(svgNS,'path'),motion=document.createElementNS(svgNS,'animateMotion');
    dot.setAttribute('r','3.8');dot.setAttribute('class','charge');arrow.setAttribute('d','M-10 0H4M1-3l4 3-4 3');arrow.setAttribute('class','charge-arrow');particle.append(dot,arrow);
    motion.setAttribute('dur',`${duration}s`);motion.setAttribute('repeatCount','indefinite');motion.setAttribute('rotate','auto');motion.setAttribute('begin',`${-(n/count)*duration}s`);motion.setAttribute('path',path);particle.appendChild(motion);layer.appendChild(particle);
  }
}
function keyToggle(el,fn){el.addEventListener('click',fn);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}})}
document.getElementById('voltage').addEventListener('input',e=>{state.voltage=+e.target.value;render()});
state.resistances.forEach((_,i)=>document.getElementById(`r${i}`).addEventListener('input',e=>{state.resistances[i]=+e.target.value;render()}));
document.querySelectorAll('[data-control-switch]').forEach((el,i)=>el.addEventListener('click',()=>{state.switches[i]=!state.switches[i];render()}));
document.querySelectorAll('[data-switch]').forEach((el,i)=>keyToggle(el,()=>{state.switches[i]=!state.switches[i];render()}));
document.getElementById('mainButton').addEventListener('click',()=>{state.main=!state.main;render()});keyToggle(document.getElementById('mainSvg'),()=>{state.main=!state.main;render()});
document.getElementById('batteryButton').addEventListener('click',()=>{state.battery=!state.battery;render()});keyToggle(document.getElementById('batterySvg'),()=>{state.battery=!state.battery;render()});
document.getElementById('resetButton').addEventListener('click',()=>{Object.assign(state,structuredClone(defaults));document.getElementById('voltage').value=state.voltage;state.resistances.forEach((r,i)=>document.getElementById(`r${i}`).value=r);render()});
document.getElementById('teacherMode').addEventListener('change',e=>document.body.classList.toggle('teacher-active',e.target.checked));
document.getElementById('menuButton').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open-mobile'));
document.addEventListener('click',e=>{if(innerWidth<=880&&!e.target.closest('#sidebar')&&!e.target.closest('#menuButton'))document.getElementById('sidebar').classList.remove('open-mobile')});
render();
