"use strict";

// HTML의 defer 속성 덕분에 요소가 준비된 뒤 실행됩니다.
document.documentElement.dataset.scriptLoaded = "true";
const root = document.documentElement;
const themeButton = document.querySelector("#themeButton");
const themeStatus = document.querySelector("#themeStatus");
function applyTheme(theme, announce = false) {
  root.dataset.theme = theme;
  const light = theme === "light";
  themeButton.setAttribute("aria-pressed", String(light));
  themeButton.innerHTML = `${light ? "다크" : "라이트"} 테마 <span aria-hidden="true">↗</span>`;
  document.querySelector('meta[name="theme-color"]').content = light ? "#f4f1eb" : "#151515";
  if (announce) themeStatus.textContent = `${light ? "라이트" : "다크"} 테마로 변경했습니다.`;
}
let savedTheme;
try { savedTheme = localStorage.getItem("sj-profile-theme"); } catch { /* 저장이 제한돼도 테마 전환은 동작합니다. */ }
applyTheme(savedTheme === "light" ? "light" : "dark");
themeButton.addEventListener("click", () => {
  const theme = root.dataset.theme === "light" ? "dark" : "light";
  applyTheme(theme, true);
  try { localStorage.setItem("sj-profile-theme", theme); } catch { /* 저장 없이 현재 화면에 적용 */ }
});

// 기존 날짜 표시 기능을 유지합니다.
function updateDate() {
  document.querySelector("#todayDate").textContent = `오늘 날짜: ${new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}`;
}
updateDate();
document.addEventListener("visibilitychange", () => { if (!document.hidden) updateDate(); });

// 등장 효과는 모션 감소 설정을 존중하며, 지원하지 않는 브라우저에서는 본문을 그대로 보여 줍니다.
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
if ("IntersectionObserver" in window && !motionPreference.matches) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll(".reveal").forEach((section) => revealObserver.observe(section));
  motionPreference.addEventListener("change", (event) => {
    if (event.matches) root.classList.remove("motion-enabled");
  });
}

const progress = document.querySelector(".scroll-progress");
const backTop = document.querySelector(".back-top");
const sections = [...document.querySelectorAll("main section[id]")];
const navLinks = [...document.querySelectorAll(".topbar nav a")];
let scrollQueued = false;
function updateScroll() {
  const distance = root.scrollHeight - root.clientHeight;
  const fraction = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
  progress.style.transform = `scaleX(${fraction})`;
  backTop.classList.toggle("visible", window.scrollY > 450);
  let active = sections[0].id;
  sections.forEach((section) => { if (section.getBoundingClientRect().top <= 180) active = section.id; });
  if (distance > 0 && distance - window.scrollY < 5) active = sections[sections.length - 1].id;
  navLinks.forEach((link) => {
    if (link.hash === `#${active}`) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  scrollQueued = false;
}
function queueScroll() {
  if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); }
}
window.addEventListener("scroll", queueScroll, { passive: true });
window.addEventListener("resize", queueScroll);
document.querySelectorAll(".idea").forEach((idea) => idea.addEventListener("toggle", queueScroll));
updateScroll();

// 실패 시 이미지 자리를 유지하고 대체 디자인을 보여 줍니다.
document.querySelectorAll(".game-image").forEach((image) => {
  function updateImage() {
    const loaded = image.complete && image.naturalWidth > 0;
    image.parentElement.classList.toggle("image-loaded", loaded);
    image.hidden = !loaded;
    if (!loaded) {
      image.parentElement.setAttribute("role", "img");
      image.parentElement.setAttribute("aria-label", image.alt + " (이미지를 불러올 수 없음)");
    } else {
      image.parentElement.removeAttribute("role");
      image.parentElement.removeAttribute("aria-label");
    }
  }
  image.addEventListener("load", updateImage);
  image.addEventListener("error", updateImage);
  if (image.complete) updateImage();
});

