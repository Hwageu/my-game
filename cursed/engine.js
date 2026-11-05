// Pure combat simulation. Rendering, storage and input live in game.js.
export const STAGES=[
  {name:'성 밖 묘지',subtitle:'잊힌 자들이 활을 든다',types:['skeleton','wolf'],floor:'#303b36',stone:'#626e64',accent:'#b5c599',sky:'#132126'},
  {name:'불타는 예배당',subtitle:'불꽃을 받아 저주를 되돌려라',types:['wraith','executioner','skeleton'],floor:'#40302d',stone:'#806455',accent:'#e4aa68',sky:'#29191e'},
  {name:'무너진 왕좌',subtitle:'마지막 왕의 검을 꺾어라',types:['gargoyle','executioner','wraith'],floor:'#343245',stone:'#6c6681',accent:'#c9b5e0',sky:'#1a172a'}
];
export const UPGRADES={
  pierce:{name:'꿰뚫는 반격',desc:'반사탄이 적을 한 번 더 관통합니다.',max:2},
  blast:{name:'저주의 파문',desc:'정확한 반사탄이 적중하면 주변에도 피해를 줍니다.',max:2},
  heal:{name:'생명의 맹세',desc:'정확한 패링 3회마다 체력을 1 회복합니다.',max:1},
  reach:{name:'긴 그림자',desc:'검의 범위가 넓어지고 피해가 증가합니다.',max:2},
  window:{name:'흔들림 없는 손',desc:'일반 패링의 유지 시간이 조금 늘어납니다.',max:2},
  vitality:{name:'남은 불씨',desc:'최대 체력과 현재 체력이 1 증가합니다.',max:2}
};
const stats={skeleton:[2,54,13],wolf:[3,90,15],wraith:[3,55,16],executioner:[6,58,23],gargoyle:[4,82,19],king:[64,64,30]};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
export class Game{
  constructor(w=960,h=600,random=Math.random){this.w=w;this.h=h;this.random=random;this.events=[];this.serial=0;this.mode='title';this.stage=0;this.wave=0;this.player={x:w/2,y:h/2+10,r:13,hp:5,maxHp:5,angle:-Math.PI/2,parry:0,parryAge:0,parryCooldown:0,slash:0,slashCooldown:0,invuln:0};this.enemies=[];this.shots=[];this.fields=[];this.loot=[];this.upgrades={};this.time=0;this.score=0;this.kills=0;this.parries=0;this.perfects=0;this.combo=0;this.comboTime=0;this.hitStop=0;this.slow=0;this.flash=0;this.hurtFlash=0;this.countdown=0;this.stageTime=0;this.makeArena();}
  emit(type,extra={}){this.events.push({type,...extra});if(this.events.length>100)this.events.shift();}
  makeArena(){const w=this.w,h=this.h;this.bounds={x:48,y:80,w:w-96,h:h-140};const spots=this.stage===0?[[.23,.29,40,26],[.75,.29,40,26],[.2,.68,38,28],[.78,.68,38,28]]:this.stage===1?[[.25,.32,90,22],[.75,.32,90,22],[.25,.65,90,22],[.75,.65,90,22]]:[[.25,.32,34,34],[.75,.32,34,34],[.25,.68,34,34],[.75,.68,34,34]];this.obstacles=spots.map(([x,y,a,b])=>({x:w*x-a/2,y:80+(h-140)*y-b/2,w:a,h:b}));}
  start(){this.mode='playing';this.loadStage(0);this.emit('start');}
  loadStage(index){this.stage=index;this.wave=0;this.stageTime=0;this.makeArena();this.player.x=this.w/2;this.player.y=this.bounds.y+this.bounds.h/2;this.player.invuln=1.5;this.player.parry=this.player.slash=0;this.shots=[];this.fields=[];this.loot=[];this.spawnWave();this.emit('stage',{index});}
  resize(w,h){const sx=w/this.w,sy=h/this.h;for(const o of [this.player,...this.enemies,...this.shots,...this.loot]){o.x*=sx;o.y*=sy;}this.w=w;this.h=h;this.makeArena();for(const o of [this.player,...this.enemies]){if(!this.free(o.x,o.y,o.r)){const p=this.safeSpot(o.x,o.y,o.r);o.x=p.x;o.y=p.y;}}this.shots=[];this.fields=[];this.player.x=w/2;this.player.y=this.bounds.y+this.bounds.h/2;}
  free(x,y,r=13){const b=this.bounds;return x-r>b.x&&x+r<b.x+b.w&&y-r>b.y&&y+r<b.y+b.h&&!this.obstacles.some(o=>x+r>o.x&&x-r<o.x+o.w&&y+r>o.y&&y-r<o.y+o.h);}
  lineClear(a,b){const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/6);for(let i=1;i<=n;i++)if(!this.free(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,1))return false;return true;}
  route(from,to){const size=24,b=this.bounds,cols=Math.floor(b.w/size),rows=Math.floor(b.h/size),point=i=>({x:b.x+12+i%cols*size,y:b.y+12+Math.floor(i/cols)*size}),valid=i=>{const p=point(i);return this.free(p.x,p.y,from.r);};
    const closest=o=>{let best=-1,d=Infinity;for(let i=0;i<cols*rows;i++){const p=point(i),n=(p.x-o.x)**2+(p.y-o.y)**2;if(n<d&&valid(i)){best=i;d=n;}}return best;};
    const start=closest(from),end=closest(to);if(start<0||end<0)return[];const parents=new Int32Array(cols*rows).fill(-1),queue=[start];parents[start]=start;
    for(let head=0;head<queue.length&&parents[end]<0;head++){const i=queue[head],x=i%cols,y=Math.floor(i/cols);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*cols+nx;if(nx<0||nx>=cols||ny<0||ny>=rows||parents[n]>=0||!valid(n))continue;parents[n]=i;queue.push(n);}}
    if(parents[end]<0)return[];const path=[];let i=end;while(i!==start){path.unshift(point(i));i=parents[i];}return path;
  }
  safeSpot(x,y,r=15){if(this.free(x,y,r))return{x,y};for(let d=20;d<Math.max(this.w,this.h);d+=20)for(let i=0;i<16;i++){const a=i*Math.PI/8,nx=x+Math.cos(a)*d,ny=y+Math.sin(a)*d;if(this.free(nx,ny,r))return{x:nx,y:ny};}return{x:this.w/2,y:this.h/2};}
  move(o,dx,dy){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/7));for(let i=0;i<steps;i++){if(this.free(o.x+dx/steps,o.y,o.r))o.x+=dx/steps;if(this.free(o.x,o.y+dy/steps,o.r))o.y+=dy/steps;}}
  addEnemy(type,x,y){const [hp,speed,r]=stats[type],spot=this.safeSpot(x,y,r);const e={id:++this.serial,type,...spot,r,hp,maxHp:hp,speed,angle:0,cool:1.5+this.enemies.length*.28,windup:0,stun:0,flash:0,spawn:.6+this.enemies.length*.22,phase:this.random()*6,knock:0,hitIds:new Set(),dead:0,attack:0};this.enemies.push(e);return e;}
  spawnWave(){this.enemies=[];this.shots=[];this.fields=[];this.attackGap=0;const count=this.stage===0&&this.wave===0?2:3+this.stage*2+this.wave;
    if(this.stage===2&&this.wave===2){this.addEnemy('king',this.w/2,140);this.addEnemy('gargoyle',this.w*.2,this.h*.35);this.addEnemy('gargoyle',this.w*.8,this.h*.35);}
    else for(let i=0;i<count;i++){const angle=-Math.PI/2+i*Math.PI*2/count;this.addEnemy(STAGES[this.stage].types[i%STAGES[this.stage].types.length],this.w/2+Math.cos(angle)*(this.w*.34),this.h/2+Math.sin(angle)*(this.h*.3));}
    this.emit('wave',{wave:this.wave+1});
  }
  pause(){if(['playing','countdown'].includes(this.mode)){this.mode='paused';this.emit('pause');}}
  resume(){if(this.mode==='paused'){this.mode='countdown';this.countdown=3;this.emit('resume');}}
  parry(){const p=this.player;if(this.mode!=='playing'||p.parryCooldown>0)return false;p.parry=.26+(this.upgrades.window||0)*.035;p.parryAge=0;p.parryCooldown=.52;this.emit('parryStart',{x:p.x,y:p.y});return true;}
  facing(angle,half=1.14){return Math.cos(angle-this.player.angle)>=Math.cos(half);}
  canParry(angle){return this.player.parry>0&&this.facing(angle);}
  slash(){const p=this.player;if(this.mode!=='playing'||p.slashCooldown>0)return false;p.slash=.17;p.slashCooldown=.3;const reach=70+(this.upgrades.reach||0)*10;
    for(const e of this.enemies){if(e.hp<=0||e.spawn>0||dist(e,p)>reach+e.r)continue;const da=Math.atan2(Math.sin(Math.atan2(e.y-p.y,e.x-p.x)-p.angle),Math.cos(Math.atan2(e.y-p.y,e.x-p.x)-p.angle));if(Math.abs(da)<1.15&&this.lineClear(p,e))this.damageEnemy(e,(e.stun>0?2:1)+(this.upgrades.reach||0)*.5);}
    this.emit('slash',{x:p.x,y:p.y});return true;
  }
  success(e){const p=this.player,perfect=p.parryAge<=.08;this.parries++;this.combo++;this.comboTime=3;this.score+=perfect?60:25;p.parryCooldown=perfect?0:.12;p.invuln=Math.max(p.invuln,.10);this.hitStop=perfect?.035:.015;this.slow=perfect?.1:0;this.flash=perfect?.16:.08;
    if(perfect){this.perfects++;if(this.upgrades.heal&&this.perfects%3===0)p.hp=Math.min(p.maxHp,p.hp+1);}this.emit(perfect?'perfect':'parry',{x:p.x,y:p.y,combo:this.combo});return perfect;
  }
  damageEnemy(e,n){if(e.hp<=0)return;e.hp-=n;e.flash=.12;this.emit('hit',{x:e.x,y:e.y});if(e.hp<=0){e.dead=.42;this.kills++;this.score+=100+Math.min(this.combo,20)*5;this.emit('kill',{x:e.x,y:e.y,type:e.type});if(this.kills%5===0)this.loot.push({x:e.x,y:e.y,r:10,type:'health'});}}
  hurt(n=1){const p=this.player;if(p.invuln>0||this.mode!=='playing')return false;p.hp=Math.max(0,p.hp-n);p.invuln=.9;this.hurtFlash=.3;this.combo=0;this.flash=.22;this.emit('hurt',{x:p.x,y:p.y});if(p.hp<=0){this.mode='dead';this.emit('dead');}return true;}
  fire(e,angle,kind='arrow',speed=280){this.shots.push({x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:kind==='arrow'?5:9,life:5,kind,source:e.id,friendly:false,damage:1,pierce:0,hitIds:new Set()});if(this.shots.length>90)this.shots.shift();this.emit('enemyShot',{x:e.x,y:e.y});}
  enemyAttack(e){const p=this.player,d=dist(e,p),angle=Math.atan2(e.ty-e.y,e.tx-e.x);e.attack=.25;
    if(['wolf','gargoyle'].includes(e.type)){e.charge=.5;e.cx=Math.cos(angle);e.cy=Math.sin(angle);e.cool=this.stage===0?2.2:1.6;}
    else if(e.type==='executioner'){if(d<115){if(this.canParry(Math.atan2(e.y-p.y,e.x-p.x))){this.success(e);e.stun=1.4;this.damageEnemy(e,2);}else this.hurt();}e.cool=1.7;}
    else if(e.type==='king'){
      e.pattern=(e.pattern||0)+1;
      if(e.pattern%3===0){this.fire(e,angle,'wave',e.hp<32?290:240);}
      else if(e.pattern%3===1){for(let i=-2;i<=2;i++)this.fire(e,angle+i*.18,'fire',e.hp<32?315:260);}
      else {e.charge=.48;e.cx=Math.cos(angle);e.cy=Math.sin(angle);}
      e.cool=e.hp<32?.8:1.15;
    }else{if(e.type==='wraith')for(let i=-1;i<=1;i++)this.fire(e,angle+i*.2,'fire',230+this.stage*18);else this.fire(e,angle,'arrow',285+this.wave*12);e.cool=e.type==='wraith'?1.8:this.stage===0?2.1:1.55;}
  }
  updateEnemies(dt){const p=this.player;this.attackGap=Math.max(0,(this.attackGap||0)-dt);
    for(const e of this.enemies){e.flash=Math.max(0,e.flash-dt);e.attack=Math.max(0,e.attack-dt);e.cueTime=Math.max(0,(e.cueTime||0)-dt);if(e.hp<=0&&e.knock<=0){e.dead=Math.max(0,e.dead-dt);continue;}if(e.spawn>0){e.spawn-=dt;continue;}
      e.cool-=dt;e.stun=Math.max(0,e.stun-dt);
      if(e.knock>0){e.knock-=dt;this.move(e,e.kx*dt,e.ky*dt);for(const other of this.enemies)if(other!==e&&other.hp>0&&!e.hitIds.has(other.id)&&dist(e,other)<e.r+other.r+8){e.hitIds.add(other.id);this.damageEnemy(other,3);}continue;}
      if(e.stun>0)continue;const d=dist(e,p);e.angle=Math.atan2(p.y-e.y,p.x-e.x);
      if(e.charge>0){const impactTime=(dist(e,p)-e.r-p.r-7)/(e.type==='king'?520:480);if(impactTime<=.16&&!e.imminent){e.imminent=true;e.cueTime=.18;this.emit('meleeCue',{x:e.x,y:e.y});}e.charge-=dt;this.move(e,e.cx*(e.type==='king'?520:480)*dt,e.cy*(e.type==='king'?520:480)*dt);if(dist(e,p)<e.r+p.r+7){if(this.canParry(Math.atan2(-e.cy,-e.cx))){const perfect=this.success(e);e.charge=0;e.stun=1.2;e.knock=.24;e.kx=Math.cos(p.angle)*750;e.ky=Math.sin(p.angle)*750;e.hitIds.clear();this.damageEnemy(e,perfect?3:2);}else{this.hurt();e.charge=0;e.stun=.25;}}continue;}
      if(e.windup>0){e.windup-=dt;if(e.type==='executioner'&&e.windup<=.16&&!e.imminent){e.imminent=true;e.cueTime=.18;this.emit('meleeCue',{x:e.x,y:e.y});}if(e.windup<=0)this.enemyAttack(e);continue;}
      const melee=['wolf','gargoyle','executioner','king'].includes(e.type),range=e.type==='executioner'?100:e.type==='king'?440:melee?84:650;
      if(d>range*.78||!this.lineClear(e,p)){let target=p;if(!this.lineClear(e,p)){e.navTime=(e.navTime||0)-dt;if(e.navTime<=0){e.path=this.route(e,p);e.navTime=.7;}while(e.path?.length&&dist(e,e.path[0])<12)e.path.shift();target=e.path?.[0]||p;}const distance=dist(e,target)||1;this.move(e,(target.x-e.x)/distance*e.speed*dt,(target.y-e.y)/distance*e.speed*dt);}
      else if(!melee&&d<170)this.move(e,-Math.cos(e.angle)*e.speed*dt,-Math.sin(e.angle)*e.speed*dt);
      // Separation keeps silhouettes and attack telegraphs readable.
      for(const o of this.enemies)if(o!==e&&o.hp>0&&dist(e,o)<e.r+o.r+6){const a=Math.atan2(e.y-o.y,e.x-o.x);this.move(e,Math.cos(a)*28*dt,Math.sin(a)*28*dt);}
      if(e.cool<=0&&d<(melee&&e.type!=='king'?range*.78+5:range)&&this.attackGap<=0&&this.lineClear(e,p)){this.attackGap=this.stage===0?.9:.65;e.imminent=false;e.windup=e.type==='executioner'?.36:e.type==='king'?.72:melee?.32:.55;e.windupDuration=e.windup;if(melee&&e.type!=='king'){e.imminent=true;e.cueTime=e.windup+.08;this.emit('meleeCue',{x:e.x,y:e.y});}e.tx=p.x;e.ty=p.y;this.emit('windup',{x:e.x,y:e.y});}
      if(this.mode!=='playing')return;
    }
  }
  updateShots(dt,input){const p=this.player;for(let i=this.shots.length-1;i>=0;i--){const s=this.shots[i],a={x:s.x,y:s.y};s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
      if(s.life<=0||!this.lineClear(a,s)){this.shots.splice(i,1);continue;}
      if(!s.friendly&&segmentDistance(p,a,s)<p.r+s.r+(this.canParry(Math.atan2(-s.vy,-s.vx))?27:0)){
        if(this.canParry(Math.atan2(-s.vy,-s.vx))){const perfect=this.success(s),angle=p.angle,speed=perfect?720:570;s.x=p.x+Math.cos(angle)*40;s.y=p.y+Math.sin(angle)*40;s.vx=Math.cos(angle)*speed;s.vy=Math.sin(angle)*speed;s.friendly=true;s.perfect=perfect;s.damage=perfect?3:2;s.pierce=this.upgrades.pierce||0;s.life=2.5;}
        else {this.hurt();this.shots.splice(i,1);if(this.mode!=='playing')return;}
      }else if(s.friendly){for(const e of this.enemies){if(e.hp<=0||e.spawn>0||s.hitIds.has(e.id)||segmentDistance(e,a,s)>e.r+s.r)continue;s.hitIds.add(e.id);this.damageEnemy(e,s.damage);if(s.kind==='fire'||s.perfect&&this.upgrades.blast){const r=s.kind==='fire'?65:70;this.emit('blast',{x:e.x,y:e.y,r});for(const o of this.enemies)if(o!==e&&o.hp>0&&dist(e,o)<r+o.r)this.damageEnemy(o,1+(this.upgrades.blast||0));}if(s.pierce--<=0){this.shots.splice(i,1);break;}}}
    }}
  chooseUpgrade(key){if(this.mode!=='upgrade'||!this.choices.includes(key))return false;this.upgrades[key]=(this.upgrades[key]||0)+1;if(key==='vitality'){this.player.maxHp++;this.player.hp++;}this.wave++;this.mode='playing';this.player.invuln=1.2;this.spawnWave();this.emit('upgrade');return true;}
  clearWave(){this.shots=[];this.fields=[];this.score+=250;this.player.hp=Math.min(this.player.maxHp,this.player.hp+1);
    if(this.wave<2){this.mode='upgrade';const pool=Object.keys(UPGRADES).filter(k=>(this.upgrades[k]||0)<UPGRADES[k].max);this.choices=pool.sort(()=>this.random()-.5).slice(0,3);if(!this.choices.length){this.wave++;this.mode='playing';this.spawnWave();}this.emit('upgradeMenu');}
    else if(this.stage<2){this.mode='stageclear';this.countdown=3;this.emit('stageclear');}
    else{this.mode='won';this.score+=1000;this.emit('won');}
  }
  update(real,input={}){real=clamp(real,0,.05);this.flash=Math.max(0,this.flash-real);this.hurtFlash=Math.max(0,this.hurtFlash-real);if(this.mode==='countdown'){this.countdown-=real;if(this.countdown<=0){this.mode='playing';this.emit('continue');}return;}if(this.mode==='stageclear'){this.countdown-=real;if(this.countdown<=0){this.mode='playing';this.loadStage(this.stage+1);}return;}if(this.mode!=='playing')return;
    const p=this.player;this.time+=real;this.stageTime+=real;for(const k of ['parryCooldown','slashCooldown','invuln','slash'])p[k]=Math.max(0,p[k]-real);p.parryAge+=real;p.parry=Math.max(0,p.parry-real);this.comboTime-=real;if(this.comboTime<=0)this.combo=0;
    this.slow=Math.max(0,this.slow-real);if(this.hitStop>0){this.hitStop-=real;return;}const dt=real*(this.slow>0?.25:1);
    if(Number.isFinite(input.aimAngle))p.angle=input.aimAngle;else if(input.aim)p.angle=Math.atan2(input.aim.y-p.y,input.aim.x-p.x);else if(input.x||input.y)p.angle=Math.atan2(input.y||0,input.x||0);
    const reach=70+(this.upgrades.reach||0)*10;
    if(input.attack||input.autoAttack&&this.enemies.some(e=>e.hp>0&&e.spawn<=0&&dist(e,p)<reach+e.r&&this.facing(Math.atan2(e.y-p.y,e.x-p.x),1.15)&&this.lineClear(p,e)))this.slash();
    this.updateEnemies(dt);if(this.mode!=='playing')return;this.updateShots(dt,input);if(this.mode!=='playing')return;
    for(const f of this.fields){f.warn-=dt;f.life-=dt;if(f.warn<=0&&!f.fired){f.fired=true;this.emit('ground',{x:f.x,y:f.y,r:f.r});if(dist(f,p)<f.r+p.r)this.hurt();}}this.fields=this.fields.filter(f=>f.life>0);if(this.mode!=='playing')return;
    for(let i=this.loot.length-1;i>=0;i--)if(p.hp<p.maxHp&&dist(p,this.loot[i])<25){p.hp++;this.loot.splice(i,1);this.emit('heal',{x:p.x,y:p.y});}
    if(this.enemies.length&&this.enemies.every(e=>e.hp<=0))this.clearWave();
  }
}
