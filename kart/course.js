// Track surveying uses a closed centerline, resampled at equal physical distance.
export const SEGMENT=88;
export const ROAD=460;
export const LENGTH=311*SEGMENT;
const route=[
  [0,86,106],[18,54,109],[35,27,111],[51,12,85],
  [64,10,59],[82,12,34],[96,29,21],[111,49,34],
  [117,51,52],[135,58,68],[149,76,69],[162,91,61],
  [169,103,54],[178,114,47],[187,126,47],[197,140,41],
  [208,148,24],[223,165,16],[236,182,26],[249,186,47],
  [260,178,67],[276,159,81],[290,133,91],[302,107,104],[311,86,106],
];
const count=route.length-1;
const wrap=(value,size)=>(value%size+size)%size;
const spline=(a,b,c,d,t)=>b+.5*t*(c-a+t*(2*a-5*b+4*c-d+t*(3*b-a-3*c+d)));

function authoredPoint(segment) {
  let i=0;
  while(segment>=route[i+1][0])i++;
  const a=route[wrap(i-1,count)],b=route[i],c=route[i+1],d=route[(i+2)%count];
  const t=(segment-b[0])/(c[0]-b[0]);
  return {x:spline(a[1],b[1],c[1],d[1],t),z:spline(a[2],b[2],c[2],d[2],t)};
}

const density=6;
const raw=Array.from({length:311*density+1},(_,i)=>authoredPoint(wrap(i/density,311)));
let length=0;
for(let i=0;i<raw.length;i++){
  if(i>0) length+=Math.hypot(raw[i].x-raw[i-1].x,raw[i].z-raw[i-1].z);
  raw[i].distance=length;
}
const physicalScale=LENGTH/length;
const bounds={
  left:Math.min(...raw.map(p=>p.x)),right:Math.max(...raw.map(p=>p.x)),
  top:Math.min(...raw.map(p=>p.z)),bottom:Math.max(...raw.map(p=>p.z)),
};
const mapScale=Math.min(163/(bounds.right-bounds.left),98/(bounds.bottom-bounds.top));
const mapX=92-(bounds.right+bounds.left)/2*mapScale;
const mapY=59-(bounds.bottom+bounds.top)/2*mapScale;

function center(distance) {
  const target=wrap(distance,LENGTH)/physicalScale;
  let low=0,high=raw.length-1;
  while(high-low>1){
    const mid=(low+high)>>1;
    if(raw[mid].distance<=target) low=mid;
    else high=mid;
  }
  const a=raw[low],b=raw[high],t=(target-a.distance)/(b.distance-a.distance);
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,raw:(low+t)/density};
}

export function distanceFor(rawSegment) {
  return raw[Math.round(rawSegment*density)].distance*physicalScale;
}
export function rawProgress(distance) {
  return center(distance).raw;
}
export function mapPose(distance) {
  const {x,z}=center(distance);
  return {x:mapX+x*mapScale,y:mapY+z*mapScale};
}

export function coursePose(distance,lane=0) {
  const here=center(distance),front=center(distance+29),back=center(distance-29);
  const angle=Math.atan2(front.z-back.z,front.x-back.x);
  const rightX=-Math.sin(angle),rightZ=Math.cos(angle);
  return {x:here.x*physicalScale+lane*ROAD*rightX,z:here.z*physicalScale+lane*ROAD*rightZ,
    angle,rightX,rightZ};
}

export function turnAt(distance) {
  const a=coursePose(distance-SEGMENT).angle,b=coursePose(distance+SEGMENT).angle;
  return Math.atan2(Math.sin(b-a),Math.cos(b-a))*36;
}

const sampleStep=SEGMENT/2;
const samples=Array.from({length:LENGTH/sampleStep},(_,i)=>coursePose(i*sampleStep));
const sampleAt=i=>samples[wrap(i,samples.length)];
const projectLimit=8;
const padding=5*ROAD;

export function keepInField(point) {
  return {x:Math.min(bounds.right*physicalScale+padding,Math.max(bounds.left*physicalScale-padding,point.x)),
    z:Math.min(bounds.bottom*physicalScale+padding,Math.max(bounds.top*physicalScale-padding,point.z))};
}

export function projectOnCourse(worldX,worldZ,reference) {
  const origin=Math.floor(reference/sampleStep);
  let distance=reference,best=Infinity;
  for(let i=origin-projectLimit;i<=origin+projectLimit;i++){
    const a=sampleAt(i),b=sampleAt(i+1),dx=b.x-a.x,dz=b.z-a.z;
    const factor=Math.min(1,Math.max(0,((worldX-a.x)*dx+(worldZ-a.z)*dz)/(dx*dx+dz*dz)));
    const error=(a.x+dx*factor-worldX)**2+(a.z+dz*factor-worldZ)**2;
    if(error<best){best=error;distance=(i+factor)*sampleStep;}
  }
  return distance;
}
export function roadPosition(point,lane,raise=0) {
  return {x:point.x+point.rightX*ROAD*lane,z:point.z+point.rightZ*ROAD*lane,y:point.y+raise};
}
