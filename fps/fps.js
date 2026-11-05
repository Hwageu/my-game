import * as T from '../vendor/three.module.js';
import * as Art from './art.js?v=20261105-rush';
import * as Stages from './stages.js?v=20261105-rush';
const stageIndex=Math.max(0,Math.min(Stages.STAGES.length-1,Number.parseInt(new URLSearchParams(location.search||'').get('stage')||'0',10)||0));
const stage=Stages.STAGES[stageIndex];
const difficulty=[{melee:5.6,ranged:3,bullet:30,heavyBullet:34,windup:.28,heavyWindup:.38,cool:.78,heavyCool:1.05},{melee:6.4,ranged:3.6,bullet:34,heavyBullet:38,windup:.26,heavyWindup:.35,cool:.68,heavyCool:.9},{melee:7.2,ranged:4.1,bullet:38,heavyBullet:41,windup:.24,heavyWindup:.32,cool:.6,heavyCool:.8}][stageIndex];
const $=id=>document.getElementById(id), scene=new T.Scene();
scene.background=new T.Color(stage.fog);scene.fog=new T.FogExp2(stage.fog,.017);
let renderer;
try{renderer=new T.WebGLRenderer({antialias:false,powerPreference:'high-performance'});}catch(e){$('loadStatus').textContent='WebGL 2를 지원하는 브라우저에서 실행해 주세요.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.domElement.tabIndex=0;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;$('view').appendChild(renderer.domElement);
const camera=new T.PerspectiveCamera(82,innerWidth/innerHeight,.07,130);camera.rotation.order='YXZ';scene.add(camera);
scene.add(new T.HemisphereLight(0x7fa3b8,0x35231c,1.5));scene.add(new T.AmbientLight(0xa3b3bb,.18));const sun=new T.DirectionalLight(0xd3d8ce,1.05);sun.position.set(6,12,4);scene.add(sun);
const grid=Array.from({length:25},()=>Array(31).fill(1)), tile=4, solids=[], enemies=[], pickups=[], relays=[], sparks=[];
function carve(x,z,w,h){for(let j=z;j<z+h;j++)for(let i=x;i<x+w;i++)grid[j][i]=0;}
Stages.buildLayout(stage,carve,grid);
function texture(kind){return Art.surfaceTexture(T,kind,document.createElement('canvas'),stageIndex);}
const metal=new T.MeshStandardMaterial({color:0x43525b,roughness:.7,metalness:.65}),dark=new T.MeshStandardMaterial({color:0x171e25,roughness:.55,metalness:.8}),wallMat=new T.MeshStandardMaterial({map:texture('wall'),roughness:.9}),floorMat=new T.MeshStandardMaterial({map:texture('floor'),roughness:.9});
function box(w,h,d,mat,x,y,z,parent=scene){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;}
function glow(color){return new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2});}
const cyan=glow(0x4ccad0),orange=glow(0xe99741),red=glow(0xef4432),green=glow(0x66df9d);
wallMat.color.setHex(stage.wallColor);
const zoneFloors=[floorMat,floorMat.clone(),floorMat.clone()];zoneFloors[1].color.setHex(0xb3c4cf);zoneFloors[2].color.setHex(0xc9bda4);
for(let z=1;z<24;z++)for(let x=1;x<30;x++){if(!grid[z][x]){box(4,.2,4,zoneFloors[x>19?2:z>16?1:0],x*4,-.1,z*4);box(4,.2,4,metal,x*4,4.6,z*4);if((x+z)%5===0)box(1.7,.04,.3,(stageIndex===1||x>19?orange:cyan),x*4,4.45,z*4);}else if([[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>grid[z+b]?.[x+a]===0)){const wall=box(4,4.6,4,wallMat,x*4,2.2,z*4);solids.push(wall);}}
Art.decorateFacility(T,scene,grid,{dark,metal,cyan,orange,lights:stage.lights});
const stageArt=Art.decorateStage(T,scene,grid,stageIndex,{dark,metal,cyan,orange});
const batches=new Map();for(const m of [...scene.children]){if(!m.isMesh||!m.geometry?.parameters)continue;const p=m.geometry.parameters,key=[m.geometry.type,JSON.stringify(p),m.material.uuid].join('/');if(!batches.has(key))batches.set(key,[]);batches.get(key).push(m);}for(const group of batches.values()){if(group.length<2)continue;const inst=new T.InstancedMesh(group[0].geometry,group[0].material,group.length);group.forEach((m,i)=>{m.updateMatrix();m.updateMatrixWorld(true);inst.setMatrixAt(i,m.matrix);scene.remove(m);});inst.instanceMatrix.needsUpdate=true;scene.add(inst);}
function sign(text,x,z){const c=document.createElement('canvas');c.width=512;c.height=128;const q=c.getContext('2d');q.fillStyle='#17232a';q.fillRect(0,0,512,128);q.fillStyle='#e5bb74';q.font='bold 48px monospace';q.textAlign='center';q.fillText(text,256,78);const mat=new T.MeshBasicMaterial({map:new T.CanvasTexture(c),side:T.DoubleSide});box(3,.75,.03,mat,x,3.3,z);}
for(const text of stage.signs)sign(...text);
const exit=box(3.5,3.8,.3,red,108,1.9,10);solids.push(exit);sign('EXTRACTION',108,10.3);
function addRelay(x,z){const {g,screen}=Art.relayModel(T,{dark,metal,orange,cyan});g.position.set(x,0,z);scene.add(g);relays.push({g,screen,on:false});}
for(const p of stage.relays)addRelay(...p);
function pickup(x,z,type){const g=Art.pickupModel(T,type,{dark,metal,green,orange});g.position.set(x,.5,z);scene.add(g);pickups.push({g,type,used:false});}
for(const p of stage.supplies)pickup(...p);pickup(...stage.secret,'cache');
const hazards=Art.hazardAreas(T,scene,stage.hazards);const visitedCells=new Set();
function addEnemy(x,z,type,role){
  const {g,arm,otherArm,legs,charge}=Art.enemyModel(T,type,{dark,metal});g.position.set(x,0,z);
  const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:0xff9c37,transparent:true,opacity:.55}));line.visible=false;scene.add(line);
  const e={g,arm,otherArm,legs,charge,line,hp:role==='boss'?600:type===2?180:70,isBoss:role==='boss',type,cool:.35,path:[],pathTime:0,flash:0,windup:0,swing:0,target:new T.Vector3(),phase:(x+z)*.13};
  g.traverse(o=>{if(o.isMesh){o.userData.enemy=e;o.material=o.material.clone();o.userData.baseEmissive=o.material.emissive.clone();o.userData.baseIntensity=o.material.emissiveIntensity;}});if(e.isBoss)g.scale.setScalar(1.35);scene.add(g);enemies.push(e);
}
stage.enemies.forEach(a=>addEnemy(...a));
const boss=enemies.find(e=>e.isBoss);
const weaponArt=Art.weaponRig(T,{dark,metal,cyan,orange}),gun=weaponArt.gun;
camera.add(gun);gun.scale.setScalar(.85);gun.position.set(.25,-.27,-.58);let muzzle=weaponArt.muzzles[0];
const flashLight=new T.PointLight(0xffac59,0,8);camera.add(flashLight);flashLight.position.set(.25,-.1,-.8);
const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)').matches;
const casings=[],impactMarks=[];let stepTimer=0,moveBlend=0;
function ejectCasing(){const m=new T.Mesh(new T.CylinderGeometry(.012,.012,.065,6),new T.MeshStandardMaterial({color:0xd7a95b,metalness:.7,roughness:.4}));m.position.copy(camera.localToWorld(new T.Vector3(.36,-.16,-.63)));scene.add(m);casings.push({m,v:new T.Vector3(1.2,1.6,.2).applyQuaternion(camera.quaternion),life:.75});if(casings.length>18){const p=casings.shift();scene.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();}}
function impactMark(hit){if(!hit.face)return;const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);const m=new T.Mesh(new T.CircleGeometry(.09+Math.random()*.04,7),new T.MeshBasicMaterial({color:0x111517,transparent:true,opacity:.65,depthWrite:false}));m.position.copy(hit.point).addScaledVector(normal,.012);m.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);scene.add(m);impactMarks.push(m);if(impactMarks.length>48){const old=impactMarks.shift();scene.remove(old);old.geometry.dispose();old.material.dispose();}}
function updateCasings(dt){for(let i=casings.length-1;i>=0;i--){const p=casings[i];p.life-=dt;p.v.y-=dt*9;p.m.position.addScaledVector(p.v,dt);p.m.rotation.x+=dt*12;p.m.rotation.z+=dt*7;if(p.life<=0){scene.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();casings.splice(i,1);}}}

