const materials={
  nichrome:{name:'Nichrome',rho:1.10e-6,alpha:.0004,note:'High resistivity and weak temperature dependence; widely used in heating elements.',colors:['#3b120a','#d96734','#f2b07a','#9b321c','#2a0b07']},
  copper:{name:'Copper',rho:1.68e-8,alpha:.00393,note:'Very low resistivity; widely used for electrical wiring.',colors:['#451207','#ff7432','#ffd1a2','#c43d14','#310b04']},
  aluminum:{name:'Aluminum',rho:2.82e-8,alpha:.00403,note:'Low resistivity and low density; common in overhead power lines.',colors:['#26343c','#aabcc5','#eef6f8','#768a94','#1b2930']},
  tungsten:{name:'Tungsten',rho:5.60e-8,alpha:.0045,note:'Higher resistivity and a very high melting point; used in hot filaments.',colors:['#221d1a','#89796e','#d3c4b7','#66554b','#171310']},
  constantan:{name:'Constantan',rho:4.90e-7,alpha:.000008,note:'Nearly temperature-stable resistance; useful in precision resistors and sensors.',colors:['#352016','#c7834f','#edc29b','#8e5737','#21130d']}
};
const defaults={material:'nichrome',voltage:6,length:2,area:.5,temperature:20,animationSpeed:1,sourceConnected:true,animationPlaying:true};
const state={...defaults};
const svgNS='http://www.w3.org/2000/svg',q=1.602176634e-19;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const electrons=[],ions=[];let previous=performance.now(),body={top:322,bottom:498},lastArea=-1;

function svgEl(name,attrs={}){const el=document.createElementNS(svgNS,name);Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,value));return el}
function physics(){const m=materials[state.material],rho=m.rho*(1+m.alpha*(state.temperature-20)),areaM2=state.area*1e-6,R=rho*state.length/areaM2,I=state.sourceConnected&&state.voltage>0?state.voltage/R:0;return {m,rho,R,I,currentDensity:I/state.area,G:1/R,P:state.voltage*I}}
function sci(value){if(!value)return '0';const exponent=Math.floor(Math.log10(value)),mantissa=value/10**exponent;return `${mantissa.toFixed(2)} × 10${sup(exponent)}`}
function sup(number){const map={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};return String(number).split('').map(char=>map[char]).join('')}
function formatCurrent(value){if(value>=1000)return `${(value/1000).toFixed(2)} kA`;if(value>=10)return `${value.toFixed(1)} A`;return `${value.toFixed(3)} A`}

