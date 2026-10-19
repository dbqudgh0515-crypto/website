// 결과 카드가 나타날 때의 움직임. 계산과 문구는 건드리지 않고 보이는 방식만 바꾼다.
// - 카드는 화면에 들어올 때 아래에서 살짝 올라오고, 막대는 자라고, 점은 톡 튀어나오고, 7일 평균선은 그려진다(style.css).
// - 평균 수면 숫자(.countup)는 0부터 차오른다. 끝나면 원래 글자와 똑같은 값이 된다.
// - 움직임 줄이기(prefers-reduced-motion) 설정이면 아무것도 하지 않아 처음부터 다 보인다.
// 길이·지연 시간은 tokens.css의 변수에서 읽는다.

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function tokenMs(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return fallback;
  return v.endsWith("ms") ? n : v.endsWith("s") ? n * 1000 : n;
}

function countUp(el, delay) {
  const to = Number(el.dataset.to), dec = Number(el.dataset.dec || 0), final = el.dataset.final;
  const dur = tokenMs("--dur-count", 900);
  let start = null;
  const step = (now) => {
    if (start === null) start = now + delay;
    const k = Math.min(1, Math.max(0, (now - start) / dur));
    const eased = 1 - (1 - k) ** 3;
    el.textContent = k >= 1 ? final : (to * eased).toFixed(dec);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function animateResults(root) {
  if (reduced() || typeof IntersectionObserver !== "function") return;
  const cards = [...root.children].filter((c) => c.classList.contains("card"));
  // 점은 차례로, 선은 구간 위치에 맞춰 왼쪽부터 (CSS 변수로 넘김: CSP가 막지 않는 CSSOM 방식)
  root.querySelectorAll("svg.chart").forEach((svg) => {
    svg.querySelectorAll(".dot").forEach((d, i) => d.style.setProperty("--i", String(i)));
    svg.querySelectorAll(".trend").forEach((p) => {
      p.style.setProperty("--d0", p.dataset.d0 || "0");
      p.style.setProperty("--dl", p.dataset.dl || "1");
    });
  });
  root.querySelectorAll(".countup").forEach((el) => {
    if (!Number.isFinite(Number(el.dataset.to))) return;
    el.dataset.final = el.textContent;
    el.textContent = (0).toFixed(Number(el.dataset.dec || 0));
  });
  root.classList.add("anim");

  const stagger = tokenMs("--stagger-card", 70);
  const io = new IntersectionObserver((entries) => {
    const shown = entries.filter((e) => e.isIntersecting).map((e) => e.target)
      .sort((a, b) => cards.indexOf(a) - cards.indexOf(b));
    shown.forEach((card, i) => {
      io.unobserve(card);
      const delay = i * stagger;
      card.style.setProperty("--card-delay", `${delay}ms`);
      card.classList.add("in");
      card.querySelectorAll(".countup").forEach((el) => { if (el.dataset.final !== undefined) countUp(el, delay); });
    });
  }, { threshold: 0.12 });
  cards.forEach((c) => io.observe(c));
}
