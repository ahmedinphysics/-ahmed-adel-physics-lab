(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const defaults = { e1:24, e2:8, e3:-12, r1:6, r2:8, r3:10, r4:5, r5:7, animationSpeed:1 };
  const state = { ...defaults };
  let flows = [], lastTime = performance.now();

  const els = {
    sidebar:$('sidebar'), menuButton:$('menuButton'), teacherMode:$('teacherMode'), resetButton:$('resetButton'), statusDot:$('statusDot'), headerState:$('headerState'), headerDetail:$('headerDetail'),
    e1:$('e1'), e2:$('e2'), e3:$('e3'), r1:$('r1'), r2:$('r2'), r3:$('r3'), r4:$('r4'), r5:$('r5'), animationSpeed:$('animationSpeed'),
    e1Out:$('e1Out'), e2Out:$('e2Out'), e3Out:$('e3Out'), r1Out:$('r1Out'), r2Out:$('r2Out'), r3Out:$('r3Out'), r4Out:$('r4Out'), r5Out:$('r5Out'), animationSpeedOut:$('animationSpeedOut'),
    j1Mini:$('j1Mini'), j2Mini:$('j2Mini'), j3Mini:$('j3Mini'), i4Mini:$('i4Mini'), i5Mini:$('i5Mini'), presets:[...document.querySelectorAll('.preset')],
    svgE1:$('svgE1'), svgE2:$('svgE2'), svgE3:$('svgE3'), svgR1:$('svgR1'), svgR2:$('svgR2'), svgR3:$('svgR3'), svgR4:$('svgR4'), svgR5:$('svgR5'),
    batteryE1:$('batteryE1'), batteryE2:$('batteryE2'), batteryE3:$('batteryE3'), redE1:$('redE1'), redE2:$('redE2'), redE3:$('redE3'), e1LeftSign:$('e1LeftSign'), e1RightSign:$('e1RightSign'), e2LeftSign:$('e2LeftSign'), e2RightSign:$('e2RightSign'), e3LeftSign:$('e3LeftSign'), e3RightSign:$('e3RightSign'),
    mesh1Ref:$('mesh1Ref'), mesh2Ref:$('mesh2Ref'), mesh3Ref:$('mesh3Ref'), mesh1Arrow:$('mesh1Arrow'), mesh2Arrow:$('mesh2Arrow'), mesh3Arrow:$('mesh3Arrow'), mesh1Label:$('mesh1Label'), mesh2Label:$('mesh2Label'), mesh3Label:$('mesh3Label'),
    i4Vector:$('i4Vector'), i4Arrow:$('i4Arrow'), i4Label:$('i4Label'), i5Vector:$('i5Vector'), i5Arrow:$('i5Arrow'), i5Label:$('i5Label'), chargeLayer:$('chargeLayer'),
    svgLoop1:$('svgLoop1'), svgLoop2:$('svgLoop2'), svgLoop3:$('svgLoop3'), svgLoop1Value:$('svgLoop1Value'), svgLoop2Value:$('svgLoop2Value'), svgLoop3Value:$('svgLoop3Value'), svgKcl:$('svgKcl'),
    effectTitle:$('effectTitle'), effectText:$('effectText'), j1Value:$('j1Value'), j2Value:$('j2Value'), j3Value:$('j3Value'), i4Value:$('i4Value'), i5Value:$('i5Value'), kclBResidual:$('kclBResidual'), kclCResidual:$('kclCResidual'), loop1Residual:$('loop1Residual'), loop2Residual:$('loop2Residual'), loop3Residual:$('loop3Residual'), sourcePower:$('sourcePower'), resistorPower:$('resistorPower'), matrixAccount:$('matrixAccount'), kvlAccount:$('kvlAccount'), powerAccount:$('powerAccount')
  };

  const fmt = (n, d=3) => (Math.abs(n) < 0.5 * 10 ** (-d) ? 0 : n).toFixed(d);
  const signed = (n, d=3, unit='') => `${n >= -0.5 * 10 ** (-d) ? '+' : '−'}${Math.abs(Math.abs(n) < 0.5 * 10 ** (-d) ? 0 : n).toFixed(d)}${unit ? ` ${unit}` : ''}`;

  function solve3(A, b) {
    const m = A.map((row,i)=>[...row,b[i]]);
    for (let col=0; col<3; col++) {
      let pivot=col;
      for (let r=col+1; r<3; r++) if (Math.abs(m[r][col])>Math.abs(m[pivot][col])) pivot=r;
      [m[col],m[pivot]]=[m[pivot],m[col]];
      const p=m[col][col];
      if (Math.abs(p)<1e-12) return [0,0,0];
      for (let c=col; c<4; c++) m[col][c]/=p;
      for (let r=0; r<3; r++) if (r!==col) {
        const f=m[r][col];
        for (let c=col; c<4; c++) m[r][c]-=f*m[col][c];
      }
    }
    return [m[0][3],m[1][3],m[2][3]];
  }

  function physics() {
    const {e1,e2,e3,r1,r2,r3,r4,r5} = state;
    const A = [[r1+r4,-r4,0],[-r4,r2+r4+r5,-r5],[0,-r5,r3+r5]];
    const [j1,j2,j3] = solve3(A,[e1,e2,e3]);
    const i4 = j1-j2;
    const i5 = j2-j3;
    const loop1 = e1-j1*r1-i4*r4;
    const loop2 = e2-j2*r2-i5*r5+(i4*r4); // +(J1-J2)R4 = -(J2-J1)R4
    const loop3 = e3-j3*r3+i5*r5;          // +(J2-J3)R5 = -(J3-J2)R5
    const kclB = j1-j2-i4;
    const kclC = j2-j3-i5;
    const sourcePowers = [e1*j1,e2*j2,e3*j3];
    const sourcePower = sourcePowers.reduce((a,b)=>a+b,0);
    const resistorPower = j1*j1*r1+j2*j2*r2+j3*j3*r3+i4*i4*r4+i5*i5*r5;
    return {j1,j2,j3,i4,i5,loop1,loop2,loop3,kclB,kclC,sourcePowers,sourcePower,resistorPower,powerResidual:sourcePower-resistorPower,A};
  }

  function setBattery(index, value) {
    const neg=value<0, battery=els[`batteryE${index}`], left=els[`e${index}LeftSign`], right=els[`e${index}RightSign`], red=els[`redE${index}`];
    battery.classList.toggle('negative-source',neg);
    left.textContent=neg?'−':'+'; right.textContent=neg?'+':'−';
    red.setAttribute('d',neg?'M0-34H62V7c0 15-12 27-27 27H0Z':'M-62-34H0V34H-35c-15 0-27-12-27-27Z');
  }

  function setMesh(ref,path,label,current,index,x1,x2) {
    const reversed=current<-.0005, nearZero=Math.abs(current)<.0005;
    ref.classList.toggle('reversed',reversed); ref.classList.toggle('near-zero',nearZero);
    path.setAttribute('d',reversed?`M${x2} 300C${x2} 235 ${x1} 235 ${x1} 300`:`M${x1} 300C${x1} 235 ${x2} 235 ${x2} 300`);
    label.textContent=`J${['₁','₂','₃'][index-1]} = ${signed(current,3,'A')} · ${nearZero?'≈ 0':reversed?'counterclockwise':'clockwise'}`;
  }

  function setBranchVector(vector,path,label,current,positiveD,negativeD,positiveText,negativeText,prefix) {
    const reversed=current<-.0005, nearZero=Math.abs(current)<.0005;
    vector.classList.toggle('reversed',reversed); vector.classList.toggle('near-zero',nearZero);
    path.setAttribute('d',reversed?negativeD:positiveD);
    label.textContent=`${prefix} = ${signed(current,3,'A')} · ${nearZero?'≈ 0':reversed?negativeText:positiveText}`;
  }

  function renderCircuit(p) {
    [['E1','e1'],['E2','e2'],['E3','e3']].forEach(([cap,k])=>els[`svg${cap}`].textContent=signed(state[k],1,'V'));
    ['r1','r2','r3','r4','r5'].forEach(k=>els[`svg${k.toUpperCase()}`].textContent=`${state[k].toFixed(1)} Ω`);
    setBattery(1,state.e1); setBattery(2,state.e2); setBattery(3,state.e3);
    setMesh(els.mesh1Ref,els.mesh1Arrow,els.mesh1Label,p.j1,1,185,330);
    setMesh(els.mesh2Ref,els.mesh2Arrow,els.mesh2Label,p.j2,2,460,645);
    setMesh(els.mesh3Ref,els.mesh3Arrow,els.mesh3Label,p.j3,3,765,1025);
    setBranchVector(els.i4Vector,els.i4Arrow,els.i4Label,p.i4,'M370 235V455','M370 455V235','B → E','E → B','I₄ = J₁ − J₂');
    setBranchVector(els.i5Vector,els.i5Arrow,els.i5Label,p.i5,'M735 235V455','M735 455V235','C → F','F → C','I₅ = J₂ − J₃');
    els.svgLoop1.textContent=`E₁ − J₁R₁ − (J₁−J₂)R₄ = ${signed(p.loop1,3,'V')}`;
    els.svgLoop2.textContent=`E₂ − J₂R₂ − (J₂−J₃)R₅ − (J₂−J₁)R₄ = ${signed(p.loop2,3,'V')}`;
    els.svgLoop3.textContent=`E₃ − J₃R₃ − (J₃−J₂)R₅ = ${signed(p.loop3,3,'V')}`;
    els.svgLoop1Value.textContent=`${signed(state.e1,2)} − ${signed(p.j1*state.r1,2)} − ${signed(p.i4*state.r4,2)} = ${fmt(p.loop1,3)} V`;
    els.svgLoop2Value.textContent=`three terms coupled by R₄ and R₅ · residual ${fmt(p.loop2,6)} V`;
    els.svgLoop3Value.textContent=`${signed(state.e3,2)} − ${signed(p.j3*state.r3,2)} + ${signed(p.i5*state.r5,2)} = ${fmt(p.loop3,3)} V`;
    els.svgKcl.textContent=`B: J₁ − J₂ − I₄ = ${fmt(p.kclB,3)} A · C: J₂ − J₃ − I₅ = ${fmt(p.kclC,3)} A`;
    rebuildFlows(p);
  }

  function markerMarkup(){return `<circle class="halo" r="10"/><circle class="core" r="5"/><path d="M-2-2 2 0-2 2"/>`;}
  function addFlow(dPositive,dNegative,current,count){
    const mag=Math.abs(current); if(mag<.0005)return;
    const reversed=current<0, guide=document.createElementNS(NS,'path'); guide.setAttribute('d',reversed?dNegative:dPositive); guide.setAttribute('fill','none'); guide.setAttribute('stroke','none'); els.chargeLayer.appendChild(guide);
    const markers=Array.from({length:count},(_,i)=>{const g=document.createElementNS(NS,'g');g.setAttribute('class',`charge-marker${reversed?' reverse':''}`);g.innerHTML=markerMarkup();els.chargeLayer.appendChild(g);return{el:g,offset:i/count};});
    flows.push({guide,markers,current:mag,phase:0});
  }
  function rebuildFlows(p){
    els.chargeLayer.innerHTML=''; flows=[];
    addFlow('M115 535V155H405','M405 155H115V535',p.j1,12);
    addFlow('M405 535H115','M115 535H405',p.j1,7);
    addFlow('M405 155H700','M700 155H405',p.j2,8);
    addFlow('M700 535H405','M405 535H700',p.j2,8);
    addFlow('M700 155H1085V535','M1085 535V155H700',p.j3,13);
    addFlow('M1085 535H700','M700 535H1085',p.j3,8);
    addFlow('M405 155V535','M405 535V155',p.i4,9);
    addFlow('M700 155V535','M700 535V155',p.i5,9);
  }

  function renderControls(p){
    ['e1','e2','e3'].forEach(k=>els[`${k}Out`].textContent=signed(state[k],1,'V'));
    ['r1','r2','r3','r4','r5'].forEach(k=>els[`${k}Out`].textContent=`${state[k].toFixed(1)} Ω`);
    els.animationSpeedOut.textContent=`${state.animationSpeed.toFixed(1)}×`;
    els.j1Mini.textContent=`J₁ = ${signed(p.j1,3,'A')}`; els.j2Mini.textContent=`J₂ = ${signed(p.j2,3,'A')}`; els.j3Mini.textContent=`J₃ = ${signed(p.j3,3,'A')}`; els.i4Mini.textContent=`I₄ = ${signed(p.i4,3,'A')}`; els.i5Mini.textContent=`I₅ = ${signed(p.i5,3,'A')}`;
  }

  function renderMeasurements(p){
    els.j1Value.textContent=signed(p.j1,3,'A'); els.j2Value.textContent=signed(p.j2,3,'A'); els.j3Value.textContent=signed(p.j3,3,'A'); els.i4Value.textContent=signed(p.i4,3,'A'); els.i5Value.textContent=signed(p.i5,3,'A');
    els.kclBResidual.textContent=`${fmt(p.kclB,6)} A`; els.kclCResidual.textContent=`${fmt(p.kclC,6)} A`; els.loop1Residual.textContent=`${fmt(p.loop1,6)} V`; els.loop2Residual.textContent=`${fmt(p.loop2,6)} V`; els.loop3Residual.textContent=`${fmt(p.loop3,6)} V`;
    els.sourcePower.textContent=`${fmt(p.sourcePower,2)} W`; els.resistorPower.textContent=`${fmt(p.resistorPower,2)} W`; els.matrixAccount.textContent=`J = [${fmt(p.j1,3)}, ${fmt(p.j2,3)}, ${fmt(p.j3,3)}] A`; els.kvlAccount.textContent=`${fmt(Math.max(Math.abs(p.loop1),Math.abs(p.loop2),Math.abs(p.loop3)),6)} V`; els.powerAccount.textContent=`${fmt(p.powerResidual,6)} W`;
  }

  function renderStatus(p){
    const lawsGood=Math.max(Math.abs(p.kclB),Math.abs(p.kclC),Math.abs(p.loop1),Math.abs(p.loop2),Math.abs(p.loop3),Math.abs(p.powerResidual))<1e-8;
    const sharedZero=Math.abs(p.i4)<.0005&&Math.abs(p.i5)<.0005;
    const reversed=[p.j1,p.j2,p.j3].map((v,i)=>v<-.0005?i+1:null).filter(Boolean);
    const absorbing=p.sourcePowers.map((v,i)=>v<-.005?i+1:null).filter(Boolean);
    els.headerState.textContent=sharedZero?'Equal mesh currents · shared branches idle':lawsGood?'Three coupled loops solved':'Numerical balance warning';
    els.headerDetail.textContent=sharedZero?'J₁ = J₂ = J₃ · I₄ = I₅ = 0':'3 mesh equations · 2 shared branches · KCL + KVL';
    const c=lawsGood?'#2be18f':'#ff6b69'; els.statusDot.style.background=c; els.statusDot.style.boxShadow=`0 0 10px ${c}`;
    if(sharedZero){els.effectTitle.textContent='Shared-branch currents are zero';els.effectText.textContent=`J₁, J₂ and J₃ are all ${fmt(p.j1,3)} A, so adjacent mesh currents cancel in R₄ and R₅. The shared resistors are connected but carry no net current.`;}
    else if(reversed.length){els.effectTitle.textContent=`Mesh ${reversed.join(' & ')} current ${reversed.length>1?'have':'has'} reversed`;els.effectText.textContent=`A negative mesh current means the actual charge flow is opposite to the clockwise reference. The physical branch animation follows the solved direction automatically.`;}
    else if(absorbing.length){els.effectTitle.textContent=`Source E${absorbing.join(' and E')} is absorbing power`;els.effectText.textContent=`A voltage source can absorb energy when current enters its positive terminal. Kirchhoff's laws still hold; the source is being charged by the rest of the network.`;}
    else{els.effectTitle.textContent='All three mesh currents follow the clockwise references';els.effectText.textContent=`The loops remain coupled through R₄ and R₅. Change any source or shared resistance and the simultaneous solution updates across the whole network.`;}
  }

  function setState(values,presetName=null){
    Object.assign(state,values); ['e1','e2','e3','r1','r2','r3','r4','r5','animationSpeed'].forEach(k=>els[k].value=state[k]); els.presets.forEach(b=>b.classList.toggle('active',b.dataset.preset===presetName)); update();
  }
  function update(){const p=physics();renderCircuit(p);renderControls(p);renderMeasurements(p);renderStatus(p);}

  ['e1','e2','e3','r1','r2','r3','r4','r5','animationSpeed'].forEach(key=>els[key].addEventListener('input',e=>{state[key]=Number(e.target.value);els.presets.forEach(b=>b.classList.remove('active'));update();}));
  els.presets.forEach(btn=>btn.addEventListener('click',()=>{const p=btn.dataset.preset;
    if(p==='right-reverse')setState({e1:24,e2:8,e3:-12,r1:6,r2:8,r3:10,r4:5,r5:7,animationSpeed:state.animationSpeed},p);
    if(p==='shared-zero')setState({e1:12,e2:15,e3:18,r1:8,r2:10,r3:12,r4:6,r5:6,animationSpeed:state.animationSpeed},p);
    if(p==='source-absorbs')setState({e1:24,e2:-8,e3:12,r1:6,r2:8,r3:10,r4:5,r5:7,animationSpeed:state.animationSpeed},p);
  }));
  els.resetButton.addEventListener('click',()=>setState(defaults,'right-reverse'));
  els.teacherMode.addEventListener('change',e=>document.body.classList.toggle('teacher-active',e.target.checked));
  els.menuButton.addEventListener('click',()=>els.sidebar.classList.toggle('open-mobile'));
  document.addEventListener('click',e=>{if(innerWidth<=880&&els.sidebar.classList.contains('open-mobile')&&!els.sidebar.contains(e.target)&&e.target!==els.menuButton)els.sidebar.classList.remove('open-mobile');});

  function animate(now){
    const dt=Math.min(40,now-lastTime); lastTime=now;
    flows.forEach(flow=>{flow.phase=(flow.phase+dt*(.000045+Math.min(flow.current,5)*.00010)*state.animationSpeed)%1;const len=flow.guide.getTotalLength();flow.markers.forEach(m=>{const pos=((flow.phase+m.offset)%1)*len,pt=flow.guide.getPointAtLength(pos),pt2=flow.guide.getPointAtLength(Math.min(len,pos+2)),angle=Math.atan2(pt2.y-pt.y,pt2.x-pt.x)*180/Math.PI;m.el.setAttribute('transform',`translate(${pt.x} ${pt.y}) rotate(${angle})`);});}); requestAnimationFrame(animate);
  }

  setState(defaults,'right-reverse'); requestAnimationFrame(animate);
})();
