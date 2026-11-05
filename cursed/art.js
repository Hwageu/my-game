import {STAGES} from './engine.js?v=20261105-curse';
const pal={ink:'#141319',ivory:'#eee0b9',bone:'#c8ba91',rust:'#aa5b43',gold:'#e6bb73',red:'#9c3f49'};
const rect=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
function poly(c,color,points){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
function ellipse(c,color,x,y,rx,ry){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function line(c,color,width,points){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
let backdrop,key;
export function background(g){const id=g.stage+'/'+g.w+'/'+g.h;if(key===id)return backdrop;key=id;const c=document.createElement('canvas');c.width=g.w;c.height=g.h;const q=c.getContext('2d'),s=STAGES[g.stage],b=g.bounds;
  rect(q,s.sky,0,0,g.w,g.h);rect(q,'#12161b',b.x-14,b.y-32,b.w+28,b.h+50);rect(q,s.floor,b.x,b.y,b.w,b.h);
  let seed=543+g.stage;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let y=b.y;y<b.y+b.h;y+=30)for(let x=b.x;x<b.x+b.w;x+=48){const ox=(Math.floor(y/30)%2)*24;rect(q,'#15171c66',x+ox,y,46,28);rect(q,s.floor,x+ox+2,y+2,43,25);rect(q,random()>.5?'#ffffff0a':'#00000014',x+ox+3,y+3,40,22);if(random()>.65)line(q,'#171a2170',2,[[x+ox+8,y+9],[x+ox+12,y+14],[x+ox+22,y+17]]);}
  // Worn central inlay belongs to the arena, not to a UI grid.
  const cx=g.w/2,cy=b.y+b.h/2;
  q.strokeStyle=s.stone+'60';q.lineWidth=3;q.beginPath();q.ellipse(cx,cy,Math.min(b.w*.35,210),Math.min(b.h*.36,125),0,0,Math.PI*2);q.stroke();q.beginPath();q.ellipse(cx,cy,Math.min(b.w*.35,210)-12,Math.min(b.h*.36,125)-10,0,0,Math.PI*2);q.stroke();
  for(let i=0;i<350;i++){const x=b.x+random()*b.w,y=b.y+random()*b.h;rect(q,g.stage===0?'#63735b55':'#aaa08c25',x,y,2+random()*4,2);}
  for(let y=b.y-20;y<b.y+b.h+16;y+=28){rect(q,'#353b3c',b.x-20,y,18,25);rect(q,s.stone,b.x-18,y+2,4,20);rect(q,'#353b3c',b.x+b.w+2,y,18,25);rect(q,s.stone,b.x+b.w+3,y+2,4,20);}
  for(let x=b.x-18;x<b.x+b.w+20;x+=50){rect(q,'#343a3c',x,b.y-24,47,23);rect(q,s.stone,x+2,b.y-24,43,5);rect(q,'#252b2f',x,b.y+b.h,47,22);rect(q,s.stone,x+2,b.y+b.h,43,4);}
  // North gate and architectural silhouette.
  rect(q,'#17171d',cx-40,b.y-47,80,47);rect(q,s.stone,cx-44,b.y-51,8,52);rect(q,s.stone,cx+36,b.y-51,8,52);rect(q,s.stone,cx-44,b.y-51,88,8);
  for(let x=-29;x<32;x+=10)rect(q,'#63625d',cx+x,b.y-39,4,36);
  if(g.stage===0){
    for(const x of [b.x+25,b.x+b.w-25]){poly(q,'#141d20',[[x-3,b.y+80],[x+8,b.y-10],[x+13,b.y+85]]);line(q,'#182025',5,[[x+5,b.y+25],[x-25,b.y-10],[x-39,b.y-12]]);line(q,'#182025',4,[[x+8,b.y+15],[x+34,b.y-22],[x+50,b.y-26]]);}
    for(let i=0;i<12;i++){const x=b.x+25+i*b.w/12;rect(q,'#324136',x,b.y+b.h-10,3,11);rect(q,'#43503c',x+4,b.y+b.h-4,2,5);}
  }else if(g.stage===1){
    for(const x of [b.x+26,b.x+b.w-26]){poly(q,'#6b454055',[[x-10,b.y],[x+10,b.y],[cx+120,b.y+b.h],[cx-120,b.y+b.h]]);for(let y=b.y+80;y<b.y+b.h;y+=100){rect(q,'#2a2329',x-12,y,24,52);rect(q,'#9c673f',x-9,y+3,18,5);}}
    rect(q,'#7d383c70',cx-35,b.y+3,70,b.h-6);for(let y=b.y+8;y<b.y+b.h;y+=32){rect(q,'#bd96584d',cx-34,y,2,22);rect(q,'#bd96584d',cx+32,y,2,22);}
  }else{
    rect(q,'#563952',cx-33,b.y,66,75);poly(q,'#77617c',[[cx-28,b.y-3],[cx-28,b.y-45],[cx-14,b.y-60],[cx,b.y-46],[cx+14,b.y-60],[cx+28,b.y-45],[cx+28,b.y-3]]);rect(q,'#35283e',cx-20,b.y-37,40,32);rect(q,'#bd9a6d',cx-24,b.y-6,48,7);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;line(q,'#aea3bc55',3,[[cx+Math.cos(a)*145,cy+Math.sin(a)*90],[cx+Math.cos(a)*157,cy+Math.sin(a)*98]]);}
  }
  for(const o of g.obstacles)drawObstacle(q,o,g.stage,s);
  backdrop=c;return c;
}
function drawObstacle(c,o,stage,s){const {x,y,w,h}=o;ellipse(c,'#080c1370',x+w/2,y+h+5,w*.68,10);rect(c,'#151c22',x-3,y-14,w+6,h+14);
  if(stage===0){poly(c,'#272d2c',[[x-2,y+h],[x-2,y-23],[x+5,y-34],[x+w/2,y-39],[x+w-5,y-34],[x+w+2,y-23],[x+w+2,y+h]]);poly(c,s.stone,[[x+2,y+h-2],[x+2,y-22],[x+8,y-31],[x+w/2,y-35],[x+w-8,y-31],[x+w-2,y-22],[x+w-2,y+h-2]]);line(c,'#929580',3,[[x+4,y-22],[x+10,y-29],[x+w/2,y-32],[x+w-9,y-28]]);rect(c,'#424b43',x+8,y-18,w-16,2);for(let i=0;i<3;i++)rect(c,'#39453c',x+9+i*7,y-10,4,7);rect(c,'#39453c',x+8,y+4,w-16,2);line(c,'#35413a',2,[[x+w-8,y-9],[x+w-15,y],[x+w-12,y+8]]);rect(c,'#354b37',x-4,y+h-6,w+8,7);for(let i=0;i<5;i++)rect(c,'#6a7650',x-3+i*9,y+h-9,5,4);}
  else if(stage===1){rect(c,'#714d37',x,y-14,w,h+9);rect(c,'#aa7950',x,y-14,w,4);rect(c,'#422d2b',x+6,y-5,w-12,9);for(const a of [8,w-12])rect(c,'#35282a',x+a,y+h-8,5,15);}
  else{rect(c,s.stone,x,y-18,w,h+15);rect(c,'#9991a0',x-4,y-20,w+8,7);rect(c,'#3d3b50',x+8,y-11,6,h+2);rect(c,'#b0a0af',x+3,y-12,3,h);rect(c,'#484052',x-3,y+h-7,w+6,7);}
}
function sword(c,a,swing){c.save();c.rotate(a+(swing?-.9+swing*12:0));rect(c,'#16141a',8,-3,31,6);poly(c,'#e6dfbf',[[14,-2],[39,-2],[48,0],[39,3],[14,3]]);rect(c,'#839d9b',14,1,25,2);rect(c,'#ba925f',12,-7,4,14);rect(c,'#503c34',5,-2,8,5);c.restore();}
export function actor(c,e,time,player=false){c.save();c.translate(Math.round(e.x),Math.round(e.y));const dead=!player&&e.hp<=0;if(dead){if(e.dead<=0){c.restore();return;}c.globalAlpha=e.dead/.42;c.rotate((.42-e.dead)*2);}
  if(!player&&e.spawn>0)c.globalAlpha=Math.max(.15,1-e.spawn);const scale=e.type==='king'?1.8:e.type==='executioner'?1.4:1;c.scale(scale,scale);ellipse(c,'#080b1390',0,6,player?19:23,8);const flip=Math.cos(e.angle)<0?-1:1,bob=Math.sin(time*(e.type==='wolf'?16:8)+e.phase||0)*1.4;
  c.save();c.scale(flip,1);c.translate(0,bob);if(['wolf','gargoyle'].includes(e.type)){if(e.charge>0)c.scale(1.18,.92);else if(e.windup>0)c.scale(1.05,.84);}if(e.flash>0)c.filter='brightness(1.65)';if(player&&e.invuln>0&&Math.floor(time*18)%2)c.globalAlpha=.45;
  if(player){
    const step=e.moving?Math.sin(time*15)*4:0;rect(c,pal.ink,-11,-7,22,19);rect(c,'#393a42',-10,2+step,7,13);rect(c,'#727577',4,2-step,7,13);rect(c,'#211d27',-13,12+step,11,5);rect(c,'#211d27',3,12-step,12,5);
    poly(c,'#482733',[[-14,-30],[8,-29],[15,-13],[10,9],[-17,12],[-21,2]]);poly(c,'#8c3f48',[[-12,-28],[2,-28],[6,-6],[-7,4],[-16,9]]);rect(c,'#bc715c',-11,-27,3,20);rect(c,'#242733',-8,-23,19,18);rect(c,'#5c6570',-6,-23,16,5);rect(c,'#c4ae89',-3,-22,11,12);rect(c,'#25222a',4,-19,4,3);rect(c,'#252633',-10,-33,20,12);rect(c,'#7a6e6a',-6,-34,13,3);rect(c,'#343541',-8,-9,20,8);rect(c,'#b7a084',-6,-5,13,3);
  }else if(e.type==='skeleton'){
    const step=Math.sin(time*9)*3;rect(c,pal.ink,-12,-10,22,21);rect(c,pal.bone,-8,-7,4,17+step);rect(c,pal.bone,4,-7,4,17-step);rect(c,'#e3d6ae',-7,-9,15,3);rect(c,pal.bone,-2,-24,4,19);for(let i=0;i<3;i++)rect(c,pal.bone,-9,-21+i*5,19,2);rect(c,'#6c604e',-12,-30,25,12);rect(c,pal.ivory,-10,-36,22,16);rect(c,pal.ink,-7,-31,5,5);rect(c,pal.ink,4,-31,5,5);rect(c,pal.bone,-7,-20,15,5);rect(c,pal.ink,-1,-26,3,4);rect(c,'#71614d',-11,-15,4,13);line(c,'#b18a57',3,[[18,-30],[26,-23],[28,-11],[21,3]]);line(c,'#d3c19b',1,[[18,-30],[21,3]]);rect(c,pal.bone,10,-20,10,4);
  }else if(e.type==='wolf'){
    const step=Math.sin(time*16)*5;poly(c,'#151d25',[[-27,0],[-20,-23],[-5,-29],[12,-24],[24,-17],[29,-6],[16,6],[-16,9]]);poly(c,'#58616a',[[-23,-2],[-16,-20],[-4,-24],[14,-18],[23,-8],[12,2]]);poly(c,'#858a80',[[8,-26],[19,-24],[25,-17],[20,-8],[5,-10]]);poly(c,'#343947',[[8,-24],[9,-38],[18,-29],[23,-35],[26,-20]]);rect(c,'#181f29',19,-19,14,10);rect(c,'#c7bfa0',22,-10,7,3);rect(c,'#e4b66a',16,-23,4,3);rect(c,'#303a46',-20,0+step,7,12);rect(c,'#414d57',11,0-step,7,12);poly(c,'#4b535e',[[-21,-14],[-37,-24],[-34,-10],[-22,-3]]);
  }else if(e.type==='wraith'){
    poly(c,'#1a2731',[[-16,-27],[0,-40],[16,-27],[22,8],[10,1],[3,13],[-5,5],[-19,12],[-15,-3],[-25,3]]);poly(c,'#718f90',[[-11,-25],[0,-32],[10,-24],[15,3],[6,-1],[0,6],[-9,1]]);poly(c,'#adbcab',[[-8,-25],[2,-29],[8,-21],[7,-13],[-6,-14]]);rect(c,'#22323a',-5,-22,4,4);rect(c,'#22323a',3,-22,4,4);poly(c,'#e1a45e',[[22,-20],[18,-29],[25,-39],[31,-27],[28,-16]]);rect(c,'#ffe2a0',23,-27,4,8);line(c,'#91a3a0',4,[[7,-10],[16,-16],[24,-18]]);
  }else if(e.type==='executioner'){
    rect(c,'#201d25',-13,-5,26,18);rect(c,'#403331',-13,3,9,17);rect(c,'#403331',5,3,9,17);rect(c,'#b08c73',-18,-27,36,23);rect(c,'#684e46',-16,-23,5,14);poly(c,'#593039',[[-17,-28],[-11,-42],[8,-44],[17,-27],[9,-22],[-11,-22]]);rect(c,'#d8b292',-7,-31,16,8);rect(c,'#251d26',-4,-30,5,3);rect(c,'#251d26',5,-30,5,3);rect(c,'#6b323b',-17,-10,35,15);rect(c,'#c49b68',-10,-9,20,4);c.save();c.translate(24,-16);c.rotate(e.windup>0?-.8:e.attack>0?.85:0);rect(c,'#72523a',-2,-20,4,60);poly(c,e.cueTime>0?'#fff3ca':'#b1b2a4',[[0,-20],[16,-19],[21,-5],[16,7],[2,4]]);rect(c,'#d6d2b1',16,-13,4,12);c.restore();
  }else if(e.type==='gargoyle'){
    const flap=Math.sin(time*8)*4;for(const side of [-1,1])poly(c,'#6d6b7e',[[side*8,-23],[side*34,-37+flap],[side*43,-12],[side*32,-17],[side*26,-5],[side*16,-10]]);rect(c,'#515a69',-11,-27,22,30);rect(c,'#969595',-6,-22,12,16);poly(c,'#7f8390',[[-12,-30],[-10,-43],[-4,-37],[5,-37],[12,-43],[12,-28],[7,-21],[-7,-21]]);rect(c,'#eac28c',-8,-32,5,3);rect(c,'#eac28c',4,-32,5,3);rect(c,'#4a4a5d',-11,0,7,13);rect(c,'#4a4a5d',5,0,7,13);
  }else{
    poly(c,'#382b49',[[-19,-29],[18,-29],[26,18],[10,12],[0,20],[-21,15]]);poly(c,'#754861',[[-12,-27],[7,-27],[13,14],[-10,16]]);rect(c,'#aaa28e',-10,-28,22,20);rect(c,'#625b69',-8,-24,17,5);rect(c,'#d4c2a3',-9,-39,20,15);rect(c,'#352937',-6,-34,5,4);rect(c,'#352937',4,-34,5,4);poly(c,'#d3af66',[[-13,-40],[-15,-50],[-6,-46],[0,-54],[7,-46],[15,-50],[12,-40]]);rect(c,'#eee0a7',-10,-42,20,3);rect(c,'#b5845a',-16,-13,32,4);rect(c,'#65503d',21,-38,4,60);poly(c,'#c0c6b7',[[22,-44],[26,-52],[29,-42],[36,-37],[25,-33]]);
  }
  c.restore();if(player){sword(c,e.angle,e.slash);}if(!player&&e.hp>0&&e.hp<e.maxHp){rect(c,'#17131a',-17,22,34,3);rect(c,'#b67a70',-17,22,34*Math.max(0,e.hp/e.maxHp),3);}c.restore();
}
export function drawScene(c,g,time,fx){const bg=background(g);c.clearRect(0,0,g.w,g.h);c.drawImage(bg,0,0);const s=STAGES[g.stage],b=g.bounds;
  for(const f of g.fields){c.fillStyle=f.fired?'#db754e99':'#ad483d44';c.strokeStyle='#f29b65';c.lineWidth=3;c.beginPath();c.arc(f.x,f.y,f.r,0,Math.PI*2);c.fill();c.stroke();for(let x=f.x-f.r;x<f.x+f.r;x+=16){c.save();c.beginPath();c.arc(f.x,f.y,f.r,0,Math.PI*2);c.clip();line(c,'#cf766955',2,[[x,f.y-f.r],[x+f.r,f.y+f.r]]);c.restore();}}
  const actors=[...g.enemies,g.player].sort((a,b)=>a.y-b.y);
  for(const e of actors){if(e!==g.player&&e.hp>0&&e.windup>0){const melee=['wolf','gargoyle','executioner','king'].includes(e.type);if(melee){c.strokeStyle='#e8b86c';c.lineWidth=2;c.setLineDash([6,6]);c.beginPath();if(e.type==='executioner')c.arc(e.x,e.y,110,0,Math.PI*2);else{c.moveTo(e.x,e.y);c.lineTo(e.tx,e.ty);}c.stroke();c.setLineDash([]);}ellipse(c,'#f4cb8166',e.x,e.y-25,12+Math.sin(time*30)*3,12);}
    actor(c,e,time,e===g.player);
    if(e!==g.player&&e.hp>0&&e.cueTime>0){c.strokeStyle='#fff2c4';c.lineWidth=3;c.beginPath();c.arc(e.x,e.y-8,e.r+16,0,Math.PI*2);c.stroke();for(const a of [-.7,.7,2.4,3.8]){const x=e.x+Math.cos(a)*(e.r+23),y=e.y-8+Math.sin(a)*(e.r+23);line(c,'#fff2c4',3,[[x,y],[x+Math.cos(a)*9,y+Math.sin(a)*9]]);}}
    if(e!==g.player&&e.hp>0&&e.windup>0&&['wolf','gargoyle','executioner'].includes(e.type)){rect(c,'#403334',e.x-18,e.y+27,36,3);rect(c,e.cueTime>0?'#fff2c4':'#e4b36d',e.x-18,e.y+27,36*(1-e.windup/(e.windupDuration||.36)),3);}
    if(e!==g.player&&e.stun>0&&e.hp>0){for(let i=0;i<3;i++)rect(c,'#f1d797',e.x+Math.cos(time*6+i*2.1)*15,e.y-47+Math.sin(time*6+i*2.1)*4,4,4);}}
  for(const p of g.loot){ellipse(c,'#d3b67a44',p.x,p.y,17,8);rect(c,'#b7b9a1',p.x-8,p.y-14,16,18);rect(c,'#7c493c',p.x-2,p.y-10,4,12);rect(c,'#7c493c',p.x-6,p.y-6,12,4);}
  for(const p of g.shots){c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.vy,p.vx));if(p.kind==='arrow'){rect(c,p.friendly?'#fff1bd':'#c6d6cb',-15,-2,28,4);poly(c,p.friendly?'#f7cb7a':'#f4e5b4',[[15,0],[6,-5],[6,5]]);rect(c,'#7e7d71',-14,-4,5,8);}else if(p.kind==='wave'){c.strokeStyle=p.friendly?'#ffe0a1':'#c7b1ec';c.lineWidth=5;c.beginPath();c.arc(0,0,18,-1.25,1.25);c.stroke();}else{ellipse(c,p.friendly?'#eab96b88':'#ba603f77',-5,0,18,10);ellipse(c,p.friendly?'#f1d397':'#de8a57',0,0,10,8);rect(c,'#fff0bd',-3,-3,6,6);}c.restore();}
  const p=g.player;c.save();c.translate(p.x,p.y-4);c.strokeStyle=p.parry>0?'#fff0b8':'#d5d5b788';c.lineWidth=p.parry>0?4:2;c.beginPath();c.arc(0,0,38,p.angle-1.14,p.angle+1.14);c.stroke();line(c,'#d5c9a188',2,[[Math.cos(p.angle)*47,Math.sin(p.angle)*47],[Math.cos(p.angle)*82,Math.sin(p.angle)*82]]);c.rotate(p.angle);poly(c,'#e7d7ae',[[87,0],[78,-4],[78,4]]);c.restore();
  if(p.slash>0){c.strokeStyle='#f7e8b5';c.lineWidth=5;c.beginPath();c.arc(p.x,p.y-5,48,p.angle-.9,p.angle+.9);c.stroke();c.strokeStyle='#acb4a066';c.lineWidth=9;c.beginPath();c.arc(p.x,p.y-5,54,p.angle-.8,p.angle+.75);c.stroke();}
  for(const f of fx){c.globalAlpha=Math.max(0,f.life/f.max);if(f.ring){c.strokeStyle=f.color;c.lineWidth=3;c.beginPath();c.arc(f.x,f.y,f.r+(1-f.life/f.max)*45,0,Math.PI*2);c.stroke();}else rect(c,f.color,f.x,f.y,f.size,f.size);}c.globalAlpha=1;
  // Torch lighting and flame pixels preserve the stone surface beneath them.
  for(const x of [b.x+10,b.x+b.w-10])for(const y of [b.y+44,b.y+b.h-40]){const light=c.createRadialGradient(x,y-18,3,x,y-18,105);light.addColorStop(0,g.stage===2?'#b1a0d824':'#d6a26428');light.addColorStop(1,'#d6a26400');c.fillStyle=light;c.fillRect(x-105,y-123,210,210);rect(c,'#352d2d',x-3,y-8,6,20);poly(c,g.stage===2?'#b6a1d8':'#daa36a',[[x-7,y-11],[x-5,y-23],[x+Math.sin(time*9)*3,y-34],[x+5,y-21],[x+6,y-11]]);rect(c,'#f9e2ac',x-2,y-22,4,12);}
  const fog=c.createLinearGradient(0,g.h*.65,0,g.h);fog.addColorStop(0,'#9ca9ac00');fog.addColorStop(1,g.stage===0?'#9ca9ac19':'#20182222');c.fillStyle=fog;c.fillRect(0,0,g.w,g.h);
  if(g.flash>0&&g.hitStop>0){c.fillStyle='#f9dfa51a';c.fillRect(0,0,g.w,g.h);}
}
const letters={C:['011110','110000','110000','110000','110000','110000','011110'],U:['110011','110011','110011','110011','110011','110011','011110'],R:['111110','110011','110011','111110','110110','110011','110011'],S:['011111','110000','110000','011110','000011','000011','111110'],E:['111111','110000','110000','111110','110000','110000','111111'],D:['111110','110011','110011','110011','110011','110011','111110'],G:['011111','110000','110000','110111','110011','110011','011110']};
export function logo(canvas){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);for(const [text,y,size] of [['CURSED',4,4],['EDGE',43,4]]){const width=(text.length*7-1)*size,start=(canvas.width-width)/2;for(let n=0;n<text.length;n++)letters[text[n]].forEach((row,j)=>[...row].forEach((v,i)=>{if(v==='1'){rect(c,'#452933',start+n*7*size+i*size+2,y+j*size+3,size,size);rect(c,j<3?'#f1d6a0':'#bf955f',start+n*7*size+i*size,y+j*size,size,size);}}));}}
