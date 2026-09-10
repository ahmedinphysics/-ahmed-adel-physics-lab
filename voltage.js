const defaults={sourceVoltage:12,separation:.4,positionA:20,positionB:78,chargeMagnitude:5,chargePositive:true,sourceConnected:true};
const state={...defaults};
const svgNS='http://www.w3.org/2000/svg';
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene=document.getElementById('voltageScene');
const pointA=document.getElementById('pointA');
const pointB=document.getElementById('pointB');
const testCharge=document.getElementById('testCharge');
let animationFrame=0;

function svgEl(name,attrs={}){const el=document.createElementNS(svgNS,name);Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,value));return el}
function activeVoltage(){return state.sourceConnected?state.sourceVoltage:0}
function xFromPercent(percent){return 215+(percent/100)*570}
function calculate(){
  const source=activeVoltage();
  const fractionA=state.positionA/100,fractionB=state.positionB/100;
  const potentialA=source*(1-fractionA),potentialB=source*(1-fractionB);
  const deltaV=potentialB-potentialA;
  const signedCharge=(state.chargePositive?1:-1)*state.chargeMagnitude;
  const deltaUNanoJ=signedCharge*deltaV;
  return {source,potentialA,potentialB,deltaV,field:state.separation?source/state.separation:0,deltaUNanoJ,fieldWorkNanoJ:-deltaUNanoJ};
}
function signed(value,digits=2,unit=''){const clean=Math.abs(value)<.0005?0:value;return `${clean>0?'+':''}${clean.toFixed(digits)}${unit}`}

