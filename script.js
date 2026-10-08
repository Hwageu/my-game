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
  document.querySelector('meta[name="theme-color"]').content = light ? "#f4f5ef" : "#0b1018";
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