const state={mode:'title',hp:100,kills:0,time:0,weapon:0,rounds:[12,6,24],reserve:[96,36,96],reload:0,cool:0,recoil:0,hurt:0,relays:0,shots:0,hits:0,secrets:0,hazardCooldown:0,dash:0,dashCooldown:0,dashX:0,dashZ:0,transition:0};const specs=[{name:'SERVICE PISTOL',cap:12,damage:38,delay:.24,pellets:1,spread:.008},{name:'BREACH SHOTGUN',cap:6,damage:24,delay:.8,pellets:7,spread:.065},{name:'PULSE CARBINE',cap:24,damage:24,delay:.1,pellets:1,spread:.014}];
let checkpoint={};try{const saved=JSON.parse(sessionStorage.getItem('voidBreachCheckpoint')||'null');if(saved?.stage===stageIndex)checkpoint=saved;}catch{}
if(checkpoint.rounds?.length===3&&checkpoint.reserve?.length===3){state.hp=Math.max(1,Math.min(100,Number(checkpoint.hp)||100));state.rounds=checkpoint.rounds.map((n,i)=>Math.max(0,Math.min(specs[i].cap,Number(n)||0)));state.reserve=checkpoint.reserve.map(n=>Math.max(0,Math.min(999,Number(n)||0)));}
function stageUrl(index){const url=new URL(location.href);url.searchParams.set('stage',String(index));return url.href;}
function nextStage(){if(stageIndex<Stages.STAGES.length-1){const saved={stage:stageIndex+1,campaign:stageIndex===0||checkpoint.campaign===true,shots:(checkpoint.shots||0)+state.shots,hits:(checkpoint.hits||0)+state.hits,hp:Math.min(100,state.hp+20),rounds:[12,6,24],reserve:state.reserve.map((n,i)=>n+[18,8,24][i]),time:(checkpoint.time||0)+state.time,kills:(checkpoint.kills||0)+state.kills,secrets:(checkpoint.secrets||0)+state.secrets};try{sessionStorage.setItem('voidBreachCheckpoint',JSON.stringify(saved));}catch{}location.href=stageUrl(stageIndex+1);}else {try{sessionStorage.removeItem('voidBreachCheckpoint');}catch{}location.href=stageUrl(0);}}