function buildStaticScene(){
  const charges=document.getElementById('plateCharges');
  for(let row=0;row<8;row++){
    for(const [x,sign,kind] of [[175,'+','positive'],[825,'−','negative']]){
      const y=103+row*43,g=svgEl('g',{class:`plate-charge ${kind}`}),circle=svgEl('circle',{cx:x,cy:y,r:8}),text=svgEl('text',{x,y:y+4});text.textContent=sign;g.append(circle,text);charges.appendChild(g);
    }
  }
  const lines=document.getElementById('fieldLines');
  for(let row=0;row<6;row++){
    const y=128+row*52,path=svgEl('path',{d:`M215 ${y}H785`,class:'electric-field-line'}),arrow=svgEl('path',{d:`M760 ${y-7}l14 7-14 7`,class:'electric-field-arrow'});lines.append(path,arrow);
  }
  const label=svgEl('text',{x:500,y:112,class:'field-label'});label.textContent='ELECTRIC FIELD';lines.appendChild(label);
}
function positionObjects(progress=0){
  const xA=xFromPercent(state.positionA),xB=xFromPercent(state.positionB),chargeX=xA+(xB-xA)*progress;
  pointA.setAttribute('transform',`translate(${xA} 225)`);pointB.setAttribute('transform',`translate(${xB} 225)`);
  testCharge.setAttribute('transform',`translate(${chargeX} 315)`);
  document.getElementById('movePath').setAttribute('d',`M${xA} 315H${xB}`);
  const direction=xB>=xA?1:-1,tipX=xB-direction*4;
  document.querySelector('.guide-arrow').setAttribute('d',direction>0?`M${tipX-12} 307l14 8-14 8`:`M${tipX+12} 307l-14 8 14 8`);
  const scaleX=(x)=>285+((x-215)/570)*530;
  document.getElementById('scaleA').setAttribute('transform',`translate(${scaleX(xA)} 0)`);document.getElementById('scaleB').setAttribute('transform',`translate(${scaleX(xB)} 0)`);
}
function render(){
  const p=calculate(),active=state.sourceConnected&&state.sourceVoltage>0;
  document.getElementById('sourceVoltageOut').textContent=`${state.sourceVoltage.toFixed(1)} V`;
  document.getElementById('separationOut').textContent=`${state.separation.toFixed(2)} m`;
  document.getElementById('positionAOut').textContent=`${state.positionA}%`;
  document.getElementById('positionBOut').textContent=`${state.positionB}%`;
  document.getElementById('chargeOut').textContent=`${state.chargeMagnitude.toFixed(1)} nC`;
  document.getElementById('sourceLabel').textContent=`${state.sourceVoltage.toFixed(1)} V`;
  document.getElementById('potentialA').textContent=`${p.potentialA.toFixed(2)} V`;
  document.getElementById('potentialB').textContent=`${p.potentialB.toFixed(2)} V`;
  document.getElementById('deltaV').textContent=signed(p.deltaV,2,' V');
  document.getElementById('fieldValue').textContent=`${p.field.toFixed(1)} V m⁻¹`;
  document.getElementById('deltaU').textContent=signed(p.deltaUNanoJ,1,' nJ');
  document.getElementById('fieldWork').textContent=signed(p.fieldWorkNanoJ,1,' nJ');
  pointA.querySelector('.probe-value').textContent=`${p.potentialA.toFixed(1)} V`;pointB.querySelector('.probe-value').textContent=`${p.potentialB.toFixed(1)} V`;
  testCharge.classList.toggle('negative',!state.chargePositive);testCharge.querySelector('text').textContent=state.chargePositive?'+':'−';
  scene.classList.toggle('voltage-off',!active);
  const dot=document.getElementById('statusDot');dot.style.background=active?'var(--green)':'var(--red)';dot.style.boxShadow=`0 0 10px ${active?'var(--green)':'var(--red)'}`;
  document.getElementById('headerState').textContent=!state.sourceConnected?'Source disconnected':state.sourceVoltage===0?'Zero potential difference':'Electric field active';
  const sourceButton=document.getElementById('sourceButton');sourceButton.classList.toggle('on',state.sourceConnected);sourceButton.setAttribute('aria-pressed',state.sourceConnected);sourceButton.querySelector('span').textContent=state.sourceConnected?'connected':'disconnected';
  const battery=document.getElementById('batterySvg');battery.classList.toggle('disconnected',!state.sourceConnected);battery.setAttribute('aria-pressed',state.sourceConnected);
  const signButton=document.getElementById('chargeSignButton');signButton.classList.toggle('on',state.chargePositive);signButton.setAttribute('aria-pressed',state.chargePositive);signButton.querySelector('span').textContent=state.chargePositive?'positive':'negative';
  const energyDown=p.deltaUNanoJ<-.0005,energyUp=p.deltaUNanoJ>.0005;
  document.getElementById('meaningTitle').textContent=energyDown?'Potential energy decreases':energyUp?'Potential energy increases':'No potential-energy change';
  document.getElementById('meaningText').textContent=energyDown?'The electric field does positive work during the move from A to B.':energyUp?'An external agent must supply energy to move the charge from A to B.':'A and B are at the same potential, or the source is off.';
  positionObjects(0);
}
function animateCharge(){
  cancelAnimationFrame(animationFrame);
  if(reducedMotion){positionObjects(1);return}
  const start=performance.now(),duration=1300;
  function step(now){const t=Math.min(1,(now-start)/duration),eased=.5-.5*Math.cos(Math.PI*t);positionObjects(eased);if(t<1)animationFrame=requestAnimationFrame(step)}
  animationFrame=requestAnimationFrame(step);
}
function toggleSource(){state.sourceConnected=!state.sourceConnected;render()}
function keyToggle(el,fn){el.addEventListener('click',fn);el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();fn()}})}
[['sourceVoltage','sourceVoltage'],['separation','separation'],['positionA','positionA'],['positionB','positionB'],['chargeMagnitude','chargeMagnitude']].forEach(([id,key])=>document.getElementById(id).addEventListener('input',event=>{state[key]=+event.target.value;render()}));
document.getElementById('sourceButton').addEventListener('click',toggleSource);keyToggle(document.getElementById('batterySvg'),toggleSource);
document.getElementById('chargeSignButton').addEventListener('click',()=>{state.chargePositive=!state.chargePositive;render()});
document.getElementById('moveButton').addEventListener('click',animateCharge);
document.getElementById('resetButton').addEventListener('click',()=>{Object.assign(state,defaults);['sourceVoltage','separation','positionA','positionB','chargeMagnitude'].forEach(id=>document.getElementById(id).value=state[id]);render()});
document.getElementById('teacherMode').addEventListener('change',event=>document.body.classList.toggle('teacher-active',event.target.checked));
document.getElementById('menuButton').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open-mobile'));
document.addEventListener('click',event=>{if(innerWidth<=880&&!event.target.closest('#sidebar')&&!event.target.closest('#menuButton'))document.getElementById('sidebar').classList.remove('open-mobile')});
buildStaticScene();render();
