const defaults={voltage:6,resistance:12,area:1,density:8.5,temperature:300,main:true,battery:true,thermal:true};
const state={...defaults};
const q=1.602176634e-19;
const scene=document.getElementById('currentScene');
const lattice=document.getElementById('latticeLayer');
const electronsLayer=document.getElementById('electronLayer');
const fieldOverlay=document.getElementById('fieldOverlay');
const svgNS='http://www.w3.org/2000/svg';
const electrons=[];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let previous=performance.now();

function svgEl(name,attrs={}){const el=document.createElementNS(svgNS,name);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el}
function isClosed(){return state.battery&&state.main&&state.voltage>0}
function physics(){
  const current=isClosed()?state.voltage/state.resistance:0;
  const areaM2=state.area*1e-6;
  const density=state.density*1e28;
  return {current,field:isClosed()?state.voltage:0,drift:current/(density*q*areaM2),power:state.voltage*current,electronRate:current/q};
}

function buildLattice(){
  for(let row=0;row<4;row++)for(let col=0;col<13;col++){
    const x=137+col*60+(row%2?30:0),y=323+row*48;
    if(x>880)continue;
    const g=svgEl('g',{class:'lattice-ion'}),halo=svgEl('circle',{cx:x,cy:y,r:17}),core=svgEl('circle',{cx:x,cy:y,r:12}),plus=svgEl('text',{x,y:y+5});plus.textContent='+';g.append(halo,core,plus);lattice.appendChild(g);
  }
}
function buildElectrons(){
  const seed=(n)=>{const x=Math.sin(n*999)*43758.5453;return x-Math.floor(x)};
  for(let i=0;i<34;i++){
    const x=112+seed(i+2)*775,y=305+seed(i+50)*180;
    const g=svgEl('g',{class:'micro-electron'}),glow=svgEl('circle',{r:10,class:'electron-glow'}),core=svgEl('circle',{r:6,class:'electron-core'}),minus=svgEl('path',{d:'M-3 0H3',class:'electron-minus'});
    g.append(glow,core,minus);electronsLayer.appendChild(g);
    electrons.push({el:g,x,y,vx:(seed(i+100)-.5)*72,vy:(seed(i+200)-.5)*72,phase:seed(i+300)*Math.PI*2});
  }
}
function buildField(){
  for(let i=0;i<6;i++){
    const y=318+i*34,path=svgEl('path',{d:`M820 ${y}H690`,class:'field-line'}),tip=svgEl('path',{d:`M700 ${y-6}l-12 6 12 6`,class:'field-line'});fieldOverlay.append(path,tip);
  }
}