const music=new Audio('industrial.wav?v=20261105-metal');music.loop=true;music.volume=.38;
function syncMusic(){if(!muted&&state.mode==='playing')music.play().catch(()=>{});else music.pause();}
let hitTimer=0,hitLabel='';
let dragMode=false,lookDrag=false;
let yaw=0,pitch=0,mouseDown=false,muted=false,audio,noticeTime=0,countdown=0;
try{muted=localStorage.getItem('neonArcadeMuted')==='true';}catch{}
function reportMode(){if(parent!==window)parent.postMessage({type:'void-state',mode:state.mode,stage:stageIndex,lastStage:stageIndex===Stages.STAGES.length-1},location.origin);}const keys={};camera.position.set(20,1.65,82);
function tone(f,d=.1,kind='square',gain=.045){if(muted)return;try{audio ||= new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=kind;o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,f*.25),audio.currentTime+d);g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+d);}catch{}}
function notify(t){$('notice').textContent=t;noticeTime=3;}
function clearKeys(){for(const k in keys)keys[k]=false;mouseDown=false;lookDrag=false;if(typeof resetPad==='function'){resetPad();lookId=null;}}
function pause(){music.pause();if(state.mode==='playing'||state.mode==='countdown'){state.mode='paused';clearKeys();show('PAUSED','재개하면 3초 후 전투가 이어집니다.','재개');}}
function show(title,desc,button){$('overlay').hidden=false;$('overlay').querySelector('h1').textContent=title;$('description').textContent=desc;$('enter').textContent=button;document.body.classList.add('paused');$('dragMode').hidden=['won','dead'].includes(state.mode);reportMode();}
async function enter(){if(document.body.classList.contains('touch-controls')&&['title','paused'].includes(state.mode)){startDragMode();return;}if(dragMode&&state.mode==='paused'){startDragMode();return;}if(state.mode==='won'){nextStage();return;}if(state.mode==='dead'){location.reload();return;}try{await renderer.domElement.requestPointerLock();}catch{startDragMode();}}
// User gesture is required for pointer lock; never capture the pointer on page load.
function startDragMode(){dragMode=true;clearKeys();renderer.domElement.focus();$('overlay').hidden=true;document.body.classList.remove('paused');if(state.mode==='paused'){state.mode='countdown';countdown=3;}else if(state.mode==='title')state.mode='playing';syncMusic();reportMode();notify(document.body.classList.contains('touch-controls')?'왼쪽 이동 · 화면 드래그 조준 · FIRE 사격':'우클릭 드래그: 시점 · 좌클릭: 사격');}
$('dragMode').onclick=()=>{if(state.mode==='won')nextStage();else if(state.mode==='dead')location.reload();else startDragMode();};
$('enter').onclick=enter;renderer.domElement.addEventListener('click',()=>{if(state.mode==='title'||state.mode==='paused')enter();});
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement===renderer.domElement){clearKeys();$('overlay').hidden=true;document.body.classList.remove('paused');if(state.mode==='paused'){state.mode='countdown';countdown=3;}else if(state.mode==='title'){state.mode='playing';syncMusic();reportMode();tone(220,.2,'sine');}}else pause();});
document.addEventListener('mousemove',e=>{if((document.pointerLockElement!==renderer.domElement&&!(dragMode&&lookDrag))||state.mode!=='playing')return;yaw-=e.movementX*.0024;pitch=T.MathUtils.clamp(pitch-e.movementY*.0024,-1.35,1.35);});
document.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='Escape'&&dragMode){pause();return;}if(e.repeat)return;if(e.code==='KeyM')toggleMute();if(state.mode!=='playing')return;if(e.code==='Space')dash();if(e.code==='KeyR')reload();if(['Digit1','Digit2','Digit3'].includes(e.code)){state.weapon=Number(e.code.slice(-1))-1;state.reload=0;tone(150,.05);}if(e.code==='KeyE')interact();});document.addEventListener('keyup',e=>keys[e.code]=false);document.addEventListener('mousedown',e=>{if(e.button===2&&dragMode)lookDrag=true;if(e.button===0&&e.target===renderer.domElement&&state.mode==='playing'&&(document.pointerLockElement===renderer.domElement||dragMode)){mouseDown=true;shoot();}});document.addEventListener('mouseup',()=>{mouseDown=false;lookDrag=false;});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('blur',()=>{clearKeys();if(parent===window||!parent.document.hasFocus())pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();document.exitPointerLock?.();}});
function setMuted(value,notifyParent=true){muted=Boolean(value);music.muted=muted;try{localStorage.setItem('neonArcadeMuted',String(muted));}catch{}syncMusic();$('mute').textContent=muted?'소리 OFF':'소리 ON';$('mute').setAttribute('aria-pressed',String(muted));if(notifyParent&&parent!==window)parent.postMessage({type:'void-audio',muted},location.origin);}
function toggleMute(){setMuted(!muted);}$('mute').onclick=toggleMute;
$('fullscreen').onclick=()=>{const result=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();result?.catch(()=>notify('전체화면을 사용할 수 없습니다'));};$('back').onclick=()=>{document.exitPointerLock?.();if(parent===window)location.href='../index.html';else parent.postMessage({type:'void-exit'},location.origin);};
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='void-pause'){pause();document.exitPointerLock?.();}if(e.data?.type==='void-toggle-pause'){if(state.mode==='title')startDragMode();else if(state.mode==='paused')startDragMode();else if(state.mode==='won')nextStage();else if(state.mode==='dead')location.reload();else {pause();document.exitPointerLock?.();}}if(e.data?.type==='arcade-preferences'){setMuted(e.data.muted,false);setTouchControls(e.data.touch);reportMode();}});
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
  const spread=e.isBoss&&origin.distanceTo(e.target)>6?[-.14,0,.14]:[0];
  for(const angle of spread){
    const velocity=e.target.clone().sub(origin).normalize().applyAxisAngle(new T.Vector3(0,1,0),angle).multiplyScalar(e.isBoss?42:e.type===2?difficulty.heavyBullet:difficulty.bullet);
    const mesh=new T.Group();mesh.position.copy(origin);mesh.add(new T.Mesh(new T.SphereGeometry(e.type===2?.19:.13,8,6),glow(e.isBoss?0xff7051:0xffab38)));
    const trail=new T.Mesh(new T.CylinderGeometry(.045,.1,.85,6),new T.MeshBasicMaterial({color:e.isBoss?0xff4c48:0xff4e1a,transparent:true,opacity:.65}));trail.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),velocity.clone().normalize());mesh.add(trail);scene.add(mesh);
    enemyProjectiles.push({mesh,velocity,damage:e.isBoss?18:e.type===2?15:8,life:4,source:e.g.position.clone()});
  }
  particles(origin,0xffb54a);e.swing=.15;tone(e.isBoss?100:180,.16,'sawtooth',.045);
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
    if(state.mode!=='playing')return;
    if(e.hp<=0){e.charge.visible=e.line.visible=false;if(e.deadTime>0){e.deadTime=Math.max(0,e.deadTime-dt);e.g.rotation.z=T.MathUtils.damp(e.g.rotation.z,Math.PI/2,10,dt);e.g.position.y=T.MathUtils.damp(e.g.position.y,-.3,10,dt);}continue;}
    e.cool-=dt;e.pathTime-=dt;e.flash=Math.max(0,e.flash-dt);e.swing=Math.max(0,e.swing-dt);
    e.g.traverse(o=>{if(o.isMesh){o.material.emissive.copy(e.flash>0?new T.Color(0xff8e4d):o.userData.baseEmissive);o.material.emissiveIntensity=e.flash>0?.65:o.userData.baseIntensity;}});
    const dist=Math.hypot(e.g.position.x-camera.position.x,e.g.position.z-camera.position.z);
    const from=e.g.position.clone().add(new T.Vector3(0,1.5,0)),visible=sight(from,camera.position);
    e.arm.rotation.x=e.type===0?(e.windup>0?-1.3:e.swing>0?1:0):(e.swing>0?-.25:0);e.otherArm.rotation.x=e.type===0?e.arm.rotation.x*.72:Math.sin(state.time*3+e.phase)*.04;
    if(e.windup>0){
      e.windup=Math.max(0,e.windup-dt);
      if(e.type!==0){e.g.lookAt(e.target.x,0,e.target.z);e.g.updateMatrixWorld(true);e.charge.visible=true;e.charge.scale.setScalar(.7+(1-e.windup/(e.type===2?difficulty.heavyWindup:difficulty.windup))*1.3);const pos=e.line.geometry.attributes.position;const origin=e.charge.getWorldPosition(new T.Vector3());pos.setXYZ(0,origin.x,origin.y,origin.z);pos.setXYZ(1,e.target.x,e.target.y,e.target.z);pos.needsUpdate=true;e.line.geometry.computeBoundingSphere();e.line.visible=true;}
      if(e.windup===0){e.line.visible=false;e.charge.visible=false;e.swing=.24;e.cool=e.isBoss?.6:e.type===0?.6:e.type===2?difficulty.heavyCool:difficulty.cool;
        if(e.type===0){tone(90,.12,'sawtooth',.05);if(dist<2.4&&visible)hurt(10,e.g.position,'근접 타격');}
        else fireEnemy(e);
      }
      continue;
    }
    e.charge.visible=e.line.visible=false;for(let i=0;i<e.legs.length;i++)e.legs[i].rotation.x=(dist>(e.type===0?2.1:9)&&e.swing<=0)?Math.sin(state.time*(e.type===0?13:8)+i*Math.PI)*.35:0;if(dist>38)continue;
    e.g.lookAt(camera.position.x,0,camera.position.z);
    if((dist>(e.type===0?2.1:9)||!visible)&&e.swing<=0){
      if(e.pathTime<=0){e.path=route(e.g.position,camera.position);e.pathTime=.7;}
      const next=e.path[0];if(next){const dx=next[0]*4-e.g.position.x,dz=next[1]*4-e.g.position.z,l=Math.hypot(dx,dz);if(l<.5)e.path.shift();else move(e.g.position,dx/l*dt*(e.type===0?difficulty.melee:difficulty.ranged),dz/l*dt*(e.type===0?difficulty.melee:difficulty.ranged),.4);}
    }
    if(e.type!==0&&visible&&dist>=5&&dist<16&&e.swing<=0){const side=Math.sin(state.time*.9+e.phase)>0?1:-1;const vx=camera.position.x-e.g.position.x,vz=camera.position.z-e.g.position.z;move(e.g.position,-vz/dist*side*dt*(1.2+stageIndex*.3),vx/dist*side*dt*(1.2+stageIndex*.3),.4);}
    if(visible&&dist<(e.type===0?2.5:24)&&e.cool<=0){e.windup=e.type===0?.24:e.type===2?difficulty.heavyWindup:difficulty.windup;e.target.copy(camera.position);if(e.type!==0)tone(540,.1,'sine',.025);}
  }
}
function gunNoise(){if(muted)return;try{audio ||= new AudioContext();audio.resume();const length=Math.floor(audio.sampleRate*.13),buffer=audio.createBuffer(1,length,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,3);const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();filter.type='lowpass';filter.frequency.value=state.weapon===1?1300:2200;gain.gain.value=state.weapon===1?.24:.12;source.buffer=buffer;source.connect(filter).connect(gain).connect(audio.destination);source.start();}catch{}}
function movePlayer(dt,x,z){const len=Math.max(1,Math.hypot(x,z)),sprint=keys.ShiftLeft||keys.ShiftRight,speed=sprint?12:8.5,dashStep=Math.min(state.dash,dt);state.dashCooldown=Math.max(0,state.dashCooldown-dt);state.dash=Math.max(0,state.dash-dt);if(dashStep>0)move(camera.position,state.dashX*23*dashStep,state.dashZ*23*dashStep);const rest=dt-dashStep;if(rest>0)move(camera.position,(x*Math.cos(yaw)+z*Math.sin(yaw))/len*speed*rest,(-x*Math.sin(yaw)+z*Math.cos(yaw))/len*speed*rest);if(!reducedMotion){const fov=state.dash>0?96:sprint&&(x||z)?89:82;camera.fov=T.MathUtils.damp(camera.fov,fov,9,dt);camera.updateProjectionMatrix();}}
function dash(){if(state.mode!=='playing'||state.dashCooldown>0)return;let x=Number(!!(keys.KeyD||keys.ArrowRight))-Number(!!(keys.KeyA||keys.ArrowLeft)),z=Number(!!(keys.KeyS||keys.ArrowDown))-Number(!!(keys.KeyW||keys.ArrowUp));if(!x&&!z)z=-1;const l=Math.hypot(x,z);state.dashX=(x*Math.cos(yaw)+z*Math.sin(yaw))/l;state.dashZ=(-x*Math.sin(yaw)+z*Math.cos(yaw))/l;state.dash=.18;state.dashCooldown=1.15;tone(180,.15,'sawtooth',.025);}
function reload(){const i=state.weapon,w=specs[i];if(!state.reload&&state.rounds[i]<w.cap&&state.reserve[i]>0){state.reload=[1.2,1.8,1.4][i];notify('장전 중…');tone(120,.08);}}
function shoot(){if(state.mode!=='playing'||state.cool>0||state.reload>0)return;const i=state.weapon,w=specs[i];if(!state.rounds[i]){reload();return;}state.rounds[i]--;state.shots++;let connected=false;muzzle=weaponArt.muzzles[i];weaponArt.models.forEach((m,n)=>m.visible=n===i);gunNoise();ejectCasing();pitch=Math.max(-1.35,pitch-[.022,.045,.013][i]);state.cool=w.delay;state.recoil=1;flashLight.intensity=7;muzzle.visible=true;tone(i===1?65:140,i===1?.18:.08,'sawtooth',.07);camera.updateMatrixWorld();scene.updateMatrixWorld(true);const targets=[...solids,...enemies.filter(e=>e.hp>0).map(e=>e.g)];for(let p=0;p<w.pellets;p++){ray.setFromCamera(new T.Vector2((Math.random()-.5)*w.spread,(Math.random()-.5)*w.spread),camera);const hit=ray.intersectObjects(targets,true)[0];playerTracer(hit?hit.point:ray.ray.at(55,new T.Vector3()));if(!hit)continue;const enemy=hit.object.userData.enemy;if(!enemy)impactMark(hit);particles(hit.point,enemy?0xff653e:0xc8c0a0);if(enemy&&enemy.hp>0){if(!connected){state.hits++;connected=true;}enemy.hp-=w.damage;enemy.flash=.16;hitTimer=.16;hitLabel='−'+w.damage;tone(310,.055,'triangle',.085);if(enemy.hp<=0){state.kills++;if(enemy.g.position.distanceTo(camera.position)<8){state.hp=Math.min(100,state.hp+8);notify('CLOSE KILL · 체력 +8');}if(state.kills%3===0)pickup(enemy.g.position.x,enemy.g.position.z,state.kills%6===0?'health':'ammo');hitTimer=.5;hitLabel='TARGET ELIMINATED';enemy.deadTime=.45;tone(80,.18,'triangle');}}}}
function interact(){const r=relays.find(r=>!r.on&&r.g.position.distanceTo(new T.Vector3(camera.position.x,0,camera.position.z))<3);if(r){r.on=true;r.screen.material=green;state.relays++;tone(520,.25,'sine');notify(stage.objective+' 가동 '+state.relays+' / 3');if(state.relays===3){if(!boss||boss.hp<=0){exit.material=green;notify('탈출구 개방 · 북동쪽 탈출구로 이동');}else notify('장치 가동 완료 · 중앙 수호기를 제압하세요');}}}
function end(win){$('hp').textContent=state.hp;music.pause();state.mode=win?'won':'dead';clearKeys();document.exitPointerLock?.();const totalShots=(checkpoint.shots||0)+state.shots,totalHits=(checkpoint.hits||0)+state.hits;const accuracy=totalShots?Math.round(totalHits/totalShots*100):0;const totalTime=Math.floor((checkpoint.time||0)+state.time);const final=stageIndex===Stages.STAGES.length-1;
if(win&&!final)state.transition=3;
show(win?(final?'EXTRACTED':'SECTOR CLEAR'):'SIGNAL LOST',(win?(final&&checkpoint.campaign?'작전 완료':'구역 통과'):'작전 실패')+' · 격파 '+state.kills+'/'+enemies.length+' · 보급고 '+state.secrets+'/1 · '+Math.floor(state.time)+'초 · 명중률 '+accuracy+'%'+(win&&final&&checkpoint.campaign?' · 전체 격파 '+((checkpoint.kills||0)+state.kills)+'/35 · 보급고 '+((checkpoint.secrets||0)+state.secrets)+'/3 · 총 '+totalTime+'초':''),win?(final?'처음부터 다시':'다음 구역으로'):'다시 시작');tone(win?440:70,.4,'triangle');}

