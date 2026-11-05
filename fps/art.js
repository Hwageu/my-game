// Procedural art: all geometry and surface artwork is authored for VOID BREACH.
export function surfaceTexture(T,kind,canvas,stageIndex=0){
  canvas.width=canvas.height=256;const c=canvas.getContext('2d');
  const floor=kind==='floor';c.fillStyle=floor?['#34434a','#665040','#424c64'][stageIndex]:['#58646c','#88644b','#63728e'][stageIndex];c.fillRect(0,0,256,256);
  let seed=floor?243:512;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<2400;i++){c.fillStyle=rand()>.5?'#ffffff08':'#00000013';c.fillRect(rand()*256,rand()*256,1+rand()*3,1);}
  c.fillStyle='#121e25';c.fillRect(0,0,256,5);c.fillRect(0,0,5,256);c.fillStyle='#829099';c.fillRect(5,5,246,2);
  if(floor){
    c.strokeStyle='#17252d';c.lineWidth=3;c.strokeRect(16,16,224,224);c.fillStyle=['#3c4e56','#594b3c','#3b485f'][stageIndex];c.fillRect(22,22,212,212);
    for(let y=30;y<230;y+=12){c.strokeStyle='#1a2c3480';c.beginPath();c.moveTo(28,y);c.lineTo(228,y);c.stroke();}
    c.fillStyle='#89908a';for(const x of [12,244])for(const y of [12,244])c.fillRect(x-2,y-2,4,4);
    c.fillStyle='#83968a30';for(let i=0;i<30;i++){c.fillRect(20+rand()*210,20+rand()*210,rand()*35,1);}
  }else{
    c.fillStyle=['#26343d','#674b35','#374660'][stageIndex];c.fillRect(15,30,226,145);c.fillStyle='#71818b';c.fillRect(15,30,226,3);c.fillStyle='#0c1921';c.fillRect(28,52,200,86);
    for(let x=36;x<225;x+=15){c.fillStyle='#354650';c.fillRect(x,58,6,72);c.fillStyle='#68757a';c.fillRect(x,58,1,68);}
    c.fillStyle='#17262e';c.fillRect(16,189,224,45);c.fillStyle='#c29a55';c.fillRect(16,195,224,9);
    for(let x=18;x<240;x+=32){c.fillStyle='#1c272b';c.beginPath();c.moveTo(x,195);c.lineTo(x+9,195);c.lineTo(x+2,204);c.lineTo(x-7,204);c.fill();}
    c.fillStyle='#8a9a9f';for(const x of [12,244])for(const y of [16,180,242]){c.fillRect(x-2,y-2,4,4);c.fillStyle='#1c2b34';c.fillRect(x-1,y-1,2,2);c.fillStyle='#8a9a9f';}
    c.fillStyle='#bdc6bd';c.font='bold 9px monospace';c.fillText('SERVICE / 07',27,224);
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.NearestFilter;texture.minFilter=T.LinearMipmapLinearFilter;return texture;
}
function mesh(T,parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
function block(T,p,m,x,y,z,w,h,d){return mesh(T,p,new T.BoxGeometry(w,h,d),m,x,y,z);}
function tube(T,p,m,x,y,z,r,length,axis='y',segments=10){const o=mesh(T,p,new T.CylinderGeometry(r,r,length,segments),m,x,y,z);if(axis==='z')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.z=Math.PI/2;return o;}
function joint(T,p,m,x,y,z,r){return mesh(T,p,new T.SphereGeometry(r,10,7),m,x,y,z);}
function emissive(T,color,intensity=1.8){return new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.3,metalness:.35});}
// Merge fixed parts within each joint so detail does not cost a draw call per bolt.
function mergeParts(T,root){
  const parents=[];root.traverse(p=>{if(p.children?.some(c=>c.isMesh))parents.push(p);});
  for(const p of parents){const groups=new Map();for(const m of [...p.children]){if(!m.isMesh||!m.visible||m.userData.dynamic)continue;const key=m.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}
    for(const parts of groups.values()){if(parts.length<2)continue;const positions=[],normals=[],uvs=[];
      for(const m of parts){m.updateMatrix();const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);uvs.push(...geo.attributes.uv.array);geo.dispose();p.remove(m);m.geometry.dispose();}
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.computeBoundingSphere();p.add(new T.Mesh(geometry,parts[0].material));
    }
  }
}
export function decorateFacility(T,scene,grid,{dark,metal,cyan,orange,lights}){
  const frame=new T.MeshStandardMaterial({color:0x263b46,roughness:.65,metalness:.7});
  const brass=new T.MeshStandardMaterial({color:0x8a6e45,roughness:.65,metalness:.5});
  for(let z=1;z<24;z++)for(let x=1;x<30;x++){
    if(grid[z][x])continue;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      if(grid[z+dz]?.[x+dx]!==1)continue;
      const px=x*4+dx*1.94,pz=z*4+dz*1.94;
      block(T,scene,dark,px,.2,pz,dx?.12:4,.32,dz?.12:4);
      block(T,scene,frame,px,3.95,pz,dx?.18:4,.26,dz?.18:4);
      if((x+z)%3===0){block(T,scene,frame,px,2.1,pz,dx?.22:.2,3.9,dz?.22:.2);}
      if((x+z)%4===0){tube(T,scene,brass,px,3.5,pz,.085,4,dx?'z':'x');}
    }
    if((x+z)%6===0){block(T,scene,metal,x*4,4.35,z*4,3.85,.2,.2);block(T,scene,dark,x*4,4.2,z*4,1.95,.1,.72);block(T,scene,x>19?orange:cyan,x*4,4.14,z*4,1.65,.045,.44);}
  }
  for(const [x,z,color] of (lights||[[24,78,0x63c5df],[32,22,0xe9ad6e],[102,28,0xe77d57],[72,78,0x5a93ba]])){
    const light=new T.PointLight(color,35,27,2);light.position.set(x,3.7,z);scene.add(light);
  }
}
export function enemyModel(T,type,{dark,metal}){
  const g=new T.Group(),heavy=type===2,melee=type===0;
  const armor=new T.MeshStandardMaterial({color:melee?0x94372d:heavy?0x9b7838:0x315f7a,metalness:.65,roughness:.45});
  const edge=new T.MeshStandardMaterial({color:0x9eaab0,metalness:.85,roughness:.25});
  const light=emissive(T,melee?0xff5032:heavy?0xffc25d:0x6ee5ee);
  tube(T,g,dark,0,.92,0,heavy?.51:.29,.8,'y',8);
  const chest=tube(T,g,armor,0,1.32,0,heavy?.68:.42,.72,'y',6);chest.scale.z=.72;
  block(T,g,edge,0,1.47,.31,heavy?.8:.48,.12,.14);block(T,g,dark,0,1.23,.34,heavy?.5:.3,.28,.09);
  tube(T,g,light,0,1.26,.4,.075,.035,'z');
  for(let i=0;i<3;i++)block(T,g,metal,0,1.04+i*.075,-.3,heavy?.76:.46,.035,.09);
  tube(T,g,metal,0,1.77,0,.12,.17);const helmet=joint(T,g,armor,0,2.02,.015,heavy?.34:.28);helmet.scale.set(1,.85,1.1);
  block(T,g,dark,0,2.03,.245,heavy?.59:.47,.19,.09);block(T,g,light,0,2.05,.3,heavy?.46:.36,.065,.035);
  const legs=[];for(const side of [-1,1]){
    const leg=new T.Group();leg.position.set(side*(heavy?.4:.25),.8,0);g.add(leg);
    joint(T,leg,metal,0,-.03,0,.14);tube(T,leg,dark,0,-.22,0,.11,.4);joint(T,leg,edge,0,-.4,.03,.12);
    block(T,leg,armor,0,-.48,.04,heavy?.29:.2,.34,.23);block(T,leg,dark,0,-.72,.13,heavy?.36:.25,.16,.48);legs.push(leg);
  }
  const arm=new T.Group();arm.position.set(heavy?.76:.51,1.6,0);g.add(arm);
  const otherArm=new T.Group();otherArm.position.set(heavy?-.76:-.51,1.6,0);g.add(otherArm);
  for(const [i,a] of [arm,otherArm].entries()){
    joint(T,a,metal,0,-.03,0,heavy?.23:.17);tube(T,a,armor,0,-.26,0,heavy?.22:.12,.38);joint(T,a,edge,0,-.48,0,.12);
    tube(T,a,dark,0,-.64,.03,.105,.3);block(T,a,armor,0,-.69,.1,heavy?.29:.18,.3,.25);
    if(melee){const blade=mesh(T,a,new T.ConeGeometry(.14,1.08,3),edge,0,-.66,.53);blade.rotation.x=-Math.PI/2;block(T,a,light,0,-.66,.32,.045,.055,.55);}
    if(i===0&&heavy){block(T,a,dark,0,-.43,.45,.48,.44,.8);for(const dx of [-.12,.12])for(const dy of [-.11,.11]){tube(T,a,metal,dx,-.43+dy,1.02,.075,.75,'z');tube(T,a,light,dx,-.43+dy,1.42,.05,.04,'z');}}
    else if(i===0&&!melee){block(T,a,dark,0,-.42,.42,.22,.25,.8);tube(T,a,edge,0,-.4,.99,.055,.5,'z');block(T,a,metal,0,-.2,.47,.12,.12,.3);tube(T,a,light,0,-.2,.65,.045,.03,'z');}
  }
  if(heavy){for(const side of [-1,1]){block(T,g,armor,side*.67,1.76,0,.47,.38,.8);tube(T,g,metal,side*.3,1.35,-.48,.14,.84);block(T,g,light,side*.61,1.76,.42,.24,.055,.03);}}
  else if(melee){for(const side of [-1,1]){const fin=block(T,g,armor,side*.43,1.8,-.07,.13,.5,.29);fin.rotation.z=-side*.65;}block(T,g,dark,0,1.4,-.39,.24,.65,.25);}
  else {block(T,g,dark,0,1.35,-.42,.5,.72,.27);tube(T,g,metal,-.25,2.35,0,.028,.65);block(T,g,light,-.52,1.57,.2,.12,.22,.05);}
  const charge=joint(T,arm,light,0,melee?-.66:-.42,melee?.9:heavy?1.52:1.3,.13);charge.visible=false;
  mergeParts(T,g);return {g,arm,otherArm,legs,charge};
}
export function weaponRig(T,{dark,metal,cyan,orange}){
  const gun=new T.Group(),models=[],muzzles=[],pumps=[];
  const polymer=new T.MeshStandardMaterial({color:0x24313a,roughness:.7,metalness:.25});
  const steel=new T.MeshStandardMaterial({color:0x72858e,roughness:.3,metalness:.85});
  const glove=new T.MeshStandardMaterial({color:0x363329,roughness:.9});
  for(let i=0;i<3;i++){
    const m=new T.Group();gun.add(m);models.push(m);m.visible=i===0;
    block(T,m,polymer,0,-.12,.07,.13,.3,.15);tube(T,m,glove,0,-.19,.15,.105,.24,'y',8);block(T,m,glove,0,-.34,.22,.16,.18,.25);
    if(i===0){
      block(T,m,polymer,0,.01,-.13,.17,.16,.4);block(T,m,steel,0,.12,-.17,.18,.1,.43);
      for(const x of [-.095,.095])for(let z=0;z<4;z++)block(T,m,dark,x,.12,.005-z*.025,.008,.065,.012);
      tube(T,m,dark,0,.065,-.42,.045,.18,'z');block(T,m,cyan,0,.19,.005,.025,.02,.025);
      block(T,m,metal,0,-.05,-.13,.21,.035,.18);
    }else if(i===1){
      block(T,m,steel,0,.025,-.1,.22,.2,.45);for(const x of [-.064,.064])tube(T,m,metal,x,.07,-.6,.055,.72,'z');
      const pump=block(T,m,polymer,0,-.035,-.49,.23,.15,.25);pump.userData.dynamic=true;pumps[i]=pump;
      for(let j=0;j<5;j++)block(T,m,dark,0,-.035,-.39-j*.04,.25,.16,.012);
      tube(T,m,glove,-.04,-.12,-.46,.1,.26,'x');block(T,m,orange,0,.19,-.89,.026,.03,.025);
    }else{
      block(T,m,polymer,0,.01,-.23,.2,.27,.65);block(T,m,steel,0,.17,-.2,.22,.045,.57);
      for(let j=0;j<8;j++)block(T,m,dark,0,.21,.03-j*.055,.23,.035,.018);
      tube(T,m,dark,0,.045,-.76,.048,.48,'z');tube(T,m,steel,0,.045,-1.015,.063,.11,'z');
      const mag=block(T,m,dark,0,-.23,-.2,.12,.33,.2);mag.rotation.x=-.12;
      const scope=mesh(T,m,new T.CylinderGeometry(.085,.085,.23,12,1,true),metal,0,.31,-.18);scope.rotation.x=Math.PI/2;
      for(const z of [-.055,-.305]){const rim=mesh(T,m,new T.TorusGeometry(.075,.012,5,12),steel,0,.31,z);rim.rotation.y=0;}
      const lens=new T.MeshStandardMaterial({color:0x739ca9,transparent:true,opacity:.16,roughness:.1,metalness:.15,depthWrite:false});mesh(T,m,new T.CircleGeometry(.065,12),lens,0,.31,-.05);joint(T,m,cyan,0,.31,-.29,.009);
      for(const x of [-.11,.11])for(let j=0;j<4;j++)block(T,m,metal,x,.035,-.39-j*.07,.014,.12,.025);
      tube(T,m,glove,-.04,-.17,-.52,.1,.24,'x');
    }
    const muzzle=mesh(T,m,new T.ConeGeometry(i===1?.16:.11,.32,5),orange,0,.065,i===0?-.64:i===1?-1.1:-1.23);muzzle.rotation.x=-Math.PI/2;muzzle.visible=false;muzzles.push(muzzle);
  }
  mergeParts(T,gun);return {gun,models,muzzles,pumps};
}
export function relayModel(T,{dark,metal,orange,cyan}){
  const g=new T.Group();block(T,g,dark,0,.25,0,1.7,.5,1.2);block(T,g,metal,0,.86,0,1.4,1.25,.85);
  block(T,g,dark,0,1.5,.1,1.6,.9,.65);const screen=block(T,g,orange,0,1.53,.44,1.1,.48,.025);
  for(const x of [-.66,.66])block(T,g,cyan,x,1.52,.45,.065,.65,.035);
  block(T,g,dark,0,1.05,.53,1.12,.1,.42);for(let i=0;i<5;i++)block(T,g,metal,-.4+i*.2,1.11,.61,.12,.025,.13);
  tube(T,g,orange,.52,.82,.49,.07,.03,'z');screen.userData.dynamic=true;mergeParts(T,g);return {g,screen};
}
export function pickupModel(T,type,{dark,metal,green,orange}){
  const g=new T.Group();
  if(type==='health'){
    const white=new T.MeshStandardMaterial({color:0xbfcac2,roughness:.6,metalness:.15});block(T,g,white,0,0,0,.66,.4,.5);block(T,g,dark,0,.25,0,.28,.1,.12);
    for(const side of [-1,1]){block(T,g,green,0,0,side*.256,.32,.08,.02);block(T,g,green,0,0,side*.258,.08,.27,.02);}
  }else if(type==='cache'){
    const blue=emissive(T,0x6cddd3,1);block(T,g,dark,0,0,0,.9,.55,.65);block(T,g,blue,0,.3,0,.95,.08,.7);block(T,g,metal,0,0,.34,.35,.32,.04);tube(T,g,blue,0,0,.38,.08,.04,'z');
  }else{
    block(T,g,metal,0,0,0,.72,.35,.47);block(T,g,dark,0,.2,0,.76,.06,.51);
    for(let i=0;i<4;i++)tube(T,g,orange,-.23+i*.15,.02,.25,.035,.25,'y',8);
  }
  const ring=new T.Mesh(new T.TorusGeometry(.49,.018,5,20),type==='health'?green:orange);ring.rotation.x=Math.PI/2;ring.position.y=-.29;g.add(ring);mergeParts(T,g);return g;
}
export function hazardAreas(T,scene,areas){
  return areas.map(a=>{
    const material=new T.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv; uniform float uTime; void main(){vec2 p=vUv*vec2(10.,5.);float wave=sin(p.x*2.8+sin(p.y*3.+uTime)*.8+uTime*.7);float cracks=pow(abs(sin(p.x*4.+p.y*2.+uTime*.2)),12.);vec3 col=mix(vec3(.17,.035,.008),vec3(.85,.22,.02),wave*.25+.55);col+=vec3(.6,.35,.05)*cracks*.6;gl_FragColor=vec4(col,1.);}'});
    const m=new T.Mesh(new T.PlaneGeometry(a.w,a.d),material);m.rotation.x=-Math.PI/2;m.position.set(a.x+a.w/2,.018,a.z+a.d/2);scene.add(m);
    return m;
  });
}

