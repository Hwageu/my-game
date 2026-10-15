// 외부 이미지 없이 Canvas 도형, 조명, 그림자를 조합한 정적인 첫 화면입니다.
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const player = { x: 377, y: 292, size: 46, color: "#31ffa6" };
const enemies = [{ x: 210, y: 220, radius: 20 }, { x: 610, y: 245, radius: 20 }, { x: 565, y: 435, radius: 20 }];
const energy = { x: 285, y: 410, size: 16 };

// 같은 모양과 조명을 반복해서 그릴 수 있도록 작은 함수로 나눕니다.
function polygon(points, fill, stroke) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function circle(x, y, r, fill, stroke) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function line(x, y, x2, y2, color, width = 1) {
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.lineWidth = 1;
}
function label(text, x, y, size = 12, color = "#9cabb6", weight = "normal") {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px sans-serif`; ctx.fillText(text, x, y);
}
function glow(x, y, radius, color) {
  const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
  light.addColorStop(0, color); light.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = light; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

// 금속 바닥의 윗면과 옆면 색을 달리해 깊이를 표현합니다.
ctx.fillStyle = "#060a10"; ctx.fillRect(0, 0, 800, 600);
polygon([[34,136],[766,136],[786,508],[14,508]], "#03070b");
polygon([[34,119],[766,119],[786,490],[14,490]], "#17222a", "#40505a");
ctx.save();
ctx.beginPath(); ctx.moveTo(36,121); ctx.lineTo(764,121); ctx.lineTo(782,488); ctx.lineTo(18,488); ctx.closePath(); ctx.clip();
// 바닥 타일마다 미묘하게 다른 금속색을 적용합니다.
for (let row = 0; row < 7; row++) {
  for (let col = 0; col < 12; col++) {
    const x = col * 70 - (row % 2) * 35;
    const y = 122 + row * 60;
    const shade = 28 + (col * 7 + row * 3) % 10;
    ctx.fillStyle = `rgb(${shade},${shade + 9},${shade + 16})`;
    ctx.fillRect(x + 1, y + 1, 68, 58);
    line(x + 3, y + 2, x + 66, y + 2, "#33414a");
    ctx.fillStyle = "#0c141b"; ctx.fillRect(x + 6, y + 7, 2, 2);
    // 細かな擦り傷も固定配置で描き、再読み込みで絵が変わらないようにします。
    line(x + 13, y + 42, x + 25 + col % 9, y + 39, "#ffffff06");
  }
}
// 고정된 작은 흠집으로 표면 질감을 만듭니다.
circle(400, 310, 120, null, "#62717a20");
circle(400, 310, 110, null, "#62717a14");
line(265,310,535,310,"#62717a12"); line(400,175,400,445,"#62717a12");
label("SECTOR", 350, 280, 11, "#82939d22", "bold");
label("07", 337, 349, 88, "#82939d14", "bold");
// 바닥 중앙에 닳은 구역 표식을 그립니다.
for (let x = 68; x < 745; x += 80) {
  ctx.fillStyle = "#050b0f"; ctx.fillRect(x, 142, 43, 9);
  ctx.fillStyle = "#49b8b2"; ctx.fillRect(x + 3, 145, 37, 2);
  line(x,475,x+30,475,"#6f8490",2);
}
for (let i = 0; i < 8; i++) polygon([[50+i*12,167],[57+i*12,167],[47+i*12,179],[40+i*12,179]],"#ad855447");
glow(400,300,280,"rgba(34,114,122,0.13)");
ctx.restore();

// 바닥 유도등과 경고 줄무늬입니다.
polygon([[34,115],[766,115],[754,131],[46,131]],"#33434d","#55616a");
polygon([[14,491],[786,491],[771,511],[29,511]],"#101820","#34454e");
for (let y = 160; y < 470; y += 54) {
  polygon([[23,y],[42,y],[39,y+31],[20,y+31]],"#283842","#43525c");
  polygon([[758,y],[777,y],[780,y+31],[761,y+31]],"#283842","#43525c");
  line(29,y+7,28,y+23,"#71cec2",2); line(771,y+7,772,y+23,"#71cec2",2);
}
for (const x of [85,690]) {
  ctx.fillStyle = "#060b10"; ctx.fillRect(x,112,26,24);
  for(let i=0;i<4;i++) line(x+5,116+i*4,x+21,116+i*4,"#4d5b64",2);
}
// 두꺼운 벽과 조명을 바닥 둘레에 겹칩니다.
function equipment(x,y,w,h) {
  ctx.fillStyle = "#00000050"; ctx.fillRect(x+6,y+8,w,h);
  polygon([[x,y],[x+w-6,y],[x+w,y+6],[x+w,y+h],[x,y+h]],"#1c2b35","#50606a");
  ctx.fillStyle = "#2e404b"; ctx.fillRect(x+4,y+4,w-10,8);
  line(x+9,y+18,x+w-10,y+18,"#121d25",3);
  line(x+9,y+h-8,x+w-10,y+h-8,"#3d535d");
  ctx.fillStyle = "#74b9b1"; ctx.fillRect(x+w-13,y+21,4,4);
}
equipment(69,394,48,56); equipment(126,425,37,30); equipment(681,178,49,45);
label("NORTH / 01",352,155,9,"#8ba1ac69");

// 환경 장식용 장비 상자입니다. 충돌 물체는 아닙니다.
const px = player.x + player.size / 2, py = player.y + player.size / 2;
glow(px,py+9,64,"rgba(38,255,174,0.15)");
ctx.save(); ctx.translate(px,py);
ctx.fillStyle = "#00000070"; ctx.beginPath();ctx.ellipse(6,17,23,12,0,0,Math.PI*2);ctx.fill();
polygon([[-14,8],[-3,9],[-5,25],[-17,25]],"#172a30","#4b6670");
polygon([[4,9],[15,8],[18,25],[5,25]],"#172a30","#4b6670");
polygon([[-18,-9],[17,-9],[20,13],[0,20],[-20,12]],"#4e6c6b","#91ada1");
polygon([[-12,-4],[12,-4],[10,10],[0,15],[-11,9]],"#1b3b3a");
polygon([[-23,-11],[-14,-15],[-11,-3],[-23,1]],"#63837a","#8cac9d");
polygon([[14,-15],[24,-10],[24,2],[13,-3]],"#63837a","#8cac9d");
polygon([[-14,-22],[10,-24],[18,-15],[14,-3],[-11,0],[-19,-10]],"#718c82","#b8c8b5");
polygon([[-14,-16],[11,-18],[14,-11],[8,-7],[-12,-7]],"#082d2b");
ctx.save();ctx.shadowColor=player.color;ctx.shadowBlur=12;
line(-12,-12,10,-13,player.color,3);line(-5,7,5,7,player.color,2);ctx.restore();
line(-15,20,-7,20,"#9cbaae",2);line(8,20,15,20,"#9cbaae",2);
ctx.restore();

// 생존자: 다리, 어깨 장갑, 몸통, 헬멧을 차례로 겹칩니다.
for (const enemy of enemies) {
  ctx.save();ctx.translate(enemy.x,enemy.y);
  ctx.fillStyle="#00000055";ctx.beginPath();ctx.ellipse(5,18,27,10,0,0,Math.PI*2);ctx.fill();
  glow(0,0,55,"rgba(255,45,100,0.12)");
  polygon([[-9,-8],[-27,-16],[-33,-4],[-17,8]],"#3e3a4b","#797080");
  polygon([[9,-8],[27,-16],[33,-4],[17,8]],"#3e3a4b","#797080");
  polygon([[-16,-13],[0,-22],[16,-13],[19,7],[0,18],[-19,7]],"#292a37","#86808b");
  polygon([[-13,-12],[0,-18],[13,-12],[10,-5],[-10,-5]],"#68616d");
  circle(0,0,11,"#0e111b","#aa526c");
  ctx.save();ctx.shadowColor="#ff366f";ctx.shadowBlur=16;
  circle(0,0,5,"#ff477b");circle(-23,-5,2,"#ffaac6");circle(23,-5,2,"#ffaac6");ctx.restore();
  circle(-1,-2,2,"#ffe1eb");line(-7,12,7,12,"#dd557e",2);
  ctx.restore();
}

// 적: 기계 날개와 장갑, 붉은 렌즈를 가진 부유 드론입니다.
const ex=energy.x+energy.size/2, ey=energy.y+energy.size/2;
glow(ex,ey,48,"rgba(166,255,86,0.16)");
ctx.strokeStyle="#b4ec7455";ctx.beginPath();ctx.ellipse(ex,ey+15,17,6,0,0,Math.PI*2);ctx.stroke();
polygon([[ex,ey-14],[ex+10,ey],[ex,ey+13],[ex-10,ey]],"#caff85","#e9ffc8");
polygon([[ex,ey-14],[ex,ey+13],[ex-10,ey]],"#4d9f60");
line(ex,ey-8,ex+5,ey,"#ffffff",2);
// 코어: 떠 있는 결정과 바닥의 빛 고리입니다.
for(let i=0;i<32;i++) {
  const x=60+(i*137)%680,y=170+(i*71)%300;
  ctx.fillStyle=i%3===0?"#b8e3d750":"#b6c7ce18";ctx.fillRect(x,y,1,i%4===0?3:1);
}
// 먼지 입자는 고정 좌표에 그립니다. 움직임은 다음 장에서 추가합니다.
const vignette=ctx.createRadialGradient(400,310,140,400,310,440);
vignette.addColorStop(0,"#00000000");vignette.addColorStop(1,"#00000065");
ctx.fillStyle=vignette;ctx.fillRect(0,100,800,425);

// 주변을 어둡게 하는 효과로 중앙의 주인공을 강조합니다.
ctx.fillStyle="#090e15";ctx.fillRect(0,0,800,99);ctx.fillRect(0,527,800,73);
line(24,98,776,98,"#36434b");line(24,527,776,527,"#36434b");
label("N / S",24,29,13,"#9fddb9","bold");
label("SURVIVAL SYSTEM     /     SECTOR 07",80,28,9,"#849695");
label("NEON SURVIVOR",24,61,30,"#e5ebe6","bold");
label("봉쇄된 구역에서, 끝까지 살아남으세요",26,82,11,"#8a9d9f");
line(414,22,414,77,"#303a43");
label("SCORE",438,30,9);label("0000",437,59,25,"#e9efea","bold");
label("SURVIVAL",546,30,9);label("00:00",545,59,25,"#e9efea","bold");
label("VITALS",667,30,9);label("3 / 3",739,30,9,"#94c9a4");
for(let i=0;i<3;i++) {
  polygon([[667+i*34,42],[693+i*34,42],[689+i*34,58],[663+i*34,58]],"#83c6a0");
}
label("FIELD STATUS",25,550,9,"#60777e");
label("적 03",130,550,11,"#f49aaf");label("에너지 +10",205,550,11,"#bddc8e");
label("체력 3 · 피격 후 1초 무적",310,550,11,"#9bafae");
ctx.textAlign="right";label("NEON SURVIVOR / FIRST LOOK",775,550,9,"#738a91");ctx.textAlign="left";
label("첫 화면 미리보기 · 이동과 충돌은 이후 단계에서 구현합니다",25,581,11,"#778b94");
ctx.textAlign="right";label("800 × 600",775,581,9,"#778b94");ctx.textAlign="left";