function hurt(n){state.hp=Math.max(0,state.hp-n);state.hurt=.65;tone(65,.12);if(!state.hp)end(false);}
let previous=performance.now();function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;if(state.mode==='won'){if(state.transition>0){state.transition-=dt;$('enter').textContent='다음 구역으로 · '+Math.max(1,Math.ceil(state.transition));if(state.transition<=0)nextStage();}return;}if(['paused','dead'].includes(state.mode))return;if(state.mode==='countdown'){countdown-=dt;$('notice').textContent=String(Math.max(1,Math.ceil(countdown)));if(countdown<=0){state.mode='playing';syncMusic();reportMode();notify('전투 재개');}}
if(state.mode==='playing'){state.time+=dt;Art.animateStage(stageArt,state.time,dt);state.cool=Math.max(0,state.cool-dt);state.hurt=Math.max(0,state.hurt-dt);state.recoil=Math.max(0,state.recoil-dt*9);if(state.reload>0){state.reload-=dt;if(state.reload<=0){const i=state.weapon,n=Math.min(specs[i].cap-state.rounds[i],state.reserve[i]);state.rounds[i]+=n;state.reserve[i]-=n;notify('장전 완료');tone(220,.06);}}let x=Number(!!(keys.KeyD||keys.ArrowRight))-Number(!!(keys.KeyA||keys.ArrowLeft)),z=Number(!!(keys.KeyS||keys.ArrowDown))-Number(!!(keys.KeyW||keys.ArrowUp));movePlayer(dt,x,z);camera.rotation.set(pitch,yaw,0);moveBlend=T.MathUtils.damp(moveBlend,x||z?1:0,8,dt);camera.position.y=1.65+(reducedMotion?0:Math.sin(state.time*12)*.025*moveBlend);stepTimer-=dt;if((x||z)&&stepTimer<=0){stepTimer=keys.ShiftLeft?.28:.42;tone(72+Math.random()*10,.055,'triangle',.015);}if(mouseDown)shoot();
updateEnemies(dt);
if(state.mode!=='playing')return;
updateEnemyProjectiles(dt);
if(state.mode!=='playing')return;
updatePlayerTracers(dt);updateCasings(dt);
state.hazardCooldown=Math.max(0,state.hazardCooldown-dt);for(const h of hazards)h.material.uniforms.uTime.value=state.time;
if(state.hazardCooldown<=0&&stage.hazards.some(h=>camera.position.x>=h.x&&camera.position.x<=h.x+h.w&&camera.position.z>=h.z&&camera.position.z<=h.z+h.d)){state.hazardCooldown=.7;hurt(12);if(state.mode!=='playing')return;}
for(const p of pickups){if(p.used||(p.type==='health'&&state.hp>=100))continue;p.g.rotation.y+=dt;p.g.position.y=.55+Math.sin(state.time*3)*.1;if(Math.hypot(p.g.position.x-camera.position.x,p.g.position.z-camera.position.z)<1.3){p.used=true;p.g.visible=false;if(p.type==='cache'){state.secrets++;state.hp=Math.min(100,state.hp+20);state.reserve=state.reserve.map((n,i)=>n+[24,12,36][i]);notify('숨겨진 보급고 발견 · 체력과 탄약 보급');}else if(p.type==='health'){state.hp=Math.min(100,state.hp+30);notify('의료 팩 +30');}else{state.reserve=state.reserve.map((n,i)=>n+[24,12,36][i]);notify('탄약 보급');}tone(600,.1,'sine');}}
$('prompt').textContent=relays.some(r=>!r.on&&Math.hypot(r.g.position.x-camera.position.x,r.g.position.z-camera.position.z)<3)?'[E] '+stage.objective+' 작동':'';if(state.relays===3&&(!boss||boss.hp<=0)&&camera.position.distanceTo(new T.Vector3(108,1.65,13))<3)end(true);noticeTime-=dt;if(noticeTime<=0)$('notice').textContent='';}
for(let i=sparks.length-1;i>=0;i--){const p=sparks[i];if(state.mode==='playing'){p.life-=dt;p.v.y-=dt*8;p.m.position.addScaledVector(p.v,dt);}if(p.life<=0){scene.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();sparks.splice(i,1);}}
weaponArt.models.forEach((m,i)=>m.visible=i===state.weapon);muzzle=weaponArt.muzzles[state.weapon];
gun.position.set(.25+(reducedMotion?0:Math.sin(state.time*6)*.014*moveBlend),-.27-(state.reload>0?.23:0)+(reducedMotion?0:Math.cos(state.time*12)*.009*moveBlend),-.58+state.recoil*[.09,.17,.07][state.weapon]);
gun.rotation.x=state.recoil*[.13,.21,.07][state.weapon];gun.rotation.z=state.reload>0?-.48:state.recoil*.035;
if(weaponArt.pumps[1])weaponArt.pumps[1].position.z=-.49+state.recoil*.12;
camera.rotation.z=reducedMotion?0:Math.sin(state.time*67)*state.hurt*.009;flashLight.intensity*=.6;
for(const flash of weaponArt.muzzles)if(state.recoil<.6)flash.visible=false;
$('dashStatus').textContent=state.dashCooldown>0?'DASH · '+state.dashCooldown.toFixed(1)+'s':'DASH READY · SPACE';$('dashStatus').dataset.ready=String(state.dashCooldown<=0);$('touchDash').disabled=state.dashCooldown>0;
$('healthFill').style.width=state.hp+'%';$('healthFill').dataset.low=String(state.hp<=30);$('ammoFill').style.width=(state.rounds[state.weapon]/specs[state.weapon].cap*100)+'%';$('runTime').textContent=Math.floor(state.time/60)+':'+String(Math.floor(state.time%60)).padStart(2,'0');
document.querySelectorAll('[data-weapon]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.weapon)===state.weapon)));
hitTimer=Math.max(0,hitTimer-dt);$('crosshair').classList.toggle('hit',hitTimer>0);$('crosshair').textContent='';$('crosshair').style.setProperty('--reticle-scale',String(1+state.recoil*.45));$('hitText').textContent=hitTimer>0?hitLabel:'';$('damage').style.opacity=state.hurt*.35;$('hp').textContent=state.hp;$('ammo').textContent=state.rounds[state.weapon]+' / '+state.reserve[state.weapon];$('weapon').textContent=state.reload>0?'RELOADING · 장전 중':specs[state.weapon].name;$('reloadProgress').hidden=state.reload<=0;$('reloadBar').style.width=(100*(1-state.reload/[1.2,1.8,1.4][state.weapon]))+'%';$('kills').textContent=state.kills+' / '+enemies.length;$('objective').textContent=state.relays===3?(boss&&boss.hp>0?'수호기 제압 후 탈출':'탈출구로 이동'):stage.objective+' '+state.relays+' / 3';if(state.relays===3&&(!boss||boss.hp<=0))exit.material=green;$('bossBar').hidden=!boss||boss.hp<=0||state.mode==='title';if(boss)$('bossFill').style.width=Math.max(0,boss.hp/600*100)+'%';const remaining=relays.filter(r=>!r.on).sort((a,b)=>a.g.position.distanceTo(camera.position)-b.g.position.distanceTo(camera.position));const target=remaining[0]?.g.position || (boss&&boss.hp>0?boss.g.position:new T.Vector3(108,1.65,13));const bearing=Math.atan2(-(target.x-camera.position.x),-(target.z-camera.position.z));const angle=Math.atan2(Math.sin(bearing-yaw),Math.cos(bearing-yaw));const arrow=Math.abs(angle)<.3?'↑':Math.abs(angle)>2.6?'↶':angle>0?'←':'→';$('waypoint').textContent=arrow+' '+(remaining.length?stage.objective+' '+String.fromCharCode(65+relays.indexOf(remaining[0])):boss&&boss.hp>0?'중앙 수호기':'탈출구')+' · '+Math.round(target.distanceTo(camera.position))+'m'+(target.distanceTo(camera.position)<3?' [E] 작동':'');const map=$('map').getContext('2d');map.fillStyle='#050b10';map.fillRect(0,0,155,125);const cx=Math.round(camera.position.x/4),cz=Math.round(camera.position.z/4);for(let z=cz-3;z<=cz+3;z++)for(let x=cx-3;x<=cx+3;x++)visitedCells.add(x+','+z);for(let z=0;z<25;z++)for(let x=0;x<31;x++)if(!grid[z][x]){map.fillStyle=visitedCells.has(x+','+z)?'#617782':'#1b2a34';map.fillRect(x*5,z*5,5,5);}for(const r of relays){map.fillStyle=r.on?'#78e7a6':'#f7b844';map.fillRect(r.g.position.x/4*5-2,r.g.position.z/4*5-2,4,4);}map.fillStyle='#80e9ee';map.beginPath();map.arc(camera.position.x/4*5,camera.position.z/4*5,2.5,0,Math.PI*2);map.fill();renderer.render(scene,camera);}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});$('loadStatus').textContent='준비 완료 · PC 또는 모바일 터치 조작';requestAnimationFrame(frame);

