import {LENGTH, ROAD, SEGMENT, roadHeight, track} from './track.js?v=7';

// Control points are shared by the overhead map and the perspective camera.
const route = [
  [0,94,95], [18,72,105], [35,46,108], [51,20,98],
  [64,12,72], [82,14,39], [96,29,27], [111,46,37],
  [117,47,53], [135,49,72], [149,61,82], [162,80,80],
  [169,88,76], [178,98,69], [187,109,69], [197,120,63],
  [208,129,55], [223,134,42], [236,138,27], [249,153,13],
  [260,168,16], [276,171,36], [290,150,65], [302,123,80],
  [LENGTH/SEGMENT,94,95],
];
const count=route.length-1;
const worldScale=61;
const wrap=(value,size)=>(value%size+size)%size;
const spline=(a,b,c,d,t)=>b+.5*t*(c-a+t*(2*a-5*b+4*c-d+t*(3*b-a-3*c+d)));

export function mapPose(distance) {
  const segment=wrap(distance,LENGTH)/SEGMENT;
  let i=0;
  while(segment>=route[i+1][0]) i++;
  const a=route[wrap(i-1,count)],b=route[i],c=route[i+1],d=route[(i+2)%count];
  const t=(segment-b[0])/(c[0]-b[0]);
  return {x:spline(a[1],b[1],c[1],d[1],t),y:spline(a[2],b[2],c[2],d[2],t)};
}

export function coursePose(distance,lane=0) {
  const here=mapPose(distance),front=mapPose(distance+16),back=mapPose(distance-16);
  const angle=Math.atan2(front.y-back.y,front.x-back.x);
  const rightX=-Math.sin(angle),rightZ=Math.cos(angle);
  return {x:here.x*worldScale+lane*ROAD*rightX,z:here.y*worldScale+lane*ROAD*rightZ,
    y:roadHeight(distance),angle,rightX,rightZ};
}

export const course=track.map(segment=>({
  segment,point:coursePose(segment.i*SEGMENT),
}));

export function roadPosition(point,lane,raise=0) {
  return {x:point.x+point.rightX*ROAD*lane,z:point.z+point.rightZ*ROAD*lane,y:point.y+raise};
}