// Original static concept illustrations. No external assets or animation loop.
function drawGamePreview(canvas) {
  const c = canvas.getContext("2d");
  if (!c) return; // Canvas fallback text remains available.
  const W = 1200, H = 675, scene = canvas.dataset.scene;
  let seed = scene === "neon" ? 31 : scene === "void" ? 79 : 127;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const line = (points, color, width = 2, glow = 0) => {
    c.save(); c.strokeStyle = color; c.lineWidth = width; c.shadowColor = color; c.shadowBlur = glow;
    c.beginPath(); points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.stroke(); c.restore();
  };
  const polygon = (points, fill, stroke, glow = 0) => {
    c.save(); c.fillStyle = fill; c.strokeStyle = stroke; c.lineWidth = 3; c.shadowColor = stroke; c.shadowBlur = glow;
    c.beginPath(); points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); c.fill(); c.stroke(); c.restore();
  };
  const orb = (x,y,r,color) => {
    const g = c.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,color); g.addColorStop(1,"transparent");
    c.fillStyle=g; c.fillRect(x-r,y-r,r*2,r*2);
  };
  const ring = (x,y,r,color,width=2) => {
    c.save(); c.strokeStyle=color; c.lineWidth=width; c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.stroke(); c.restore();
  };
  c.fillStyle = "#080e1d"; c.fillRect(0,0,W,H);
  if (scene === "neon") {
    orb(620,310,500,"#164753"); orb(1000,120,350,"#381c49");
    // Arena floor, circuit traces and illuminated boundary.
    for(let y=220;y<760;y+=55) line([[0,y],[W,y]],"#47e8d51c");
    for(let x=-800;x<2100;x+=120) line([[600+(x-600)*.18,140],[x,H]],"#47e8d527");
    polygon([[150,205],[985,180],[1110,520],[130,550]],"#061a2544","#44f9d9",14);
    line([[220,270],[365,270],[365,225],[820,225]],"#3ae3d666",3,5);
    line([[250,485],[460,485],[460,525],[850,525]],"#3ae3d666",3,5);
    ring(600,375,126,"#64ffe138",2); ring(600,375,92,"#64ffe17a",3);
    orb(600,375,115,"#24e6c83c");
    // Survivor, with directional light and a short motion trail.
    line([[510,410],[570,385],[600,375]],"#63ffe3",5,18);
    polygon([[600,338],[628,375],[600,410],[572,375]],"#b2fff0","#5dffe4",28);
    polygon([[600,351],[614,375],[600,392],[586,375]],"#143c4a","#effffb",4);
    [[300,330],[855,290],[910,455],[390,480],[690,225]].forEach(([x,y],i)=>{
      orb(x,y,55,"#fa397d22");
      polygon([[x,y-19],[x+22,y],[x,y+19],[x-22,y]],"#491d37","#ff4c8c",18);
      line([[x-10,y],[x+10,y]],"#ffb5ce",2,4);
      line([[x,y],[600+(x-600)*.5,375+(y-375)*.5]],"#ff4c8c22",1);
    });
    [[460,290],[755,465],[780,350]].forEach(([x,y])=>{
      polygon([[x,y-9],[x+9,y],[x,y+9],[x-9,y]],"#eaff96","#baff58",16);
    });
    for(let i=0;i<70;i++){c.fillStyle=i%3?'#63ffe355':'#ff6da455';c.fillRect(130+random()*940,150+random()*400,2,2);}
  } else if (scene === "void") {
    orb(760,270,530,"#37276d"); orb(290,430,400,"#0e4d70");
    for(let i=0;i<260;i++){
      const x=random()*W,y=random()*H,r=random()*1.7+.4;
      c.fillStyle=`rgba(207,223,255,${random()*.7+.2})`;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
      if(i%40===0){line([[x-6,y],[x+6,y]],"#c8dbff88");line([[x,y-6],[x,y+6]],"#c8dbff88");}
    }
    // Backlit planet and orbital arc.
    const planet = c.createRadialGradient(850,160,15,935,250,180);
    planet.addColorStop(0,"#588eaa");planet.addColorStop(.55,"#243f68");planet.addColorStop(1,"#090d22");
    c.fillStyle=planet;c.beginPath();c.arc(935,250,170,0,Math.PI*2);c.fill();
    ring(935,250,173,"#7dcfff7a",3);
    c.save();c.translate(935,250);c.rotate(-.4);c.strokeStyle="#b3afff44";c.lineWidth=4;c.beginPath();c.ellipse(0,0,240,52,0,0,Math.PI*2);c.stroke();c.restore();
    // Irregular shaded asteroids.
    [[240,230,58],[770,440,72],[415,110,30],[1070,520,47],[340,510,32]].forEach(([x,y,r])=>{
      line([[x-100,y+80],[x-40,y+30]],"#b2a3ee22",3);
      const points=Array.from({length:9},(_,i)=>{const a=i/9*Math.PI*2,rr=r*(.7+random()*.4);return [x+Math.cos(a)*rr,y+Math.sin(a)*rr];});
      const g=c.createLinearGradient(x-r,y-r,x+r,y+r);g.addColorStop(0,"#8890ae");g.addColorStop(.5,"#36354e");g.addColorStop(1,"#151928");
      polygon(points,g,"#9a91b366");ring(x-r*.2,y-r*.15,r*.22,"#171b3299",6);ring(x+r*.25,y+r*.2,r*.14,"#1b203699",4);
    });
    // Ship and blue engine plume.
    orb(560,440,150,"#36beff3a");
    const exhaust=c.createLinearGradient(565,400,480,620);exhaust.addColorStop(0,"#cfffff");exhaust.addColorStop(.3,"#44bdffbb");exhaust.addColorStop(1,"#44bdff00");
    polygon([[564,398],[590,427],[482,615]],exhaust,"#54cfff11");
    polygon([[635,282],[655,426],[611,402],[563,436],[588,368]],"#d6e8f5","#8be9ff",20);
    polygon([[635,300],[636,369],[612,383]],"#153c62","#50d8ff",6);
    line([[591,379],[568,419]],"#ca94ff",5,12);line([[645,395],[654,421]],"#ca94ff",5,12);
  } else {
    orb(620,290,540,"#382152"); orb(670,420,290,"#075b68");
    // Perspective city corridor and reflected neon rails.
    const vx=640,vy=250;
    for(let x=-700;x<2100;x+=110) line([[vx,vy],[x,H]],"#f65cb129");
    for(let y=300;y<H;y+=45) line([[0,y],[W,y]],"#ec6bad20");
    for(let side=0;side<2;side++)for(let i=0;i<5;i++){
      const x=side?850+i*92:270-i*92,y=185-i*27,w=55+i*13,h=190+i*30;
      polygon([[x,y],[x+w,y+15],[x+w,y+h],[x,y+h+18]],"#14152d","#ab4c9f66");
      line([[x+8,y+15],[x+8,y+h-8]],i%2?"#fd59b8":"#61e7fb",3,12);
      for(let j=0;j<4;j++)line([[x+18,y+35+j*30],[x+w-8,y+40+j*30]],"#a075b455",2);
    }
    line([[40,640],[550,292]],"#fa50ad",5,18);line([[1160,640],[745,292]],"#fa50ad",5,18);
    // Portal at the vanishing point.
    orb(647,270,135,"#3affd94d");
    polygon([[600,180],[700,180],[700,345],[600,345]],"#063640","#6bffe6",24);
    polygon([[610,190],[690,190],[690,335],[610,335]],"#78ffe916","#9affec",3);
    for(let y=205;y<325;y+=14)line([[614,y],[686,y]],"#7affdf44",2);
    // Collectible data cubes.
    [[480,365],[785,400],[550,485]].forEach(([x,y])=>{
      orb(x,y,44,"#e05aff38");
      polygon([[x,y-18],[x+18,y-8],[x,y+2],[x-18,y-8]],"#ffd1ff","#f780ff",10);
      polygon([[x-18,y-8],[x,y+2],[x,y+23],[x-18,y+12]],"#722b9c","#f780ff",8);
      polygon([[x,y+2],[x+18,y-8],[x+18,y+12],[x,y+23]],"#3b246e","#f780ff",8);
    });
    // Runner silhouette facing the exit.
    c.save();c.fillStyle="#091121";c.strokeStyle="#7bf3fc";c.lineWidth=3;c.shadowColor="#59dfff";c.shadowBlur=12;
    c.beginPath();c.arc(662,406,17,0,Math.PI*2);c.fill();c.stroke();c.restore();
    polygon([[648,428],[678,428],[687,481],[640,481]],"#111831","#7bf3fc",8);
    line([[648,438],[630,470],[614,480]],"#7bf3fc",7,6);line([[678,438],[700,451],[713,433]],"#7bf3fc",7,6);
    line([[650,481],[639,515],[621,535]],"#8bf5ff",8,8);line([[675,481],[686,513],[711,523]],"#8bf5ff",8,8);
    line([[646,448],[677,448]],"#fd7dbf",5,12);
    for(let i=0;i<60;i++){c.fillStyle="#ee76ed66";c.fillRect(360+random()*480,170+random()*370,2,4);}
  }
  // Subtle cinematic vignette; subject stays within the centered crop safe area.
  const vignette=c.createRadialGradient(600,340,160,600,340,710);
  vignette.addColorStop(0,"transparent");vignette.addColorStop(1,"#030713b0");c.fillStyle=vignette;c.fillRect(0,0,W,H);
  canvas.dataset.rendered="true";
}
document.querySelectorAll(".preview-canvas").forEach(drawGamePreview);
