(()=>{
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const defaults={e1:18,mu:.5,r1:8,r2:12,r3:10,r4:15,r5:12,animationSpeed:1};
  const state={...defaults};
  let flows=[],lastTime=performance.now();
  const $=id=>document.getElementById(id);
  const ids=['sidebar','menuButton','teacherMode','resetButton','statusDot','headerState','headerDetail','chargeLayer','batteryE1','redE1','e1TopSign','e1BottomSign','dependentSource','svgE1','svgMu','svgVdep','svgVA','svgVB','svgVC','svgVD','svgR1','svgR2','svgR3','svgR4','svgR5','vxSense','i1Vector','i1Arrow','i1Label','i2Vector','i2Arrow','i2Label','i3Vector','i3Arrow','i3Label','i4Vector','i4Arrow','i4Label','i5Vector','i5Arrow','i5Label','idVector','idArrow','idLabel','svgKclB','svgSuperKcl','svgConstraint','effectTitle','effectText','e1','mu','r1','r2','r3','r4','r5','animationSpeed','e1Out','muOut','r1Out','r2Out','r3Out','r4Out','r5Out','animationSpeedOut','i1Mini','idMini','vbValue','vcValue','vdValue','vdepValue','idValue','i1Value','i2Value','i3Value','i4Value','i5Value','kclBResidual','superResidual','controlResidual','dependentPower','sourcePower','resistorPower','kclBAccount','superAccount','controlAccount','kclCAccount','kclDAccount','leftKvlAccount','sourceKvlAccount','powerAccount'];
  const els=Object.fromEntries(ids.map(id=>[id,$(id)]));
  els.presets=[...document.querySelectorAll('.preset')];
  const fmt=(x,d=3)=>Math.abs(x)<.5*10**(-d)?(0).toFixed(d):x.toFixed(d);
  const signed=(x,d=3,unit='')=>`${x>=0?'+':'−'}${Math.abs(Math.abs(x)<.5*10**(-d)?0:x).toFixed(d)}${unit?` ${unit}`:''}`;

  function solve3(A,b){
    const m=A.map((row,i)=>[...row,b[i]]);
    for(let col=0;col<3;col++){
      let pivot=col;for(let r=col+1;r<3;r++)if(Math.abs(m[r][col])>Math.abs(m[pivot][col]))pivot=r;
      if(Math.abs(m[pivot][col])<1e-12)return null;
      [m[col],m[pivot]]=[m[pivot],m[col]];
      const p=m[col][col];for(let c=col;c<4;c++)m[col][c]/=p;
      for(let r=0;r<3;r++)if(r!==col){const f=m[r][col];for(let c=col;c<4;c++)m[r][c]-=f*m[col][c];}
    }
    return [m[0][3],m[1][3],m[2][3]];
  }

  function physics(){
    const {e1,mu,r1,r2,r3,r4,r5}=state;
    const A=[[1/r1+1/r2+1/r3,-1/r3,0],[-1/r3,1/r3+1/r4,1/r5],[-mu,1,-1]];
    const sol=solve3(A,[e1/r1,0,0]);
    if(!sol)return {invalid:true};
    const [vb,vc,vd]=sol,vx=vb,vdep=vc-vd;
    const i1=(e1-vb)/r1,i2=vb/r2,i3=(vb-vc)/r3,i4=vc/r4,i5=vd/r5,id=i3-i4;
    const kclB=i1-i2-i3,superKcl=i3-i4-i5,kclC=i3-i4-id,kclD=id-i5,controlResidual=vdep-mu*vx;
    const leftKvl=e1-i1*r1-i2*r2;
    const sourceKvl=-vdep-i5*r5+i4*r4;
    const dependentAbsorbed=vdep*id,independentDelivered=e1*i1;
    const sourcePower=independentDelivered-dependentAbsorbed;
    const resistorPower=i1*i1*r1+i2*i2*r2+i3*i3*r3+i4*i4*r4+i5*i5*r5;
    const powerResidual=sourcePower-resistorPower;
    return {invalid:false,vb,vc,vd,vx,vdep,i1,i2,i3,i4,i5,id,kclB,superKcl,kclC,kclD,controlResidual,leftKvl,sourceKvl,dependentAbsorbed,independentDelivered,sourcePower,resistorPower,powerResidual};
  }

  function setBattery(value){
    const neg=value<0;els.batteryE1.classList.toggle('negative-source',neg);els.e1TopSign.textContent=neg?'−':'+';els.e1BottomSign.textContent=neg?'+':'−';els.redE1.setAttribute('d',neg?'M-34 0H34V80H-34Z':'M-34-80H34V0H-34Z');
  }

  function setVector(vector,path,label,current,positiveD,negativeD,positiveText,negativeText,prefix,labelX,labelY){
    const reversed=current<-.0005,nearZero=Math.abs(current)<.0005;
    vector.classList.toggle('reversed',reversed);vector.classList.toggle('near-zero',nearZero);
    path.setAttribute('d',reversed?negativeD:positiveD);
    if(labelX!==undefined)label.setAttribute('x',labelX);if(labelY!==undefined)label.setAttribute('y',labelY);
    label.textContent=`${prefix} = ${signed(current,3,'A')} · ${nearZero?'≈ 0':reversed?negativeText:positiveText}`;
  }

  function renderCircuit(p){
    els.svgE1.textContent=signed(state.e1,1,'V');els.svgMu.textContent=`μ = ${signed(state.mu,2)}`;els.svgVdep.textContent=`Vᴄ − Vᴅ = ${signed(p.vdep,2,'V')}`;
    els.svgVA.textContent=`${fmt(state.e1,2)} V`;els.svgVB.textContent=`${fmt(p.vb,2)} V`;els.svgVC.textContent=`${fmt(p.vc,2)} V`;els.svgVD.textContent=`${fmt(p.vd,2)} V`;
    ['r1','r2','r3','r4','r5'].forEach(k=>els[`svgR${k.slice(1)}`].textContent=`${state[k].toFixed(1)} Ω`);
    els.vxSense.textContent=`Vₓ = Vᴮ = ${signed(p.vx,2,'V')}`;setBattery(state.e1);els.dependentSource.classList.toggle('negative-gain',state.mu<0);
    setVector(els.i1Vector,els.i1Arrow,els.i1Label,p.i1,'M205 126H380','M380 126H205','A → B','B → A','I₁',292,94);
    setVector(els.i3Vector,els.i3Arrow,els.i3Label,p.i3,'M480 126H670','M670 126H480','B → C','C → B','I₃',575,94);
    setVector(els.idVector,els.idArrow,els.idLabel,p.id,'M785 92H945','M945 92H785','C → D','D → C','Iᴅ',865,72);
    setVector(els.i2Vector,els.i2Arrow,els.i2Label,p.i2,'M395 245V515','M395 515V245','B → G','G → B','I₂',340,538);
    setVector(els.i4Vector,els.i4Arrow,els.i4Label,p.i4,'M685 245V515','M685 515V245','C → G','G → C','I₄',630,538);
    setVector(els.i5Vector,els.i5Arrow,els.i5Label,p.i5,'M975 245V515','M975 515V245','D → G','G → D','I₅',1060,538);
    els.svgKclB.textContent=`Node B · I₁ − I₂ − I₃ = ${fmt(p.kclB,6)} A`;
    els.svgSuperKcl.textContent=`Supernode C-D · I₃ − I₄ − I₅ = ${fmt(p.superKcl,6)} A`;
    els.svgConstraint.textContent=`Vᴄ − Vᴅ = μVₓ · ${signed(p.vdep,3,'V')} = ${signed(state.mu,2)} × ${signed(p.vx,3,'V')}`;
    rebuildFlows(p);
  }

  function markerMarkup(){return `<circle class="halo" r="10"/><circle class="core" r="5"/><path d="M-2-2 2 0-2 2"/>`;}
  function addFlow(dPositive,dNegative,current,count){
    const mag=Math.abs(current);if(mag<.0005)return;
    const reversed=current<0,guide=document.createElementNS(NS,'path');guide.setAttribute('d',reversed?dNegative:dPositive);guide.setAttribute('fill','none');guide.setAttribute('stroke','none');els.chargeLayer.appendChild(guide);
    const markers=Array.from({length:count},(_,i)=>{const el=document.createElementNS(NS,'g');el.setAttribute('class',`charge-marker${reversed?' reverse':''}`);el.innerHTML=markerMarkup();els.chargeLayer.appendChild(el);return{el,offset:i/count};});
    flows.push({guide,markers,current:mag,phase:Math.random()});
  }
  function rebuildFlows(p){
    els.chargeLayer.innerHTML='';flows=[];
    addFlow('M430 580H140V170H430','M430 170H140V580H430',p.i1,19);
    addFlow('M430 170V580','M430 580V170',p.i2,11);
    addFlow('M430 170H720','M720 170H430',p.i3,12);
    addFlow('M720 170V580','M720 580V170',p.i4,11);
    addFlow('M720 170H1010','M1010 170H720',p.id,12);
    addFlow('M1010 170V580','M1010 580V170',p.i5,11);
    addFlow('M1010 580H720','M720 580H1010',p.i5,10);
    addFlow('M720 580H430','M430 580H720',p.i3,10);
  }

  function renderControls(p){
    els.e1Out.textContent=signed(state.e1,1,'V');els.muOut.textContent=signed(state.mu,2);['r1','r2','r3','r4','r5'].forEach(k=>els[`${k}Out`].textContent=`${state[k].toFixed(1)} Ω`);els.animationSpeedOut.textContent=`${state.animationSpeed.toFixed(1)}×`;els.i1Mini.textContent=`I₁ = ${signed(p.i1,3,'A')}`;els.idMini.textContent=`Iᴅ = ${signed(p.id,3,'A')}`;
  }

  function renderMeasurements(p){
    els.vbValue.textContent=signed(p.vb,3,'V');els.vcValue.textContent=signed(p.vc,3,'V');els.vdValue.textContent=signed(p.vd,3,'V');els.vdepValue.textContent=signed(p.vdep,3,'V');els.idValue.textContent=signed(p.id,3,'A');els.i1Value.textContent=signed(p.i1,3,'A');els.i2Value.textContent=signed(p.i2,3,'A');els.i3Value.textContent=signed(p.i3,3,'A');els.i4Value.textContent=signed(p.i4,3,'A');els.i5Value.textContent=signed(p.i5,3,'A');
    els.kclBResidual.textContent=`${fmt(p.kclB,6)} A`;els.superResidual.textContent=`${fmt(p.superKcl,6)} A`;els.controlResidual.textContent=`${fmt(p.controlResidual,6)} V`;els.dependentPower.textContent=signed(p.dependentAbsorbed,2,'W');els.sourcePower.textContent=`${fmt(p.sourcePower,2)} W`;els.resistorPower.textContent=`${fmt(p.resistorPower,2)} W`;
    els.kclBAccount.textContent=`${fmt(p.i1,3)} − ${fmt(p.i2,3)} − (${fmt(p.i3,3)}) = ${fmt(p.kclB,6)} A`;
    els.superAccount.textContent=`${fmt(p.i3,3)} − ${fmt(p.i4,3)} − (${fmt(p.i5,3)}) = ${fmt(p.superKcl,6)} A`;
    els.controlAccount.textContent=`${fmt(p.vdep,3)} = ${fmt(state.mu,2)} × ${fmt(p.vx,3)} V`;
    els.kclCAccount.textContent=`${fmt(p.i3,3)} − ${fmt(p.i4,3)} − (${fmt(p.id,3)}) = ${fmt(p.kclC,6)} A`;
    els.kclDAccount.textContent=`${fmt(p.id,3)} − (${fmt(p.i5,3)}) = ${fmt(p.kclD,6)} A`;
    els.leftKvlAccount.textContent=`E₁ − I₁R₁ − I₂R₂ = ${fmt(p.leftKvl,6)} V`;
    els.sourceKvlAccount.textContent=`−Vᴅₑₚ − I₅R₅ + I₄R₄ = ${fmt(p.sourceKvl,6)} V`;
    els.powerAccount.textContent=`${fmt(p.powerResidual,6)} W`;
  }

  function renderStatus(p){
    const worst=Math.max(Math.abs(p.kclB),Math.abs(p.superKcl),Math.abs(p.kclC),Math.abs(p.kclD),Math.abs(p.controlResidual),Math.abs(p.leftKvl),Math.abs(p.sourceKvl),Math.abs(p.powerResidual));
    const good=worst<1e-8,c=good?'#2be18f':'#ff6b69';els.statusDot.style.background=c;els.statusDot.style.boxShadow=`0 0 10px ${c}`;els.headerState.textContent=good?'VCVS + supernode equations satisfied':'Numerical balance warning';els.headerDetail.textContent=`Vᴄ − Vᴅ = ${signed(state.mu,2)} × Vₓ`;
    if(Math.abs(p.vdep)<.005&&Math.abs(p.id)>.0005){els.effectTitle.textContent='Zero volts across the source — but branch current still flows';els.effectText.textContent=`With μ ≈ 0, the ideal VCVS enforces Vᴄ = Vᴅ. It can still carry ${signed(p.id,3,'A')} because an ideal voltage source current is set by the surrounding KCL equations, not by Ohm's law.`;}
    else if(state.mu<-.005){els.effectTitle.textContent='Negative gain has inverted the source polarity';els.effectText.textContent=`μ = ${signed(state.mu,2)} means Vᴄ − Vᴅ has the opposite sign to Vₓ. The dashed cyan path is only the control signal; no charge flows through it.`;}
    else if(p.dependentAbsorbed<-.005){els.effectTitle.textContent='The dependent voltage source is delivering power';els.effectText.textContent=`The VCVS maintains ${signed(p.vdep,3,'V')} while the solved current is ${signed(p.id,3,'A')}. Their passive-sign product is ${signed(p.dependentAbsorbed,2,'W')}; the negative value means the controlled source supplies ${fmt(-p.dependentAbsorbed,2)} W.`;}
    else if(p.dependentAbsorbed>.005){els.effectTitle.textContent='The dependent voltage source is absorbing power';els.effectText.textContent=`The source voltage is fixed by μVₓ, but its current is solved from KCL. Here current enters the positive C terminal, so the VCVS absorbs ${fmt(p.dependentAbsorbed,2)} W while the C-D supernode stays exactly balanced.`;}
    else{els.effectTitle.textContent='A controlled voltage constraint links two non-reference nodes';els.effectText.textContent='C and D cannot be solved independently because the ideal source fixes their voltage difference. Treat them as one supernode for KCL, then add Vᴄ − Vᴅ = μVₓ as the extra constraint.';}
  }

  function setState(values,presetName=null){Object.assign(state,values);['e1','mu','r1','r2','r3','r4','r5','animationSpeed'].forEach(k=>els[k].value=state[k]);els.presets.forEach(b=>b.classList.toggle('active',b.dataset.preset===presetName));update();}
  function update(){const p=physics();if(p.invalid)return;renderCircuit(p);renderControls(p);renderMeasurements(p);renderStatus(p);}

  ['e1','mu','r1','r2','r3','r4','r5','animationSpeed'].forEach(key=>els[key].addEventListener('input',e=>{state[key]=Number(e.target.value);els.presets.forEach(b=>b.classList.remove('active'));update();}));
  els.presets.forEach(btn=>btn.addEventListener('click',()=>{const p=btn.dataset.preset;
    if(p==='absorbs')setState({e1:18,mu:.5,r1:8,r2:12,r3:10,r4:15,r5:12,animationSpeed:state.animationSpeed},p);
    if(p==='zero-voltage')setState({e1:18,mu:0,r1:8,r2:12,r3:10,r4:15,r5:12,animationSpeed:state.animationSpeed},p);
    if(p==='delivers')setState({e1:18,mu:1,r1:8,r2:12,r3:10,r4:15,r5:12,animationSpeed:state.animationSpeed},p);
    if(p==='negative-gain')setState({e1:18,mu:-.8,r1:8,r2:12,r3:10,r4:15,r5:12,animationSpeed:state.animationSpeed},p);
  }));
  els.resetButton.addEventListener('click',()=>setState(defaults,'absorbs'));
  els.teacherMode.addEventListener('change',e=>document.body.classList.toggle('teacher-active',e.target.checked));
  els.menuButton.addEventListener('click',()=>els.sidebar.classList.toggle('open-mobile'));
  document.addEventListener('click',e=>{if(innerWidth<=880&&els.sidebar.classList.contains('open-mobile')&&!els.sidebar.contains(e.target)&&e.target!==els.menuButton)els.sidebar.classList.remove('open-mobile');});

  function animate(now){
    const dt=Math.min(40,now-lastTime);lastTime=now;
    flows.forEach(flow=>{flow.phase=(flow.phase+dt*(.000045+Math.min(flow.current,5)*.00010)*state.animationSpeed)%1;const len=flow.guide.getTotalLength();flow.markers.forEach(m=>{const pos=((flow.phase+m.offset)%1)*len,pt=flow.guide.getPointAtLength(pos),pt2=flow.guide.getPointAtLength(Math.min(len,pos+2)),angle=Math.atan2(pt2.y-pt.y,pt2.x-pt.x)*180/Math.PI;m.el.setAttribute('transform',`translate(${pt.x} ${pt.y}) rotate(${angle})`);});});requestAnimationFrame(animate);
  }

  setState(defaults,'absorbs');requestAnimationFrame(animate);
})();