// Stage-specific set dressing stays on solid columns and the wall edge so
// the visible environment and the grid collision continue to agree.
export function decorateStage(T,scene,grid,index,{dark,metal,cyan,orange}){
  const g=new T.Group();scene.add(g);const animated=[];
  const shell=new T.MeshStandardMaterial({color:[0x91a6ab,0x684f3d,0x526781][index],roughness:.65,metalness:.6});
  const light=emissive(T,[0x6de2c6,0xff7834,0x9b8ff4][index],1.2);
  for(let z=2;z<23;z++)for(let x=2;x<29;x++){
    if(grid[z][x]||(x*3+z)%9!==0)continue;
    const side=[[1,0],[-1,0],[0,1],[0,-1]].find(([dx,dz])=>grid[z+dz]?.[x+dx]===1);
    if(!side)continue;const [dx,dz]=side,p=new T.Group();p.position.set(x*4+dx*1.94,0,z*4+dz*1.94);p.rotation.y=dx?-dx*Math.PI/2:dz===1?Math.PI:0;g.add(p);
    block(T,p,shell,0,2,0,2.9,3.5,.12);
    if(index===0){
      // Sealed observation glass alternates with active server racks.
      if(x%2){block(T,p,dark,0,2,.08,2.5,2.2,.08);for(let i=0;i<7;i++){block(T,p,metal,0,1.15+i*.27,.14,2.15,.17,.06);for(let j=0;j<3;j++)block(T,p,light,-.85+j*.15,1.15+i*.27,.18,.06,.06,.02);}}
      else{const glass=new T.MeshStandardMaterial({color:0x22474a,metalness:.5,roughness:.15});block(T,p,glass,0,2,.08,2.5,2.3,.04);block(T,p,light,0,3.12,.12,2.45,.035,.03);for(const a of [-.8,0,.8])block(T,p,metal,a,2,.14,.055,2.25,.05);block(T,p,light,-.75,1.13,.12,.7,.04,.03);}
    }else if(index===1){
      block(T,p,dark,0,1.75,.09,2.55,2.4,.05);block(T,p,light,0,1.6,.13,2.3,1.8,.03);
      for(let i=0;i<8;i++)block(T,p,metal,-1.05+i*.3,1.7,.18,.11,2.1,.09);
      tube(T,p,shell,-1.35,2.1,.12,.13,3.5);tube(T,p,metal,1.35,2.1,.12,.12,3.5);
      for(const y of [.55,3.5])block(T,p,orange,0,y,.13,2.7,.09,.06);
    }else{
      block(T,p,dark,0,2,.08,2.5,2.7,.06);for(const a of [-.8,0,.8]){tube(T,p,metal,a,2,.13,.17,2.45);tube(T,p,light,a,2,.16,.09,2.05);}for(const y of [.75,3.25])block(T,p,shell,0,y,.2,2.6,.18,.12);
    }
  }
  if(index===1){
    for(const [x,z] of [[24,24],[96,28],[60,36]]){tube(T,g,shell,x,2.8,z,1.2,1.1);tube(T,g,dark,x,3.7,z,.7,1.1);for(const y of [2.3,3.25])tube(T,g,orange,x,y,z,1.24,.07);}
  }
  if(index===2){
    const x=54,z=46;tube(T,g,dark,x,2.15,z,2,4.3,'y',16);tube(T,g,light,x,2.15,z,1.2,3.7,'y',12);
    for(const y of [.35,1.25,3.15,4.1]){const ring=mesh(T,g,new T.TorusGeometry(2.7,.15,6,24),metal,x,y,z);ring.rotation.x=Math.PI/2;ring.userData.dynamic=true;animated.push({mesh:ring,speed:y<2?.4:-.3});}
    for(let i=0;i<6;i++){const a=i*Math.PI/3;block(T,g,metal,x+Math.cos(a)*1.65,2.1,z+Math.sin(a)*1.65,.2,3.9,.2);}
    const halo=mesh(T,g,new T.TorusGeometry(4.1,.045,4,36),light,x,4.15,z);halo.rotation.x=Math.PI/2;
  }
  mergeParts(T,g);return {animated,light};
}
export function animateStage(art,time,dt){for(const r of art.animated)r.mesh.rotation.z+=dt*r.speed;art.light.emissiveIntensity=1.1+Math.sin(time*2)*.12;}

