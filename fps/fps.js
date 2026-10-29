import * as T from '../vendor/three.module.js';
const $=id=>document.getElementById(id), scene=new T.Scene();
scene.background=new T.Color(0x101821);scene.fog=new T.FogExp2(0x101821,.026);
let renderer;
try{renderer=new T.WebGLRenderer({antialias:false,powerPreference:'high-performance'});}catch(e){$('loadStatus').textContent='WebGL 2를 지원하는 브라우저에서 실행해 주세요.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.domElement.tabIndex=0;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;$('view').appendChild(renderer.domElement);
const camera=new T.PerspectiveCamera(82,innerWidth/innerHeight,.07,130);camera.rotation.order='YXZ';scene.add(camera);
scene.add(new T.HemisphereLight(0x7fa3b8,0x35231c,1.8));const sun=new T.DirectionalLight(0xd3d8ce,1.7);sun.position.set(6,12,4);scene.add(sun);
const grid=Array.from({length:25},()=>Array(31).fill(1)), tile=4, solids=[], enemies=[], pickups=[], relays=[], sparks=[];
function carve(x,z,w,h){for(let j=z;j<z+h;j++)for(let i=x;i<x+w;i++)grid[j][i]=0;}
carve(2,17,7,6);carve(5,4,3,16);carve(4,3,10,7);carve(12,6,14,3);carve(20,3,9,8);carve(23,8,3,13);carve(13,16,15,7);carve(7,19,9,3);carve(14,8,3,12);grid[6][9]=grid[6][10]=grid[19][18]=grid[19][19]=grid[6][24]=1;
function texture(kind){const c=document.createElement('canvas');c.width=c.height=128;const p=c.getContext('2d');p.fillStyle=kind==='wall'?'#697077':'#3c454b';p.fillRect(0,0,128,128);for(let i=0;i<1800;i++){const v=Math.random()*70;p.fillStyle=`rgba(${v},${v},${v},.16)`;p.fillRect(Math.random()*128,Math.random()*128,2,2);}p.strokeStyle='#192228';p.lineWidth=4;p.strokeRect(2,2,124,124);if(kind==='wall'){p.fillStyle='#26343c';p.fillRect(8,40,112,42);p.fillStyle='#89928d';p.fillRect(8,38,112,2);for(let i=10;i<118;i+=12){p.fillStyle='#16232a';p.fillRect(i,49,4,23);}p.fillStyle='#b0894e';p.fillRect(8,103,112,7);}else{p.lineWidth=2;p.beginPath();p.moveTo(0,64);p.lineTo(128,64);p.moveTo(64,0);p.lineTo(64,128);p.stroke();}const t=new T.CanvasTexture(c);t.magFilter=T.NearestFilter;t.colorSpace=T.SRGBColorSpace;return t;}
const metal=new T.MeshStandardMaterial({color:0x43525b,roughness:.7,metalness:.65}),dark=new T.MeshStandardMaterial({color:0x171e25,roughness:.55,metalness:.8}),wallMat=new T.MeshStandardMaterial({map:texture('wall'),roughness:.9}),floorMat=new T.MeshStandardMaterial({map:texture('floor'),roughness:.9});
function box(w,h,d,mat,x,y,z,parent=scene){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;}
function glow(color){return new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2});}
const cyan=glow(0x4ccad0),orange=glow(0xe99741),red=glow(0xef4432),green=glow(0x66df9d);
for(let z=1;z<24;z++)for(let x=1;x<30;x++){if(!grid[z][x]){box(4,.2,4,floorMat,x*4,-.1,z*4);box(4,.2,4,metal,x*4,4.6,z*4);if((x+z)%5===0)box(1.7,.04,.3,(x>19?orange:cyan),x*4,4.45,z*4);}else if([[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>grid[z+b]?.[x+a]===0)){const wall=box(4,4.6,4,wallMat,x*4,2.2,z*4);solids.push(wall);}}
const batches=new Map();for(const m of [...scene.children]){if(!m.isMesh||!m.geometry?.parameters)continue;const p=m.geometry.parameters,key=[p.width,p.height,p.depth,m.material.uuid].join('/');if(!batches.has(key))batches.set(key,[]);batches.get(key).push(m);}for(const group of batches.values()){if(group.length<2)continue;const inst=new T.InstancedMesh(group[0].geometry,group[0].material,group.length);group.forEach((m,i)=>{m.updateMatrix();m.updateMatrixWorld(true);inst.setMatrixAt(i,m.matrix);scene.remove(m);});inst.instanceMatrix.needsUpdate=true;scene.add(inst);}
function sign(text,x,z){const c=document.createElement('canvas');c.width=512;c.height=128;const q=c.getContext('2d');q.fillStyle='#17232a';q.fillRect(0,0,512,128);q.fillStyle='#e5bb74';q.font='bold 48px monospace';q.textAlign='center';q.fillText(text,256,78);const mat=new T.MeshBasicMaterial({map:new T.CanvasTexture(c),side:T.DoubleSide});box(3,.75,.03,mat,x,3.3,z);}
sign('07 / ARRIVAL',20,90);sign('01 / REACTOR',32,10);sign('02 / SECURITY',94,10);sign('03 / ENGINEERING',72,90);
const exit=box(3.5,3.8,.3,red,108,1.9,10);solids.push(exit);sign('EXTRACTION',108,10.3);
function addRelay(x,z){const g=new T.Group();g.position.set(x,0,z);box(1.4,1.5,.9,dark,0,.75,0,g);const screen=box(1,.6,.06,orange,0,1.2,.49,g);box(.3,.08,.3,cyan,0,1.6,0,g);scene.add(g);relays.push({g,screen,on:false});}
addRelay(32,20);addRelay(104,28);addRelay(64,80);
function pickup(x,z,type){const g=new T.Group();g.position.set(x,.5,z);box(.6,.5,.6,type==='health'?green:orange,0,0,0,g);box(.12,.52,.62,dark,0,0,0,g);scene.add(g);pickups.push({g,type,used:false});}
[[24,76],[28,20],[100,24],[64,76],[96,76]].forEach(([x,z],i)=>pickup(x,z,i%2?'health':'ammo'));
function addEnemy(x,z,type) {
  const g=new T.Group();g.position.set(x,0,z);
  const armor=new T.MeshStandardMaterial({color:type===0?0xa53e30:type===2?0xa1803c:0x35769a,roughness:.55,metalness:.65});
  const blade=new T.MeshStandardMaterial({color:0xe6b8a2,emissive:0xaa311b,emissiveIntensity:.5,metalness:.85,roughness:.22});
  const heavy=type===2;
  box(heavy?1.25:.72,heavy?1.2:.9,heavy?.8:.48,armor,0,1.12,0,g);
  box(heavy?.95:.55,.2,.55,dark,0,.62,0,g);
  const head=box(type===0?.45:.58,type===0?.38:.48,.5,dark,0,1.9,.02,g);
  if(type===0){head.rotation.z=.12;box(.38,.065,.06,red,0,1.93,.3,g);box(.18,.45,.2,armor,0,1.53,-.26,g);}
  else {box(.36,.12,.1,cyan,0,1.94,.31,g);box(.12,.55,.12,metal,-.25,2.2,0,g);}
  const legs=[];
  for(const side of [-1,1]){const leg=new T.Group();leg.position.set(side*(heavy?.38:.25),.67,0);g.add(leg);box(heavy?.3:.18,.65,.25,dark,0,-.28,0,leg);box(heavy?.38:.23,.18,.42,armor,0,-.58,.09,leg);box(.23,.2,.3,armor,0,-.15,.06,leg);legs.push(leg);}
  const arm=new T.Group();arm.position.set(heavy?.78:.52,1.35,.05);g.add(arm);
  box(heavy?.48:.25,.65,.36,armor,0,-.2,0,arm);
  box(heavy?.48:.25,.7,.36,armor,heavy?-.78:-.52,1.1,0,g);
  if(type===0){
    const edge=box(.16,1.35,.24,blade,0,-.55,.32,arm);edge.rotation.x=-.2;
    const claw=box(.16,1.15,.24,blade,-.52,.65,.32,g);claw.rotation.x=-.25;
    box(.35,.2,.4,dark,0,-.02,.2,arm);
    for(const side of [-1,1]){const fin=box(.15,.65,.3,armor,side*.48,1.65,-.05,g);fin.rotation.z=-side*.55;}
  } else if(heavy){
    box(.65,.48,.9,dark,0,0,.45,arm);
    for(const dx of [-.15,.15])for(const dy of [-.12,.12]){box(.12,.12,1.15,metal,dx,dy,1.08,arm);box(.09,.09,.08,orange,dx,dy,1.68,arm);}
    box(1.75,.42,.75,armor,0,1.65,-.05,g);box(.9,.9,.45,dark,0,1.3,-.62,g);
    for(const side of [-1,1])box(.2,.65,.22,orange,side*.58,1.22,-.54,g);
  } else {
    box(.27,.3,1.15,dark,0,0,.5,arm);box(.13,.13,.6,metal,0,.02,1.23,arm);box(.13,.13,.08,cyan,0,.02,1.56,arm);
    box(.15,.16,.4,metal,0,.24,.55,arm);box(.12,.12,.06,cyan,0,.24,.78,arm);
    box(.45,.72,.3,dark,0,1.2,-.4,g);box(.18,.55,.2,cyan,-.48,1.25,-.12,g);
  }
  const charge=new T.Mesh(new T.SphereGeometry(.14,8,6),glow(heavy?0xffb74c:0x7feaff));charge.position.set(0,0,heavy?1.75:1.62);charge.visible=false;arm.add(charge);
  const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:0xff9c37,transparent:true,opacity:.55}));line.visible=false;scene.add(line);
  const e={g,arm,legs,charge,line,hp:heavy?180:70,type,cool:.35,path:[],pathTime:0,flash:0,windup:0,swing:0,target:new T.Vector3()};
  g.traverse(o=>{if(o.isMesh){o.userData.enemy=e;o.material=o.material.clone();o.userData.baseEmissive=o.material.emissive.clone();o.userData.baseIntensity=o.material.emissiveIntensity;}});
  scene.add(g);enemies.push(e);
}
[[24,52,0],[32,28,1],[44,20,0],[64,28,1],[96,28,1],[104,36,0],[96,72,0],[72,76,1],[104,20,2]].forEach(a=>addEnemy(...a));
const gun=new T.Group();camera.add(gun);gun.position.set(.3,-.3,-.6);box(.16,.18,.46,dark,0,0,0,gun);box(.2,.08,.42,metal,0,.12,-.02,gun);box(.11,.24,.14,dark,0,-.13,.12,gun);box(.04,.035,.05,cyan,0,.18,.12,gun);const barrel=box(.1,.1,.38,metal,0,.04,-.35,gun);const muzzle=box(.16,.16,.1,orange,0,.04,-.58,gun);muzzle.visible=false;const flashLight=new T.PointLight(0xffac59,0,8);camera.add(flashLight);
const state={mode:'title',hp:100,kills:0,time:0,weapon:0,rounds:[12,6,24],reserve:[96,36,96],reload:0,cool:0,recoil:0,hurt:0,relays:0};const specs=[{name:'SERVICE PISTOL',cap:12,damage:38,delay:.24,pellets:1,spread:.008},{name:'BREACH SHOTGUN',cap:6,damage:24,delay:.8,pellets:7,spread:.065},{name:'PULSE CARBINE',cap:24,damage:24,delay:.1,pellets:1,spread:.014}];
const music=new Audio('industrial.wav');music.loop=true;music.volume=.42;
function syncMusic(){if(!muted&&state.mode==='playing')music.play().catch(()=>{});else music.pause();}
let hitTimer=0,hitLabel='';
let dragMode=false,lookDrag=false;
let yaw=0,pitch=0,mouseDown=false,muted=false,audio,noticeTime=0,countdown=0;const keys={};camera.position.set(20,1.65,82);
function tone(f,d=.1,kind='square',gain=.045){if(muted)return;try{audio ||= new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=kind;o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,f*.25),audio.currentTime+d);g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+d);}catch{}}
function notify(t){$('notice').textContent=t;noticeTime=3;}
function clearKeys(){for(const k in keys)keys[k]=false;mouseDown=false;lookDrag=false;if(typeof resetPad==='function'){resetPad();lookId=null;}}
function pause(){music.pause();if(state.mode==='playing'||state.mode==='countdown'){state.mode='paused';clearKeys();show('PAUSED','재개하면 3초 후 전투가 이어집니다.','재개');}}
function show(title,desc,button){$('overlay').hidden=false;$('overlay').querySelector('h1').textContent=title;$('description').textContent=desc;$('enter').textContent=button;document.body.classList.add('paused');}
async function enter(){if(document.body.classList.contains('touch-controls')&&['title','paused'].includes(state.mode)){startDragMode();return;}if(dragMode&&state.mode==='paused'){startDragMode();return;}if(state.mode==='dead'||state.mode==='won'){location.reload();return;}try{await renderer.domElement.requestPointerLock();}catch{notify('화면을 클릭해 마우스 조작을 시작해 주세요');}}
// User gesture is required for pointer lock; never capture the pointer on page load.
function startDragMode(){dragMode=true;clearKeys();renderer.domElement.focus();$('overlay').hidden=true;document.body.classList.remove('paused');if(state.mode==='paused'){state.mode='countdown';countdown=3;}else if(state.mode==='title')state.mode='playing';syncMusic();notify(document.body.classList.contains('touch-controls')?'왼쪽 이동 · 화면 드래그 조준 · FIRE 사격':'우클릭 드래그: 시점 · 좌클릭: 사격');}
$('dragMode').onclick=()=>{if(state.mode==='dead'||state.mode==='won')location.reload();else startDragMode();};
$('enter').onclick=enter;renderer.domElement.addEventListener('click',()=>{if(state.mode==='title'||state.mode==='paused')enter();});
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement===renderer.domElement){clearKeys();$('overlay').hidden=true;document.body.classList.remove('paused');if(state.mode==='paused'){state.mode='countdown';countdown=3;}else if(state.mode==='title'){state.mode='playing';syncMusic();tone(220,.2,'sine');}}else pause();});
document.addEventListener('mousemove',e=>{if((document.pointerLockElement!==renderer.domElement&&!(dragMode&&lookDrag))||state.mode!=='playing')return;yaw-=e.movementX*.0024;pitch=T.MathUtils.clamp(pitch-e.movementY*.0024,-1.35,1.35);});
document.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='Escape'&&dragMode){pause();return;}if(e.repeat)return;if(e.code==='KeyM')toggleMute();if(state.mode!=='playing')return;if(e.code==='KeyR')reload();if(['Digit1','Digit2','Digit3'].includes(e.code)){state.weapon=Number(e.code.slice(-1))-1;state.reload=0;tone(150,.05);}if(e.code==='KeyE')interact();});document.addEventListener('keyup',e=>keys[e.code]=false);document.addEventListener('mousedown',e=>{if(e.button===2&&dragMode)lookDrag=true;if(e.button===0&&e.target===renderer.domElement&&state.mode==='playing'&&(document.pointerLockElement===renderer.domElement||dragMode)){mouseDown=true;shoot();}});document.addEventListener('mouseup',()=>{mouseDown=false;lookDrag=false;});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('blur',()=>{clearKeys();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();document.exitPointerLock?.();}});
function toggleMute(){muted=!muted;music.muted=muted;syncMusic();$('mute').textContent=muted?'소리 OFF':'소리 ON';}$('mute').onclick=toggleMute;
$('fullscreen').onclick=()=>{const result=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();result?.catch(()=>notify('전체화면을 사용할 수 없습니다'));};$('back').onclick=()=>{document.exitPointerLock?.();if(parent===window)location.href='../index.html';else parent.postMessage({type:'void-exit'},location.origin);};
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='void-pause'){pause();document.exitPointerLock?.();}});
function walkable(x,z,r=.32){for(const a of [-r,r])for(const b of [-r,r])if(grid[Math.round((z+b)/4)]?.[Math.round((x+a)/4)]!==0)return false;return true;}
function move(o,dx,dz,r=.32){if(walkable(o.x+dx,o.z,r))o.x+=dx;if(walkable(o.x,o.z+dz,r))o.z+=dz;}
function route(from,to){const sx=Math.round(from.x/4),sz=Math.round(from.z/4),tx=Math.round(to.x/4),tz=Math.round(to.z/4),q=[[sx,sz]],seen=new Map([[sx+','+sz,null]]);for(let n=0;n<q.length;n++){const [x,z]=q[n];if(x===tx&&z===tz){const path=[];let p=[x,z];while(p){path.push(p);p=seen.get(p.join(','));}return path.reverse().slice(1);}for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(x+a)+','+(z+b);if(grid[z+b]?.[x+a]===0&&!seen.has(k)){seen.set(k,[x,z]);q.push([x+a,z+b]);}}}return [];}
const ray=new T.Raycaster();function sight(a,b){const d=b.clone().sub(a),length=d.length();ray.set(a,d.normalize());return !ray.intersectObjects(solids,false).some(h=>h.distance<length-.4);}
function particles(p,color){for(let i=0;i<6;i++){const m=box(.055,.055,.055,glow(color),p.x,p.y,p.z);sparks.push({m,v:new T.Vector3((Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4),life:.35});}}
const enemyProjectiles=[], playerTracers=[];
function playerTracer(end){
  const start=muzzle.getWorldPosition(new T.Vector3()),direction=end.clone().sub(start),distance=direction.length();
  if(distance<.05)return;
  const mesh=new T.Mesh(new T.CylinderGeometry(state.weapon===1?.018:.026,state.weapon===1?.018:.026,1,5),new T.MeshBasicMaterial({color:state.weapon===2?0x85f5ff:0xffd59a,transparent:true,opacity:.95,depthWrite:false}));
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.clone().normalize());mesh.position.copy(start);scene.add(mesh);
  playerTracers.push({mesh,start,end:end.clone(),distance,age:0,duration:Math.max(.09,Math.min(.22,distance/120))});
}
function updatePlayerTracers(dt){for(let i=playerTracers.length-1;i>=0;i--){const p=playerTracers[i];p.age+=dt;const t=Math.min(1,p.age/p.duration),tail=Math.max(0,t-.28);p.mesh.position.lerpVectors(p.start,p.end,(t+tail)/2);p.mesh.scale.y=Math.max(.05,(t-tail)*p.distance);if(t>=1){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();playerTracers.splice(i,1);}}}
const shotRay=new T.Raycaster();
function removeProjectile(i){const p=enemyProjectiles[i];scene.remove(p.mesh);p.mesh.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});enemyProjectiles.splice(i,1);}
function fireEnemy(e){
  e.g.updateMatrixWorld(true);const origin=e.charge.getWorldPosition(new T.Vector3());
  const velocity=e.target.clone().sub(origin).normalize().multiplyScalar(e.type===2?30:26);
  const mesh=new T.Group();mesh.position.copy(origin);
  mesh.add(new T.Mesh(new T.SphereGeometry(e.type===2?.19:.13,8,6),glow(0xffab38)));
  const trail=new T.Mesh(new T.CylinderGeometry(.045,.1,.85,6),new T.MeshBasicMaterial({color:0xff4e1a,transparent:true,opacity:.65}));trail.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),velocity.clone().normalize());mesh.add(trail);scene.add(mesh);
  enemyProjectiles.push({mesh,velocity,damage:e.type===2?15:8,life:4,source:e.g.position.clone()});
  particles(origin,0xffb54a);e.swing=.15;tone(180,.16,'sawtooth',.045);
}
function updateEnemyProjectiles(dt){
  if(state.mode!=='playing')return;
  for(let i=enemyProjectiles.length-1;i>=0;i--){const p=enemyProjectiles[i],step=p.velocity.length()*dt,dir=p.velocity.clone().normalize();p.life-=dt;
    shotRay.set(p.mesh.position,dir);shotRay.far=step;
    const wall=shotRay.intersectObjects(solids,false)[0];
    const playerHit=shotRay.ray.intersectSphere(new T.Sphere(camera.position,.55),new T.Vector3());
    const hitDistance=p.mesh.position.distanceTo(camera.position)<=.55?0:playerHit?p.mesh.position.distanceTo(playerHit):Infinity;
    if(hitDistance<=step&&(!wall||hitDistance<wall.distance)){hurt(p.damage,p.source,'원거리 탄환');removeProjectile(i);if(state.mode!=='playing')break;continue;}
    if(wall){particles(wall.point,0xffa354);removeProjectile(i);continue;}
    p.mesh.position.addScaledVector(p.velocity,dt);if(p.life<=0)removeProjectile(i);
  }
}
function updateEnemies(dt){
  for(const e of enemies){
    if(e.hp<=0){e.charge.visible=e.line.visible=false;continue;}
    e.cool-=dt;e.pathTime-=dt;e.flash=Math.max(0,e.flash-dt);e.swing=Math.max(0,e.swing-dt);
    e.g.traverse(o=>{if(o.isMesh){o.material.emissive.copy(e.flash>0?new T.Color(0xffc8a0):o.userData.baseEmissive);o.material.emissiveIntensity=e.flash>0?1.2:o.userData.baseIntensity;}});
    const dist=Math.hypot(e.g.position.x-camera.position.x,e.g.position.z-camera.position.z);
    const from=e.g.position.clone().add(new T.Vector3(0,1.5,0)),visible=sight(from,camera.position);
    e.arm.rotation.x=e.type===0?(e.windup>0?-1.3:e.swing>0?1:0):(e.swing>0?-.25:0);
    if(e.windup>0){
      e.windup=Math.max(0,e.windup-dt);
      if(e.type!==0){e.g.lookAt(e.target.x,0,e.target.z);e.g.updateMatrixWorld(true);e.charge.visible=true;e.charge.scale.setScalar(.7+(1-e.windup/(e.type===2?.38:.28))*1.3);const pos=e.line.geometry.attributes.position;const origin=e.charge.getWorldPosition(new T.Vector3());pos.setXYZ(0,origin.x,origin.y,origin.z);pos.setXYZ(1,e.target.x,e.target.y,e.target.z);pos.needsUpdate=true;e.line.geometry.computeBoundingSphere();e.line.visible=true;}
      if(e.windup===0){e.line.visible=false;e.charge.visible=false;e.swing=.24;e.cool=e.type===0?.65:e.type===2?.95:.7;
        if(e.type===0){tone(90,.12,'sawtooth',.05);if(dist<2.4&&visible)hurt(10,e.g.position,'근접 타격');}
        else fireEnemy(e);
      }
      continue;
    }
    e.charge.visible=e.line.visible=false;for(let i=0;i<e.legs.length;i++)e.legs[i].rotation.x=(dist>(e.type===0?2.1:9)&&e.swing<=0)?Math.sin(state.time*(e.type===0?13:8)+i*Math.PI)*.35:0;if(dist>38)continue;
    e.g.lookAt(camera.position.x,0,camera.position.z);
    if((dist>(e.type===0?2.1:9)||!visible)&&e.swing<=0){
      if(e.pathTime<=0){e.path=route(e.g.position,camera.position);e.pathTime=.7;}
      const next=e.path[0];if(next){const dx=next[0]*4-e.g.position.x,dz=next[1]*4-e.g.position.z,l=Math.hypot(dx,dz);if(l<.5)e.path.shift();else move(e.g.position,dx/l*dt*(e.type===0?4.4:2.2),dz/l*dt*(e.type===0?3.4:1.5),.4);}
    }
    if(visible&&dist<(e.type===0?2.5:24)&&e.cool<=0){e.windup=e.type===0?.24:e.type===2?.38:.28;e.target.copy(camera.position);if(e.type!==0)tone(540,.1,'sine',.025);}
  }
}
function gunNoise(){if(muted)return;try{audio ||= new AudioContext();audio.resume();const length=Math.floor(audio.sampleRate*.13),buffer=audio.createBuffer(1,length,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,3);const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();filter.type='lowpass';filter.frequency.value=state.weapon===1?1300:2200;gain.gain.value=state.weapon===1?.24:.12;source.buffer=buffer;source.connect(filter).connect(gain).connect(audio.destination);source.start();}catch{}}
function reload(){const i=state.weapon,w=specs[i];if(!state.reload&&state.rounds[i]<w.cap&&state.reserve[i]>0){state.reload=[1.2,1.8,1.4][i];notify('장전 중…');tone(120,.08);}}
function shoot(){if(state.cool>0||state.reload>0)return;const i=state.weapon,w=specs[i];if(!state.rounds[i]){reload();return;}state.rounds[i]--;gunNoise();state.cool=w.delay;state.recoil=1;flashLight.intensity=7;muzzle.visible=true;tone(i===1?65:140,i===1?.18:.08,'sawtooth',.07);camera.updateMatrixWorld();scene.updateMatrixWorld(true);const targets=[...solids,...enemies.filter(e=>e.hp>0).map(e=>e.g)];for(let p=0;p<w.pellets;p++){ray.setFromCamera(new T.Vector2((Math.random()-.5)*w.spread,(Math.random()-.5)*w.spread),camera);const hit=ray.intersectObjects(targets,true)[0];playerTracer(hit?hit.point:ray.ray.at(55,new T.Vector3()));if(!hit)continue;const enemy=hit.object.userData.enemy;particles(hit.point,enemy?0xff653e:0xc8c0a0);if(enemy&&enemy.hp>0){enemy.hp-=w.damage;enemy.flash=.16;hitTimer=.16;hitLabel='−'+w.damage;pitch=Math.max(-1.35,pitch-.012);tone(310,.055,'triangle',.085);if(enemy.hp<=0){state.kills++;hitTimer=.5;hitLabel='TARGET ELIMINATED';enemy.g.rotation.z=Math.PI/2;enemy.g.position.y=-.3;tone(80,.18,'triangle');}}}}
function interact(){const r=relays.find(r=>!r.on&&r.g.position.distanceTo(new T.Vector3(camera.position.x,0,camera.position.z))<3);if(r){r.on=true;r.screen.material=green;state.relays++;tone(520,.25,'sine');notify('전력 노드 복구 '+state.relays+' / 3');if(state.relays===3){exit.material=green;notify('탈출구 개방 · 북동쪽 SECURITY 구역으로 이동');}}}
function end(win){music.pause();state.mode=win?'won':'dead';clearKeys();document.exitPointerLock?.();show(win?'EXTRACTED':'SIGNAL LOST',(win?'시설 탈출 성공':'작전 실패')+' · 격파 '+state.kills+'/'+enemies.length+' · '+Math.floor(state.time)+'초','다시 시작');tone(win?440:70,.4,'triangle');}
function hurt(n){state.hp=Math.max(0,state.hp-n);state.hurt=.65;tone(65,.12);if(!state.hp)end(false);}
let previous=performance.now();function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;if(['paused','dead','won'].includes(state.mode))return;if(state.mode==='countdown'){countdown-=dt;$('notice').textContent=String(Math.max(1,Math.ceil(countdown)));if(countdown<=0){state.mode='playing';syncMusic();notify('전투 재개');}}
if(state.mode==='playing'){state.time+=dt;state.cool=Math.max(0,state.cool-dt);state.hurt=Math.max(0,state.hurt-dt);state.recoil=Math.max(0,state.recoil-dt*9);if(state.reload>0){state.reload-=dt;if(state.reload<=0){const i=state.weapon,n=Math.min(specs[i].cap-state.rounds[i],state.reserve[i]);state.rounds[i]+=n;state.reserve[i]-=n;notify('장전 완료');tone(220,.06);}}let x=Number(!!(keys.KeyD||keys.ArrowRight))-Number(!!(keys.KeyA||keys.ArrowLeft)),z=Number(!!(keys.KeyS||keys.ArrowDown))-Number(!!(keys.KeyW||keys.ArrowUp));const len=Math.max(1,Math.hypot(x,z)),speed=(keys.ShiftLeft?9:6.5)*dt;move(camera.position,(x*Math.cos(yaw)+z*Math.sin(yaw))/len*speed,(-x*Math.sin(yaw)+z*Math.cos(yaw))/len*speed);camera.rotation.set(pitch,yaw,0);camera.position.y=1.65+(x||z?Math.sin(state.time*12)*.035:0);if(mouseDown)shoot();
updateEnemies(dt);
updateEnemyProjectiles(dt);
updatePlayerTracers(dt);
for(const p of pickups){if(p.used)continue;p.g.rotation.y+=dt;p.g.position.y=.55+Math.sin(state.time*3)*.1;if(Math.hypot(p.g.position.x-camera.position.x,p.g.position.z-camera.position.z)<1.3){p.used=true;p.g.visible=false;if(p.type==='health'){state.hp=Math.min(100,state.hp+30);notify('의료 팩 +30');}else{state.reserve=state.reserve.map((n,i)=>n+[24,12,36][i]);notify('탄약 보급');}tone(600,.1,'sine');}}
$('prompt').textContent=relays.some(r=>!r.on&&Math.hypot(r.g.position.x-camera.position.x,r.g.position.z-camera.position.z)<3)?'[E] 전력 노드 복구':'';if(state.relays===3&&camera.position.distanceTo(new T.Vector3(108,1.65,13))<3)end(true);noticeTime-=dt;if(noticeTime<=0)$('notice').textContent='';}
for(let i=sparks.length-1;i>=0;i--){const p=sparks[i];if(state.mode==='playing'){p.life-=dt;p.v.y-=dt*8;p.m.position.addScaledVector(p.v,dt);}if(p.life<=0){scene.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();sparks.splice(i,1);}}
gun.position.set(.32+Math.sin(state.time*6)*.006,-.3-(state.reload>0?.22:0),-.6+state.recoil*.22);gun.rotation.x=state.recoil*.16;gun.rotation.z=state.reload>0?-.55:state.recoil*.07;camera.rotation.z=Math.sin(state.time*87)*state.hurt*.018;barrel.scale.x=state.weapon===1?1.6:1;flashLight.intensity*=.65;if(state.recoil<.6)muzzle.visible=false;hitTimer=Math.max(0,hitTimer-dt);$('crosshair').classList.toggle('hit',hitTimer>0);$('crosshair').textContent=hitTimer>0?'×':'+';$('hitText').textContent=hitTimer>0?hitLabel:'';$('damage').style.opacity=state.hurt*.35;$('hp').textContent=state.hp;$('ammo').textContent=state.rounds[state.weapon]+' / '+state.reserve[state.weapon];$('weapon').textContent=state.reload>0?'RELOADING · 장전 중':specs[state.weapon].name;$('reloadProgress').hidden=state.reload<=0;$('reloadBar').style.width=(100*(1-state.reload/[1.2,1.8,1.4][state.weapon]))+'%';$('kills').textContent=state.kills+' / '+enemies.length;$('objective').textContent=state.relays===3?'② 탈출구로 이동':'① 전력 복구 '+state.relays+' / 3';const remaining=relays.filter(r=>!r.on).sort((a,b)=>a.g.position.distanceTo(camera.position)-b.g.position.distanceTo(camera.position));const target=remaining[0]?.g.position || new T.Vector3(108,1.65,13);const bearing=Math.atan2(-(target.x-camera.position.x),-(target.z-camera.position.z));const angle=Math.atan2(Math.sin(bearing-yaw),Math.cos(bearing-yaw));const arrow=Math.abs(angle)<.3?'↑':Math.abs(angle)>2.6?'↶':angle>0?'←':'→';$('waypoint').textContent=arrow+' '+(remaining.length?'전력 노드 '+String.fromCharCode(65+relays.indexOf(remaining[0])):'탈출구')+' · '+Math.round(target.distanceTo(camera.position))+'m'+(target.distanceTo(camera.position)<3?' [E] 작동':'');const map=$('map').getContext('2d');map.fillStyle='#050b10';map.fillRect(0,0,155,125);map.fillStyle='#4d5e69';for(let z=0;z<25;z++)for(let x=0;x<31;x++)if(!grid[z][x])map.fillRect(x*5,z*5,5,5);for(const r of relays){map.fillStyle=r.on?'#78e7a6':'#f7b844';map.fillRect(r.g.position.x/4*5-2,r.g.position.z/4*5-2,4,4);}map.fillStyle='#80e9ee';map.beginPath();map.arc(camera.position.x/4*5,camera.position.z/4*5,2.5,0,Math.PI*2);map.fill();renderer.render(scene,camera);}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});$('loadStatus').textContent='준비 완료 · PC 또는 모바일 터치 조작';requestAnimationFrame(frame);

