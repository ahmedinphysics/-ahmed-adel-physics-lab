const defaults={voltage:6,resistances:[10,10,10],branches:[true,true,true],main:true,battery:true};
const state=structuredClone(defaults);
const svgNS='http://www.w3.org/2000/svg';
const paths=['M280 430H110V100H730V430H280Z','M280 430H110V235H730V430H280Z','M280 430H110V370H730V430H280Z'];
const controls=document.getElementById('resistanceControls');

state.resistances.forEach((r,i)=>controls.insertAdjacentHTML('beforeend',`<div class="slider-control"><label for="r${i}"><span>R<sub>${i+1}</sub> (Ω)</span><output id="rOut${i}">${r} Ω</output></label><input id="r${i}" type="range" min="2" max="30" step="1" value="${r}" aria-label="Resistance R${i+1}"></div>`));

const on=i=>state.battery&&state.main&&state.branches[i];
const fixed=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):'—';

function setSwitchVisual(i){
  const graphic=document.querySelector(`[data-switch="${i}"]`);
  const button=document.querySelector(`[data-control-switch="${i}"]`);
  graphic.classList.toggle('off',!state.branches[i]);
  graphic.setAttribute('aria-pressed',state.branches[i]);
  graphic.querySelector('.switch-state').textContent=state.branches[i]?'ON':'OFF';
  button.classList.toggle('on',state.branches[i]);
  button.setAttribute('aria-pressed',state.branches[i]);
  button.querySelector('span').textContent=state.branches[i]?'ON':'OFF';
}

function render(){
  const currents=[];let totalI=0,conductance=0;
  state.resistances.forEach((r,i)=>{
    const current=on(i)?state.voltage/r:0; currents.push(current);
    if(on(i)){totalI+=current;conductance+=1/r}
    document.getElementById(`i${i+1}`).textContent=`${fixed(current)} A`;
    document.getElementById(`rOut${i}`).textContent=`${r} Ω`;
    document.getElementById(`lampR${i}`).textContent=`${r} Ω`;
    const lamp=document.querySelector(`[data-lamp="${i}"]`);
    lamp.classList.toggle('on',on(i));
    const energy=Math.min(1,(state.voltage*state.voltage/r)/72);
    lamp.style.setProperty('--lamp-energy',energy.toFixed(3));
    lamp.style.setProperty('--lamp-halo',(0.13+energy*0.52).toFixed(3));
    lamp.style.setProperty('--lamp-spill',(0.05+energy*0.28).toFixed(3));
    setSwitchVisual(i);
  });
  const p=state.voltage*totalI;
  document.getElementById('voltageOut').textContent=`${state.voltage.toFixed(1)} V`;
  document.getElementById('batteryLabel').textContent=`${state.voltage.toFixed(1)} V`;
  document.getElementById('iTotal').textContent=`${fixed(totalI)} A`;
  document.getElementById('rEq').textContent=conductance?`${fixed(1/conductance)} Ω`:'— Ω';
  document.getElementById('pTotal').textContent=`${fixed(p,1)} W`;
  updateMasterControls();
  drawCharges(currents);
  updateStatus();
}

function updateMasterControls(){
  const main=document.getElementById('mainButton');
  main.classList.toggle('on',state.main);main.setAttribute('aria-pressed',state.main);main.querySelector('span').textContent=state.main?'ON':'OFF';
  const mainSvg=document.getElementById('mainSvg');
  mainSvg.classList.toggle('off',!state.main);mainSvg.setAttribute('aria-pressed',state.main);mainSvg.querySelector('.switch-state').textContent=state.main?'ON':'OFF';
  const battery=document.getElementById('batteryButton');
  battery.classList.toggle('on',state.battery);battery.setAttribute('aria-pressed',state.battery);battery.querySelector('span').textContent=state.battery?'connected':'disconnected';
  document.getElementById('batterySvg').classList.toggle('disconnected',!state.battery);
  document.getElementById('batterySvg').setAttribute('aria-pressed',state.battery);
}

function updateStatus(){
  const count=state.branches.filter((_,i)=>on(i)).length;
  const active=count>0;
  const label=!state.battery?'Battery disconnected':!state.main?'Main switch open':count===0?'All branches open':`${count} active branch${count>1?'es':''}`;
  document.getElementById('headerState').textContent=label;
  const dot=document.getElementById('statusDot');dot.style.background=active?'var(--green)':'var(--red)';dot.style.boxShadow=`0 0 10px ${active?'var(--green)':'var(--red)'}`;
}

function drawCharges(currents){
  const layer=document.getElementById('chargeLayer');layer.replaceChildren();
  currents.forEach((current,i)=>{
    if(!on(i))return;
    const markerCount=Math.max(5,Math.min(10,Math.round(5+current*2)));
    const duration=Math.max(2.4,8-current*2.5);
    for(let n=0;n<markerCount;n++){
      const particle=document.createElementNS(svgNS,'g');
      const dot=document.createElementNS(svgNS,'circle');dot.setAttribute('r','3.8');dot.setAttribute('class','charge');
      const arrow=document.createElementNS(svgNS,'path');arrow.setAttribute('d','M-10 0H4M1-3l4 3-4 3');arrow.setAttribute('class','charge-arrow');
      particle.append(dot,arrow);
      const motion=document.createElementNS(svgNS,'animateMotion');motion.setAttribute('dur',`${duration}s`);motion.setAttribute('repeatCount','indefinite');motion.setAttribute('rotate','auto');motion.setAttribute('begin',`${-(n/markerCount)*duration}s`);motion.setAttribute('path',paths[i]);
      particle.appendChild(motion);layer.appendChild(particle);
    }
  });
}

function toggleBranch(i){state.branches[i]=!state.branches[i];render()}
function keyToggle(el,fn){el.addEventListener('click',fn);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}})}
document.getElementById('voltage').addEventListener('input',e=>{state.voltage=+e.target.value;render()});
state.resistances.forEach((_,i)=>document.getElementById(`r${i}`).addEventListener('input',e=>{state.resistances[i]=+e.target.value;render()}));
document.querySelectorAll('[data-control-switch]').forEach((el,i)=>el.addEventListener('click',()=>toggleBranch(i)));
document.querySelectorAll('[data-switch]').forEach((el,i)=>keyToggle(el,()=>toggleBranch(i)));
document.getElementById('mainButton').addEventListener('click',()=>{state.main=!state.main;render()});
keyToggle(document.getElementById('mainSvg'),()=>{state.main=!state.main;render()});
document.getElementById('batteryButton').addEventListener('click',()=>{state.battery=!state.battery;render()});
keyToggle(document.getElementById('batterySvg'),()=>{state.battery=!state.battery;render()});
document.getElementById('resetButton').addEventListener('click',()=>{Object.assign(state,structuredClone(defaults));document.getElementById('voltage').value=state.voltage;state.resistances.forEach((r,i)=>document.getElementById(`r${i}`).value=r);render()});
document.getElementById('teacherMode').addEventListener('change',e=>document.body.classList.toggle('teacher-active',e.target.checked));
document.getElementById('menuButton').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open-mobile'));
document.addEventListener('click',e=>{if(innerWidth<=880&&!e.target.closest('#sidebar')&&!e.target.closest('#menuButton'))document.getElementById('sidebar').classList.remove('open-mobile')});
render();