function buildLattice(){
  const layer=document.getElementById('latticeLayer');layer.replaceChildren();ions.length=0;
  const height=body.bottom-body.top,rows=Math.max(2,Math.floor(height/42));
  for(let row=0;row<rows;row++)for(let col=0;col<14;col++){
    const x=132+col*57+(row%2?28:0),y=body.top+24+row*((height-48)/Math.max(1,rows-1));if(x>876)continue;
    const g=svgEl('g',{class:'lattice-ion'}),halo=svgEl('circle',{cx:x,cy:y,r:16,class:'ion-halo'}),core=svgEl('circle',{cx:x,cy:y,r:11,class:'ion-core'}),plus=svgEl('text',{x,y:y+4});plus.textContent='+';g.append(halo,core,plus);layer.appendChild(g);ions.push({el:g,phase:(row*13+col)*.73});
  }
}
function buildElectrons(){
  const layer=document.getElementById('electronLayer'),collisions=document.getElementById('collisionLayer');layer.replaceChildren();collisions.replaceChildren();electrons.length=0;
  const seeded=n=>{const value=Math.sin(n*817.13)*43758.5453;return value-Math.floor(value)};
  const count=Math.round(18+(body.bottom-body.top-84)*.24);
  for(let i=0;i<count;i++){
    const g=svgEl('g',{class:'electron'}),glow=svgEl('circle',{r:10,class:'electron-glow'}),core=svgEl('circle',{r:5.8,class:'electron-core'}),minus=svgEl('path',{d:'M-3 0H3',class:'electron-minus'});g.append(glow,core,minus);layer.appendChild(g);
    const flash=svgEl('circle',{r:7,class:'collision-flash'});collisions.appendChild(flash);
    const electron={el:g,flash,x:118+seeded(i+4)*760,y:body.top+12+seeded(i+70)*(body.bottom-body.top-24),vx:(seeded(i+130)-.5)*70,vy:(seeded(i+210)-.5)*70,phase:seeded(i+310)*Math.PI*2,flashLife:0,collisionClock:.3+seeded(i+410)*1.4};g.setAttribute('transform',`translate(${electron.x.toFixed(1)} ${electron.y.toFixed(1)})`);electrons.push(electron);
  }
}
function updateGeometry(){
  const normalized=Math.sqrt(state.area/5),height=84+normalized*102,top=410-height/2,bottom=410+height/2;body={top,bottom};
  const shell=document.getElementById('conductorShell'),inner=document.getElementById('conductorInner'),clip=document.getElementById('clipRect');
  shell.setAttribute('y',top-17);shell.setAttribute('height',height+34);shell.setAttribute('rx',(height+34)/2);
  inner.setAttribute('y',top);inner.setAttribute('height',height);inner.setAttribute('rx',height/2);clip.setAttribute('y',top);clip.setAttribute('height',height);clip.setAttribute('rx',height/2);
  document.getElementById('conductorShine').setAttribute('d',`M154 ${top+13}H846`);
  const turns=4+Math.round(state.length*1.7),points=[];for(let i=0;i<=turns*18;i++){const t=i/(turns*18),x=194+t*612,y=151+Math.sin(t*turns*Math.PI*2)*20;points.push(`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`)}
  const path=points.join(' '),width=6+Math.sqrt(state.area)*3.2;document.getElementById('sampleShadow').setAttribute('d',path);document.getElementById('sampleShadow').style.strokeWidth=width+7;document.getElementById('sampleWire').setAttribute('d',path);document.getElementById('sampleWire').style.strokeWidth=width;document.getElementById('sampleHighlight').setAttribute('d',path);document.getElementById('sampleHighlight').style.strokeWidth=Math.max(1.2,width*.18);
  const radius=14+Math.sqrt(state.area/5)*24,disc=document.getElementById('areaDisc');disc.setAttribute('rx',radius*.78);disc.setAttribute('ry',radius);
  if(state.area!==lastArea){lastArea=state.area;buildLattice();buildElectrons()}
}
function updateMaterial(){const colors=materials[state.material].colors;colors.forEach((color,index)=>document.getElementById(`wireStop${index+1}`).setAttribute('stop-color',color))}
function scatteringLabel(rho){const ratio=rho/materials.copper.rho;if(ratio<1.8)return 'Low';if(ratio<8)return 'Moderate';if(ratio<35)return 'High';return 'Very high'}
function render(){
  const p=physics(),active=state.sourceConnected&&state.voltage>0;
  document.getElementById('voltageOut').textContent=`${state.voltage.toFixed(1)} V`;document.getElementById('lengthOut').textContent=`${state.length.toFixed(2)} m`;document.getElementById('areaOut').textContent=`${state.area.toFixed(2)} mm²`;document.getElementById('temperatureOut').textContent=`${state.temperature} °C`;document.getElementById('animationSpeedOut').textContent=`${state.animationSpeed.toFixed(2).replace(/0$/,'')}×`;
  document.getElementById('lengthLabel').textContent=`L = ${state.length.toFixed(2)} m`;document.getElementById('areaLabel').textContent=`${state.area.toFixed(2)} mm²`;
  document.getElementById('resistanceValue').textContent=p.R>=1000?`${(p.R/1000).toFixed(2)} kΩ`:`${p.R.toFixed(p.R<1?4:2)} Ω`;document.getElementById('resistivityValue').textContent=`${sci(p.rho)} Ω·m`;document.getElementById('currentValue').textContent=formatCurrent(p.I);document.getElementById('conductanceValue').textContent=p.G>=1000?`${(p.G/1000).toFixed(2)} kS`:`${p.G.toFixed(3)} S`;document.getElementById('powerValue').textContent=p.P>=1000?`${(p.P/1000).toFixed(2)} kW`:`${p.P.toFixed(2)} W`;document.getElementById('scatteringValue').textContent=scatteringLabel(p.rho);
  document.getElementById('materialName').textContent=p.m.name;document.getElementById('materialNote').textContent=p.m.note;
  document.getElementById('headerState').textContent=!state.sourceConnected?'Source disconnected':state.voltage===0?'Zero potential difference':p.I>50?'Very high ideal-source current':'Current flowing';const dot=document.getElementById('statusDot');dot.style.background=active?'var(--green)':'var(--red)';dot.style.boxShadow=`0 0 10px ${active?'var(--green)':'var(--red)'}`;
  document.getElementById('resistanceScene').classList.toggle('resistance-off',!active);const battery=document.getElementById('batterySvg');battery.classList.toggle('disconnected',!state.sourceConnected);battery.setAttribute('aria-pressed',state.sourceConnected);
  const sourceButton=document.getElementById('sourceButton');sourceButton.classList.toggle('on',state.sourceConnected);sourceButton.setAttribute('aria-pressed',state.sourceConnected);sourceButton.querySelector('span').textContent=state.sourceConnected?'connected':'disconnected';const animationButton=document.getElementById('animationButton');animationButton.classList.toggle('on',state.animationPlaying);animationButton.setAttribute('aria-pressed',state.animationPlaying);animationButton.querySelector('span').textContent=state.animationPlaying?'playing':'paused';
  updateMaterial();updateGeometry();
}
function animate(now){
  const rawDt=Math.min(.032,(now-previous)/1000);previous=now;if(state.animationPlaying){const dt=rawDt*state.animationSpeed,p=physics(),temperatureFactor=Math.sqrt((state.temperature+273.15)/293.15),resistivityRatio=Math.max(1,p.rho/materials.copper.rho),drift=p.currentDensity>0?Math.min(125,10+Math.log10(1+p.currentDensity)*36):0,scatterInterval=Math.max(.12,1.45/(1+Math.log10(resistivityRatio)*.75+(state.temperature-20)/230)),ionAmplitude=.45+(state.temperature-20)/62;
    ions.forEach((ion,index)=>{ion.phase+=dt*(4.2+(index%3)*.25);ion.el.setAttribute('transform',`translate(${(Math.sin(ion.phase)*ionAmplitude).toFixed(2)} ${(Math.cos(ion.phase*1.17)*ionAmplitude).toFixed(2)})`)});
    electrons.forEach((electron,index)=>{electron.phase+=dt*(2.1+(index%4)*.13);electron.vx+=(Math.sin(electron.phase*1.7+index)*42*temperatureFactor-electron.vx*.9)*dt;electron.vy+=(Math.cos(electron.phase*1.25+index*.6)*42*temperatureFactor-electron.vy*.9)*dt;electron.collisionClock-=dt;if(electron.collisionClock<=0){electron.collisionClock=scatterInterval*(.55+Math.random());electron.vx=(Math.random()-.5)*110*temperatureFactor;electron.vy=(Math.random()-.5)*110*temperatureFactor;electron.flashLife=.12;electron.flash.setAttribute('cx',electron.x);electron.flash.setAttribute('cy',electron.y)}electron.x+=(electron.vx-drift)*dt;electron.y+=electron.vy*dt;if(electron.x<112)electron.x=888;if(electron.x>888)electron.x=112;if(electron.y<body.top+8){electron.y=body.top+8;electron.vy=Math.abs(electron.vy)}if(electron.y>body.bottom-8){electron.y=body.bottom-8;electron.vy=-Math.abs(electron.vy)}electron.el.setAttribute('transform',`translate(${electron.x.toFixed(1)} ${electron.y.toFixed(1)})`);electron.flashLife=Math.max(0,electron.flashLife-dt);electron.flash.style.opacity=electron.flashLife/.12})}
  requestAnimationFrame(animate);
}
function toggleSource(){state.sourceConnected=!state.sourceConnected;render()}
function keyToggle(element,fn){element.addEventListener('click',fn);element.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();fn()}})}
document.getElementById('materialSelect').addEventListener('change',event=>{state.material=event.target.value;render()});[['voltage','voltage'],['length','length'],['area','area'],['temperature','temperature'],['animationSpeed','animationSpeed']].forEach(([id,key])=>document.getElementById(id).addEventListener('input',event=>{state[key]=+event.target.value;render()}));document.getElementById('sourceButton').addEventListener('click',toggleSource);keyToggle(document.getElementById('batterySvg'),toggleSource);document.getElementById('animationButton').addEventListener('click',()=>{state.animationPlaying=!state.animationPlaying;render()});document.getElementById('resetButton').addEventListener('click',()=>{Object.assign(state,defaults);document.getElementById('materialSelect').value=state.material;['voltage','length','area','temperature','animationSpeed'].forEach(id=>document.getElementById(id).value=state[id]);render()});document.getElementById('teacherMode').addEventListener('change',event=>document.body.classList.toggle('teacher-active',event.target.checked));document.getElementById('menuButton').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open-mobile'));document.addEventListener('click',event=>{if(innerWidth<=880&&!event.target.closest('#sidebar')&&!event.target.closest('#menuButton'))document.getElementById('sidebar').classList.remove('open-mobile')});
render();if(!reducedMotion)requestAnimationFrame(animate);