const touchEnabled=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
document.body.classList.toggle('touch-controls',touchEnabled);
if(touchEnabled)$('overlay').querySelector('.controls').textContent='왼쪽 패드 이동 · 화면 드래그 조준 · FIRE 사격 · 장전 / 작동 / 무기 버튼';
$('touchToggle').onclick=()=>{document.body.classList.toggle('touch-controls');clearKeys();};
let moveId=null,lookId=null,lastTouch={x:0,y:0};const pad=$('fpsPad');
function resetPad(){moveId=null;for(const k of ['KeyW','KeyA','KeyS','KeyD'])keys[k]=false;pad.querySelector('i').style.transform='translate(0,0)';}
function movePad(e){if(e.pointerId!==moveId)return;const r=pad.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width*.32),y=(e.clientY-r.top-r.height/2)/(r.height*.32),l=Math.max(1,Math.hypot(x,y));x/=l;y/=l;keys.KeyA=x<-.2;keys.KeyD=x>.2;keys.KeyW=y<-.2;keys.KeyS=y>.2;pad.querySelector('i').style.transform='translate('+x*28+'px,'+y*28+'px)';}
pad.onpointerdown=e=>{if(moveId!==null)return;e.preventDefault();moveId=e.pointerId;pad.setPointerCapture(moveId);movePad(e);};pad.onpointermove=movePad;for(const t of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(t,e=>{if(e.pointerId===moveId)resetPad();});
renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||state.mode!=='playing'||lookId!==null)return;e.preventDefault();lookId=e.pointerId;lastTouch={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(lookId);});
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==lookId||state.mode!=='playing')return;yaw-=(e.clientX-lastTouch.x)*.005;pitch=T.MathUtils.clamp(pitch-(e.clientY-lastTouch.y)*.005,-1.35,1.35);lastTouch={x:e.clientX,y:e.clientY};});for(const t of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(t,e=>{if(e.pointerId===lookId)lookId=null;});
$('touchFire').onpointerdown=e=>{e.preventDefault();if(state.mode!=='playing')return;e.currentTarget.setPointerCapture(e.pointerId);mouseDown=true;shoot();};for(const t of ['pointerup','pointercancel','lostpointercapture'])$('touchFire').addEventListener(t,()=>mouseDown=false);
$('touchReload').onclick=()=>{if(state.mode==='playing')reload();};$('touchUse').onclick=()=>{if(state.mode==='playing')interact();};$('touchWeapon').onclick=()=>{if(state.mode==='playing'){state.weapon=(state.weapon+1)%3;state.reload=0;}};$('touchPause').onclick=()=>{pause();document.exitPointerLock?.();resetPad();lookId=null;};

$('touchFire').onclick=()=>{if(state.mode==='playing')shoot();};
