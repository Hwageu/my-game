import {HAIRPIN_START, HAIRPIN_END, LENGTH, SEGMENT, approachingHairpin} from './track.js?v=9';
import {mapPose as pose} from './course.js?v=3';

const outline=new Path2D();
for(let i=0;i<=LENGTH/SEGMENT;i++){
  const {x,y}=pose(i*SEGMENT);
  if(i===0) outline.moveTo(x,y);
  else outline.lineTo(x,y);
}
outline.closePath();
const hairpin=new Path2D();
for(let distance=HAIRPIN_START;distance<=HAIRPIN_END;distance+=SEGMENT) {
  const {x,y}=pose(distance);
  if(distance===HAIRPIN_START) hairpin.moveTo(x,y);
  else hairpin.lineTo(x,y);
}
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
  if(approachingHairpin(race.player.distance)) {
    ctx.strokeStyle='#ffca75';
    ctx.stroke(hairpin);
  }

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
    const x=Math.max(7,Math.min(ctx.canvas.width-7,here.x-Math.sin(heading)*lane));
    const y=Math.max(8,Math.min(ctx.canvas.height-8,here.y+Math.cos(heading)*lane));
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
