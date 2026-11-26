import {LENGTH,roadHeight} from './track.js?v=12';
import {coursePose,distanceFor,roadPosition} from './course.js?v=3';

export const structures=[];
export const spectators=[];
const front=(distance,lane,height)=>roadPosition({...coursePose(distance),y:roadHeight(distance)},lane,height);
function face(color,points) {
  structures.push({color,points});
}
function level(color,start,end,left,right,height) {
  face(color,[front(start,left,height),front(end,left,height),front(end,right,height),front(start,right,height)]);
}
function laneFace(color,start,end,lane,bottom,top) {
  face(color,[front(start,lane,bottom),front(end,lane,bottom),front(end,lane,top),front(start,lane,top)]);
}
function endFace(color,distance,left,right,bottom,top) {
  face(color,[front(distance,left,bottom),front(distance,right,bottom),front(distance,right,top),front(distance,left,top)]);
}
function building(start,end,left,right,bottom,top,wall,roof) {
  laneFace(wall,start,end,left,bottom,top);
  laneFace(wall,start,end,right,bottom,top);
  endFace(wall,start,left,right,bottom,top);
  endFace(wall,end,left,right,bottom,top);
  level(roof,start,end,left,right,top);
}

function garage(start,end,index) {
  const inside=2.01, outside=2.84;
  building(start,end,inside,outside,0,318,'#a9aca0','#334a54');
  level('#516874',start-12,end+12,inside-.08,outside+.04,329);
  laneFace('#ddbf75',start+12,end-12,inside-.013,264,292);
  laneFace('#394d58',start+36,end-36,inside-.020,7,229);
  laneFace(index%2?'#6a8589':'#5c717b',start+42,end-42,inside-.028,44,183);
  for(const height of [76,109,142])laneFace('#465e6a',start+42,end-42,inside-.040,height,height+8);
  laneFace('#e1cca4',start+15,start+24,inside-.025,0,246);
}
const pitOrigin=distanceFor(306)-LENGTH;
const bayLength=263;
for(let index=0;index<8;index++) {
  const start=pitOrigin+index*(bayLength+14);
  garage(start,start+bayLength,index);
}

function grandstand(start,end,covered) {
  const frontLane=-1.92, tiers=5, rise=52, step=.18;
  const crowdColors=['#d8c78f','#d28d65','#b9d7cb','#6897a1','#d9b99a','#88898d'];
  const platformTop=70;
  laneFace('#8b9b96',start,end,frontLane,0,platformTop);
  for(let row=0;row<tiers;row++) {
    const height=platformTop+row*rise, lane=frontLane-row*step;
    level(row%2?'#70878a':'#839999',start,end,lane-step,lane,height);
    laneFace('#505f68',start,end,lane,row===0?5:height-rise,height);
    for(let column=0;column<13;column++) {
      if((column*5+row*2)%11===4)continue;
      const p=(column+.6+(row%2)*.22)/13;
      spectators.push({...front(start+(end-start)*p,lane-step*.6,height),
        color:crowdColors[(row*4+column*3+Math.floor(column/2))%crowdColors.length]});
    }
  }
  endFace('#6d8182',start,frontLane-tiers*step,frontLane,0,platformTop);
  endFace('#6d8182',end,frontLane-tiers*step,frontLane,0,platformTop);
  laneFace('#566f76',start,end,frontLane-tiers*step,0,platformTop+tiers*rise);
  if(covered) {
    const roof=470;
    building(start-24,end+24,frontLane-tiers*step-.06,frontLane+.08,roof-16,roof,
      '#273b49','#3c535c');
    laneFace('#efc170',start-24,end+24,frontLane+.087,roof-16,roof-7);
    for(const p of [.025,.49,.96]){
      const post=start+(end-start)*p;
      building(post,post+15,frontLane+.02,frontLane+.05,platformTop,roof-13,'#414f57','#566a72');
    }
  }
}
grandstand(pitOrigin+100,pitOrigin+1080,true);
grandstand(pitOrigin+1150,pitOrigin+2120,false);

const finish=-18;
for(const lane of [-1.25,1.21]) {
  building(finish-19,finish+38,lane-.028,lane+.028,0,480,'#52636b','#314650');
}
building(finish-25,finish+42,-1.30,1.28,429,491,'#2e4450','#607780');
laneFace('#e7c883',finish-25,finish+42,-1.31,443,451);
endFace('#e7c883',finish-25,-1.30,1.28,438,445);
for(let i=0;i<9;i++) endFace(i%2?'#435560':'#e0dfc7',finish-26,-.9+i*.20,-.74+i*.20,459,478);

function guardrail(from,to,lane) {
  // Follow the bend in short sections so runoff remains visible between the curb and barrier.
  for(let start=from;start<to;start+=130){
    const end=Math.min(start+130,to);
    laneFace('#94a29c',start,end,lane,48,64);
    laneFace('#576d70',start,end,lane,40,48);
    laneFace('#4f6267',start,Math.min(start+13,end),lane,0,48);
  }
}
guardrail(pitOrigin+96,distanceFor(15),1.19);
guardrail(distanceFor(80),distanceFor(101),-1.59);
guardrail(distanceFor(106),distanceFor(119),-1.61);
guardrail(distanceFor(173),distanceFor(185),1.58);
guardrail(distanceFor(188),distanceFor(200),-1.60);

function marshalPost(distance,lane) {
  const left=lane-.13,right=lane+.13;
  building(distance-59,distance+56,left,right,0,32,'#465f5c','#8b9d91');
  building(distance-51,distance+49,left+.02,right-.02,32,153,'#819b98','#2e4851');
  const onTrack=lane>0?left-.005:right+.005;
  laneFace('#243d47',distance-38,distance+35,onTrack,97,140);
  laneFace('#78a2a1',distance-33,distance+31,onTrack-Math.sign(lane)*.005,109,133);
  building(distance-58,distance+55,left-.02,right+.02,147,161,'#b58a55','#627c79');
  const flag=right+.047;
  building(distance+26,distance+32,flag,flag+.015,30,223,'#c4c5ae','#c4c5ae');
  laneFace('#e8ae5a',distance+28,distance+81,flag,186,222);
}
marshalPost(distanceFor(97),-1.93);
marshalPost(distanceFor(184),1.90);
marshalPost(distanceFor(252),-1.82);
