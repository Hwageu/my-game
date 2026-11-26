import {LENGTH, SEGMENT} from './track.js?v=4';

// A schematic of Indy Hill: each point is tied to a driving segment.
const route = [
  [0,94,95], [18,72,105], [35,46,108], [51,20,98],
  [64,12,72], [82,14,39], [96,29,25], [111,43,36],
  [117,44,53], [135,49,72], [149,61,82], [162,80,80],
  [184,104,72], [197,120,63], [208,129,55], [223,134,42],
  [236,138,27], [249,153,13], [260,168,16], [276,171,36],
  [290,150,65], [302,123,80], [LENGTH/SEGMENT,94,95],
];
const n = route.length-1;
const wrap = (value,size) => (value%size+size)%size;
const interpolate = (a,b,c,d,t) =>
  b + .5*t*(c-a+t*(2*a-5*b+4*c-d+t*(3*b-a-3*c+d)));

function pose(distance) {
  const segment=wrap(distance,LENGTH)/SEGMENT;
  let i=0;
  while(segment>=route[i+1][0]) i++;
  const a=route[wrap(i-1,n)], b=route[i], c=route[i+1], d=route[(i+2)%n];
  const amount=(segment-b[0])/(c[0]-b[0]);
  return {
    x:interpolate(a[1],b[1],c[1],d[1],amount),
    y:interpolate(a[2],b[2],c[2],d[2],amount),
  };
}

const outline=new Path2D();
for(let i=0;i<=LENGTH/SEGMENT;i++){
  const {x,y}=pose(i*SEGMENT);
  if(i===0) outline.moveTo(x,y);
  else outline.lineTo(x,y);
}
outline.closePath();
const start=pose(0), next=pose(SEGMENT);
const angle=Math.atan2(next.y-start.y,next.x-start.x);

export function drawMinimap(ctx,race) {
  ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  ctx.lineJoin='round';
  ctx.lineCap='round';
  ctx.lineWidth=9;
  ctx.strokeStyle='#42686b';
  ctx.stroke(outline);
  ctx.lineWidth=4;
  ctx.strokeStyle='#bcd1bb';
  ctx.stroke(outline);

  ctx.save();
  ctx.translate(start.x,start.y);
  ctx.rotate(angle);
  for(let row=0;row<2;row++) for(let column=0;column<3;column++){
    ctx.fillStyle=(row+column)%2?'#203744':'#fff0d0';
    ctx.fillRect(-3+row*3,-6+column*4,3,4);
  }
  ctx.restore();

  function marker(driver) {
    const here=pose(driver.distance), ahead=pose(driver.distance+SEGMENT);
    const heading=Math.atan2(ahead.y-here.y,ahead.x-here.x);
    const lane=driver.x*5;
    const x=here.x-Math.sin(heading)*lane;
    const y=here.y+Math.cos(heading)*lane;
    ctx.beginPath();
    if(driver===race.player){
      ctx.moveTo(x,y-7);ctx.lineTo(x+6,y);ctx.lineTo(x,y+7);ctx.lineTo(x-6,y);ctx.closePath();
      ctx.fillStyle='#ffe096';
    } else {
      ctx.arc(x,y,4.3,0,Math.PI*2);
      ctx.fillStyle=driver.light;
    }
    ctx.fill();
    ctx.lineWidth=2.1;
    ctx.strokeStyle='#142733';
    ctx.stroke();
  }
  for(const driver of race.racers) if(driver!==race.player) marker(driver);
  marker(race.player);
}