function formatSci(value){if(!value)return '0';const exp=Math.floor(Math.log10(value)),mant=value/10**exp;return `${mant.toFixed(2)} × 10${toSup(exp)}`}
function toSup(n){const map={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};return String(n).split('').map(c=>map[c]).join('')}
function render(){
  const p=physics(),active=isClosed();
  document.getElementById('voltageOut').textContent=`${state.voltage.toFixed(1)} V`;
  document.getElementById('resistanceOut').textContent=`${state.resistance.toFixed(0)} Ω`;
  document.getElementById('areaOut').textContent=`${state.area.toFixed(1)} mm²`;
  document.getElementById('densityOut').textContent=`${state.density.toFixed(1)} × 10²⁸`;
  document.getElementById('temperatureOut').textContent=`${state.temperature} K`;
  document.getElementById('batteryLabel').textContent=`${state.voltage.toFixed(1)} V`;
  document.getElementById('currentValue').textContent=`${p.current.toFixed(3)} A`;
  document.getElementById('fieldValue').textContent=`${p.field.toFixed(2)} V m⁻¹`;
  document.getElementById('driftValue').textContent=p.drift?`${(p.drift*1e6).toFixed(4)} μm s⁻¹`:'0 μm s⁻¹';
  document.getElementById('chargeRate').textContent=`${p.current.toFixed(3)} C s⁻¹`;
  document.getElementById('electronRate').textContent=p.electronRate?formatSci(p.electronRate):'0';
  document.getElementById('powerValue').textContent=`${p.power.toFixed(2)} W`;
  document.getElementById('headerState').textContent=!state.battery?'Battery disconnected':!state.main?'Main switch open':state.voltage===0?'Zero potential difference':'Current flowing';
  const dot=document.getElementById('statusDot');dot.style.background=active?'var(--green)':'var(--red)';dot.style.boxShadow=`0 0 10px ${active?'var(--green)':'var(--red)'}`;
  scene.classList.toggle('current-active',active);scene.style.setProperty('--flow-strength',Math.min(1,p.current/1.5));
  document.getElementById('fieldOverlay').style.opacity=active?Math.min(.78,.2+state.voltage/35):0;
  setToggle('mainButton','mainSvg',state.main,'ON','OFF');
  const bb=document.getElementById('batteryButton'),bs=document.getElementById('batterySvg');bb.classList.toggle('on',state.battery);bb.setAttribute('aria-pressed',state.battery);bb.querySelector('span').textContent=state.battery?'connected':'disconnected';bs.classList.toggle('disconnected',!state.battery);bs.setAttribute('aria-pressed',state.battery);
  const motion=document.getElementById('motionButton');motion.classList.toggle('on',state.thermal);motion.setAttribute('aria-pressed',state.thermal);motion.querySelector('span').textContent=state.thermal?'visible':'hidden';
  drawMacroCharges(p.current);
}
function setToggle(buttonId,svgId,value,on,off){const b=document.getElementById(buttonId),s=document.getElementById(svgId);b.classList.toggle('on',value);b.setAttribute('aria-pressed',value);b.querySelector('span').textContent=value?on:off;s.classList.toggle('off',!value);s.setAttribute('aria-pressed',value);s.querySelector('.switch-state').textContent=value?on:off}
function drawMacroCharges(current){
  const layer=document.getElementById('macroCharges');layer.replaceChildren();if(!isClosed())return;
  const path='M357 210H135V90H865V210H663',count=9,duration=Math.max(2.4,7.2-current*2.6);
  for(let n=0;n<count;n++){
    const g=svgEl('g'),dot=svgEl('circle',{r:4,class:'charge'}),arrow=svgEl('path',{d:'M-11 0H4M0-4l5 4-5 4',class:'charge-arrow'}),motion=svgEl('animateMotion',{dur:`${duration}s`,repeatCount:'indefinite',rotate:'auto',begin:`${-(n/count)*duration}s`,path});g.append(dot,arrow,motion);layer.appendChild(g);
  }
}
function animate(now){
  const dt=Math.min(.032,(now-previous)/1000);previous=now;const p=physics();
  const thermalScale=state.thermal*Math.sqrt(state.temperature/300),visualDrift=Math.min(105,p.drift*1e9*2.8);
  electrons.forEach((e,i)=>{
    e.phase+=dt*(2.2+i%4*.15);
    e.vx+=(Math.sin(e.phase*1.7+i)*42*thermalScale-e.vx*.8)*dt;
    e.vy+=(Math.cos(e.phase*1.3+i*.7)*42*thermalScale-e.vy*.8)*dt;
    e.x+=(e.vx-visualDrift)*dt;e.y+=e.vy*dt;
    if(e.x<104)e.x=896;if(e.x>896)e.x=104;if(e.y<298){e.y=298;e.vy=Math.abs(e.vy)}if(e.y>496){e.y=496;e.vy=-Math.abs(e.vy)}
    e.el.setAttribute('transform',`translate(${e.x.toFixed(1)} ${e.y.toFixed(1)})`);
  });
  requestAnimationFrame(animate);
}
function keyToggle(el,fn){el.addEventListener('click',fn);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}})}
[['voltage','voltage'],['resistance','resistance'],['area','area'],['density','density'],['temperature','temperature']].forEach(([id,key])=>document.getElementById(id).addEventListener('input',e=>{state[key]=+e.target.value;render()}));
document.getElementById('mainButton').addEventListener('click',()=>{state.main=!state.main;render()});keyToggle(document.getElementById('mainSvg'),()=>{state.main=!state.main;render()});
document.getElementById('batteryButton').addEventListener('click',()=>{state.battery=!state.battery;render()});keyToggle(document.getElementById('batterySvg'),()=>{state.battery=!state.battery;render()});
document.getElementById('motionButton').addEventListener('click',()=>{state.thermal=!state.thermal;render()});
document.getElementById('resetButton').addEventListener('click',()=>{Object.assign(state,defaults);['voltage','resistance','area','density','temperature'].forEach(id=>document.getElementById(id).value=state[id]);render()});
document.getElementById('teacherMode').addEventListener('change',e=>document.body.classList.toggle('teacher-active',e.target.checked));
document.getElementById('menuButton').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open-mobile'));
document.addEventListener('click',e=>{if(innerWidth<=880&&!e.target.closest('#sidebar')&&!e.target.closest('#menuButton'))document.getElementById('sidebar').classList.remove('open-mobile')});
buildLattice();buildElectrons();buildField();render();if(!reducedMotion)requestAnimationFrame(animate);