const touchEnabled=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
function setTouchControls(enabled){document.body.classList.toggle('touch-controls',Boolean(enabled));$('touchToggle').setAttribute('aria-pressed',String(Boolean(enabled)));$('overlay').querySelector('.controls').textContent=enabled?'왼쪽 이동 · 화면 드래그 조준 · FIRE 사격 · 돌진 / 장전 / 작동 / 무기':'WASD 이동 · 마우스 조준 / 클릭 사격 · Shift 달리기 · Space 돌진 · R 장전 · 1/2/3 무기 · E 작동 · Esc 일시정지';clearKeys();}
$('touchToggle').onclick=()=>setTouchControls(!document.body.classList.contains('touch-controls'));
let moveId=null,lookId=null,lastTouch={x:0,y:0};const pad=$('fpsPad');
function resetPad(){moveId=null;for(const k of ['KeyW','KeyA','KeyS','KeyD'])keys[k]=false;pad.querySelector('i').style.transform='translate(0,0)';}
function movePad(e){if(e.pointerId!==moveId)return;const r=pad.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width*.32),y=(e.clientY-r.top-r.height/2)/(r.height*.32),l=Math.max(1,Math.hypot(x,y));x/=l;y/=l;keys.KeyA=x<-.2;keys.KeyD=x>.2;keys.KeyW=y<-.2;keys.KeyS=y>.2;pad.querySelector('i').style.transform='translate('+x*28+'px,'+y*28+'px)';}
pad.onpointerdown=e=>{if(moveId!==null)return;e.preventDefault();moveId=e.pointerId;pad.setPointerCapture(moveId);movePad(e);};pad.onpointermove=movePad;for(const t of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(t,e=>{if(e.pointerId===moveId)resetPad();});
renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||state.mode!=='playing'||lookId!==null)return;e.preventDefault();lookId=e.pointerId;lastTouch={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(lookId);});
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==lookId||state.mode!=='playing')return;yaw-=(e.clientX-lastTouch.x)*.005;pitch=T.MathUtils.clamp(pitch-(e.clientY-lastTouch.y)*.005,-1.35,1.35);lastTouch={x:e.clientX,y:e.clientY};});for(const t of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(t,e=>{if(e.pointerId===lookId)lookId=null;});
$('touchFire').onpointerdown=e=>{e.preventDefault();if(state.mode!=='playing')return;e.currentTarget.setPointerCapture(e.pointerId);mouseDown=true;shoot();};for(const t of ['pointerup','pointercancel','lostpointercapture'])$('touchFire').addEventListener(t,()=>mouseDown=false);
$('touchDash').onclick=dash;
$('touchReload').onclick=()=>{if(state.mode==='playing')reload();};$('touchUse').onclick=()=>{if(state.mode==='playing')interact();};$('touchWeapon').onclick=()=>{if(state.mode==='playing'){state.weapon=(state.weapon+1)%3;state.reload=0;}};$('touchPause').onclick=()=>{pause();document.exitPointerLock?.();resetPad();lookId=null;};

$('touchFire').onclick=()=>{if(state.mode==='playing')shoot();};

setTouchControls(touchEnabled);setMuted(muted,false);reportMode();

for(const button of document.querySelectorAll('[data-weapon]'))button.addEventListener('click',()=>{if(state.mode==='playing'){state.weapon=Number(button.dataset.weapon);state.reload=0;tone(150,.05);}});

$('stageName').textContent=(stageIndex+1)+' / '+Stages.STAGES.length+' · '+stage.name;$('stageBadge').textContent=stage.label;$('description').textContent=stage.brief;
