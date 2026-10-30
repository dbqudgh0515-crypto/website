// 결과 화면 그리기. 개인 결과 페이지와 공개 자가진단이 같이 쓴다.
// 유형 이름을 붙이지 않고, 학급 참고 막대 위의 위치로만 보여준다. 진단·단정 표현은 쓰지 않는다.
import {
  computeMetrics, compareToClass, travelFor, templateText, goalOptions, cleanRecords,
  bed18ToHhmm, minToHhmm, TRAVEL, RULES,
} from "./calc.js";
import { animateResults } from "./motion.js";
import { PLAN_EXAMPLES, TIPS, SOURCES } from "./goals.js";
import { OECD_SLEEP, KR_TEEN_WEEKDAY, WORLD_SOURCES } from "./world.js";
import { submitNetlifyForm } from "./netlify-form.js";

const WD = ["월", "화", "수", "목", "금", "토", "일"];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fin = Number.isFinite;
const hours1 = (min) => (Math.round(min / 6) / 10).toFixed(1);
const card = (title, body) => `<section class="card"><h2>${title}</h2>${body}</section>`;

function posBar(pct, left, right, extra = "") {
  if (!fin(pct)) return "";
  const p = Math.min(97, Math.max(3, pct));
  return `<div class="posbar" role="img" aria-label="학급 참고 막대에서 ${left} 0, ${right} 100 중 약 ${Math.round(pct)} 위치">
    <div class="track"></div><div class="band"></div><div class="mid"></div>
    ${extra}<div class="me" data-x="${p}"></div></div>
    <div class="ends"><span>${left}</span><span>${right}</span></div>`;
}

function classNote(ref) {
  if (!ref) return "";
  return `<p class="note">막대: 파란 점이 나, 옅은 띠는 학급 가운데 80%, 세로줄은 학급 가운데값이에요.
  <b>우리 학급 ${ref.n}명 기준 참고값</b>${ref.label ? ` (${esc(ref.label)})` : ""}이에요.</p>`;
}

function glance(m, cls, ref) {
  const mean = (k) => (ref && ref.means && fin(ref.means[k]) ? ref.means[k] : NaN);
  // theirs: 학급 참고 평균을 화면에 쓸 글자. 학급 참고값에 평균이 없으면 null이라 줄을 빼고 보여준다
  const classMean = (theirs) => (theirs ? `<div class="row note"><span>학급 참고 평균</span><span>${theirs}</span></div>` : "");
  const row = (label, mine, theirs, bar) => `<div class="metric">
      <div class="row"><span class="label">${label}</span><span class="value">${mine}</span></div>
      ${classMean(theirs)}${bar}</div>`;
  let body = "";
  if (fin(m.sleepMean)) {
    const h = hours1(m.sleepMean), theirs = fin(mean("sleepMean")) ? `${hours1(mean("sleepMean"))}시간` : null;
    body += `<div class="metric hero"><div class="label">평균 수면</div>
      <div class="hero-num"><span class="num countup" data-to="${h}" data-dec="1">${h}</span><span class="unit">시간</span></div>
      ${classMean(theirs)}${cls ? posBar(cls.sleepPct, "짧은 쪽", "긴 쪽") : ""}</div>`;
  }
  if (fin(m.bedResidSd)) body += row("취침 시각 편차", `±${Math.round(m.bedResidSd)}분`, fin(mean("bedResidSd")) ? `±${Math.round(mean("bedResidSd"))}분` : null,
    cls ? posBar(cls.bedSdPct, "편차 작음", "편차 큼") : "");
  if (fin(m.wakeResidSd)) body += row("기상 시각 편차", `±${Math.round(m.wakeResidSd)}분`, fin(mean("wakeResidSd")) ? `±${Math.round(mean("wakeResidSd"))}분` : null,
    cls ? posBar(cls.wakeSdPct, "편차 작음", "편차 큼") : "");
  if (!body) return card("한눈에", `<p class="note">기록이 더 필요해요. 편차는 ${RULES.minDaysSd}일 이상 기록이 있어야 보여요.</p>`);
  return card("한눈에", `<p>${m.nValid}일 기록 · 보통 ${bed18ToHhmm(m.bedMean18)}쯤 자고 ${minToHhmm(m.wakeMean)}쯤 일어났어요.</p>${body}
    <p class="note">편차는 평일·주말 차이를 뺀 뒤, 날마다 앞뒤로 움직인 정도(표준편차)예요.</p>${classNote(ref)}`);
}

function midSleep(m, cls, ref) {
  if (!fin(m.midMean18)) return "";
  return card("수면 중간 시각", `<div class="lead"><span>잠든 시각과 일어난 시각의 평균</span><span class="big">${bed18ToHhmm(m.midMean18)}</span></div>
    ${cls ? posBar(cls.midPct, "이른 쪽", "늦은 쪽") : ""}
    <p class="note">몸의 하루 리듬이 이른 편인지 늦은 편인지 볼 때 쓰는 값이에요.</p>${cls ? classNote(ref) : ""}`);
}

function jetlag(m, cls) {
  const t = travelFor(m.socialJetlag);
  if (!t) return card("사회적 시차", `<p class="note">주말 기록 ${RULES.minWeekend}일, 평일 기록 ${RULES.minWeekday}일 이상이 있어야 계산해요.</p>`);
  const later = m.socialJetlagSigned >= 0 ? "늦게" : "일찍";
  const chips = [`<span class="home${t.city ? "" : " on"}">서울</span>`]
    .concat(TRAVEL.map((x) => `<span class="${t.city === x.city ? "on" : ""}">${x.city} ${x.h}h</span>`)).join("");
  const line = t.city
    ? `주말에는 평일보다 수면 중간 시각이 약 <b>${t.hours.toFixed(1)}시간</b> ${later} 와요. 비유하면 주말마다 <b>${t.city}</b>(서울과 ${t.cityHours}시간 차이)에 다녀오는 셈이에요.`
    : `주말과 평일의 수면 중간 시각 차이가 30분이 안 돼요. <b>거의 서울 안</b>에서 지내는 셈이에요.`;
  return card("사회적 시차 · 주말 시차 여행", `<p>${line}</p><div class="trip">${chips}</div>
    ${cls ? posBar(cls.sjPct, "차이 작음", "차이 큼") : ""}`);
}

function weekdays(m) {
  const any = m.byWeekday.some((w) => fin(w.bed18) || fin(w.wake));
  if (!any) return card("요일별 평균", `<p class="note">요일마다 기록이 ${RULES.minPerWeekday}일 이상 쌓이면 보여줘요.</p>`);
  const rows = m.byWeekday.map((w) => `<tr><td${w.weekday >= 5 ? ' class="we"' : ""}>${WD[w.weekday]}</td><td>${fin(w.bed18) ? bed18ToHhmm(w.bed18) : "–"}</td><td>${fin(w.wake) ? minToHhmm(w.wake) : "–"}</td></tr>`).join("");
  return card("요일별 평균", `<table><tr><th>요일</th><th>그날 밤 잠든 시각</th><th>그날 아침 일어난 시각</th></tr>${rows}</table>
    <p class="note">요일마다 기록이 ${RULES.minPerWeekday}일 미만이면 "–"로 숨겨요. 하루짜리 값은 우연이 크기 때문이에요.</p>`);
}

function similar(cls) {
  const s = cls && cls.similar;
  if (!s) return "";
  if (s.count === null || s.count < RULES.minSimilarCount)
    return card("나와 비슷한 패턴", `<p class="note">비슷한 패턴의 학급 인원이 ${RULES.minSimilarCount}명 미만이라 숫자를 보여주지 않아요.</p>`);
  const mid = ["이른", "가운데", "늦은"][s.midBin];
  const sj = s.sjBin ? "1시간 이상" : "1시간 미만";
  return card("나와 비슷한 패턴", `<p class="count"><span class="big">${s.count}명</span> <span class="muted">/ ${s.n}명 (약 ${Math.round((s.count / s.n) * 100)}%)</span></p>
    <p>수면 중간 시각이 학급에서 <b>${mid}</b> 쪽이고, 평일·주말 차이가 <b>${sj}</b>인 학생 수예요.</p>
    <p class="note">학급 참고값에서 센 인원이에요. ${RULES.minSimilarCount}명 미만인 묶음은 보여주지 않아요.</p>`);
}

// "7시간 51분"처럼. 1시간이 안 되면 "17분", 딱 떨어지면 "8시간"
function hm(min) {
  const t = Math.round(min), h = Math.floor(t / 60), mi = t % 60;
  if (!h) return `${mi}분`;
  return mi ? `${h}시간 ${mi}분` : `${h}시간`;
}
// 앞 낱말에 받침이 있으면 a, 없으면 b (예: 영국이에요, 캐나다예요)
function josa(word, a, b) {
  const c = String(word).trim().slice(-1).charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b;
}
function srcLink(s) {
  return `<span class="src"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"
    aria-label="출처: ${esc(s.name)}, ${esc(s.lang)} 자료, 새 탭에서 열려요">출처: ${esc(s.name)}</a><span class="lang">${esc(s.lang)}</span></span>`;
}

// 세계와 비교: OECD가 모은 33개 나라의 하루 평균 수면 순위(한국의 자리)와, 그 사이에 내 평균을 넣어 본 자리(순위표에만),
// 한국 중고등학생 주중 평균. 숫자는 world.js의 출처 그대로이고 위치만 보여 준다. rows는 cleanRecords 결과(평일 평균 계산용).
// 목표 카드 뒤 맨 아래에 둔다: 결과 → 목표·계획 제출이라는 핵심 흐름을 길게 만들지 않으려고(2026-10-27).
function world(m, rows) {
  if (!fin(m.sleepMean)) return "";
  const list = OECD_SLEEP, mine = m.sleepMean;
  const all = list.map((c) => ({ ...c })).concat({ name: "나", min: mine, me: true }).sort((a, b) => b.min - a.min);
  const meI = all.findIndex((r) => r.me), krI = all.findIndex((r) => r.name === "한국");
  const kr = list.find((c) => c.name === "한국"), krRank = list.indexOf(kr) + 1;
  const top = list[0], last = list[list.length - 1];
  const avg = list.reduce((s, c) => s + c.min, 0) / list.length;
  const lo = 360, hi = Math.max(top.min, mine);                      // 막대는 6시간에서 시작해 차이가 잘 보이게
  const w = (v) => Math.min(100, Math.max(3, ((v - lo) / (hi - lo)) * 100)).toFixed(1);
  const li = (r, i) => `<li class="lb-row${r.me ? " me" : ""}${r.name === "한국" ? " kr" : ""}"><span class="lb-rank">${i + 1}</span>`
    + `<span class="lb-name">${esc(r.name)}</span><span class="lb-time">${hm(r.min)}</span><span class="lb-bar"><i data-w="${w(r.min)}"></i></span></li>`;
  const show = [...new Set([0, 1, 2, meI - 1, meI, meI + 1, krI, all.length - 1])].filter((i) => i >= 0 && i < all.length).sort((a, b) => a - b);
  let short = "", prev = -1;
  for (const i of show) {
    if (i > prev + 1) short += `<li class="lb-gap" aria-hidden="true">⋯</li>`;
    short += li(all[i], i);
    prev = i;
  }
  const diff = top.min - kr.min;
  const facts = [
    `가장 짧은 나라는 ${last.name}(${hm(last.min)}), 가장 긴 나라는 ${top.name}(${hm(top.min)})${josa(top.name, "이에요", "예요")}.
      ${top.name}${josa(top.name, "과", "와")} 한국은 하루 ${hm(diff)} 차이라서, 1년이면 약 ${Math.round((diff * 365) / 1440)}일이에요.`,
    `${list.length}개 나라 평균은 ${hm(avg)}이에요. 내 평균과는 하루 ${hm(Math.abs(avg - mine))} 차이예요.`,
    `내 평균대로라면 1년에 약 ${Math.round((mine * 365) / 1440)}일을 자는 셈이에요.`,
  ];
  const wd = rows.filter((r) => !r.weekend && fin(r.sleep)).map((r) => r.sleep);
  const myWd = wd.length >= RULES.minWeekday ? wd.reduce((s, x) => s + x, 0) / wd.length : NaN;
  const t = KR_TEEN_WEEKDAY;
  const teen = `<div class="metric"><div class="label">한국 중고등학생과 비교 (학교 가는 날)</div>
    ${fin(myWd) ? `<div class="row"><span>내 평일 평균</span><span class="value">${(myWd / 60).toFixed(1)}시간</span></div>` : ""}
    <div class="row note"><span>${t.year}년 남학생 주중 평균</span><span>${t.boys.toFixed(1)}시간</span></div>
    <div class="row note"><span>${t.year}년 여학생 주중 평균</span><span>${t.girls.toFixed(1)}시간</span></div>
    ${fin(myWd) ? "" : `<p class="note">평일 기록이 ${RULES.minWeekday}일 이상이면 내 평일 평균도 함께 보여줘요.</p>`}</div>`;
  return card("세계와 비교", `<div class="lead"><span>한국은 하루 평균 ${hm(kr.min)}을 자요. OECD가 모은 ${list.length}개 나라 중</span>
    <span class="big"><span class="countup" data-to="${krRank}" data-dec="0">${krRank}</span>번째<span class="of"> / ${list.length}개 나라</span></span></div>
    <ol class="lb" aria-label="하루 평균 수면이 긴 순서, 나를 넣은 표">${short}</ol>
    <details class="lb-more"><summary>${all.length}자리 전체 보기</summary><ol class="lb">${all.map(li).join("")}</ol></details>
    <ul class="facts">${facts.map((f) => `<li>${f}</li>`).join("")}</ul>
    ${teen}
    <p class="note">나라별 값은 대부분 15~64세의 하루 평균 수면으로, 평일과 주말을 합친 값이에요. 조사 연도는 나라마다 달라요(1998~2019년, 한국 ${kr.year}년).
    중고등학생 값은 학교 가는 날의 평균이에요.</p>
    <div class="srcs">${srcLink(WORLD_SOURCES.oecd)}${srcLink(WORLD_SOURCES.kdca)}</div>`);
}

function selfVsMeasured(m, cls, survey) {
  if (!survey) return "";
  let body = "";
  const s = Number(survey.selfRegularity);
  if (s >= 1 && s <= 5 && cls && fin(cls.bedSdPct)) {
    const think = ((s - 1) / 4) * 100, real = 100 - cls.bedSdPct;
    const extra = `<div class="me alt" data-x="${Math.min(97, Math.max(3, think))}" title="내 생각"></div>`;
    body += `<div class="metric"><div class="label">생활 규칙성</div>${posBar(real, "덜 규칙적", "더 규칙적", extra)}
      <p class="note">빈 원: 시작 설문에서 고른 ${s}점(1~5) · 파란 점: 기록으로 본 취침 시각 편차의 학급 내 위치</p></div>`;
  }
  const e = Number(survey.expectedWeekendDelayH);
  if (survey.expectedWeekendDelayH !== null && survey.expectedWeekendDelayH !== undefined && survey.expectedWeekendDelayH !== "" && fin(e) && fin(m.wakeGap)) {
    body += `<div class="metric"><div class="label">주말에 늦게 일어나는 시간</div>
      <div class="row"><span>내 생각</span><span class="value">${e.toFixed(1)}시간</span></div>
      <div class="row"><span>기록</span><span class="value">${(m.wakeGap / 60).toFixed(1)}시간</span></div></div>`;
  }
  if (!body) return "";
  return card("내 생각과 기록 비교", body + `<p class="note">생각과 기록이 다른 건 흔한 일이에요.</p>`);
}

function trendChart(m) {
  const pts = m.trend;
  const ys = pts.flatMap((p) => [p.bed18, p.avg7]).filter(fin);
  if (pts.length < RULES.trendWindow || !ys.length) return card("취침 시각 추세", `<p class="note">${RULES.trendWindow}일 이상 기록하면 추세를 보여줘요.</p>`);
  const W = 320, H = 180, L = 40, R = 8, T = 10, B = 26;
  let lo = Math.floor((Math.min(...ys) - 15) / 60) * 60, hi = Math.ceil((Math.max(...ys) + 15) / 60) * 60;
  const x = (i) => L + (pts.length === 1 ? 0 : (i / (pts.length - 1)) * (W - L - R));
  const y = (v) => T + ((v - lo) / (hi - lo)) * (H - T - B);           // 아래로 갈수록 늦게 잠
  let g = "";
  const step = hi - lo > 360 ? 120 : 60;
  for (let v = lo; v <= hi; v += step) g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 4}" y="${y(v) + 3}" text-anchor="end">${bed18ToHhmm(v)}</text>`;
  const ticks = [0, Math.floor((pts.length - 1) / 2), pts.length - 1];
  ticks.forEach((i, j) => { g += `<text x="${x(i)}" y="${H - 8}" text-anchor="${["start", "middle", "end"][j]}">${pts[i].date.slice(5).replace("-", "/")}</text>`; });
  const dots = pts.map((p, i) => (fin(p.bed18) ? `<circle class="dot" cx="${x(i)}" cy="${y(p.bed18)}" r="4"/>` : "")).join("");
  const segs = [];
  let seg = null;
  pts.forEach((p, i) => {
    if (!fin(p.avg7)) { seg = null; return; }
    if (!seg) { seg = { d: "", x0: x(i), x1: x(i) }; segs.push(seg); }
    seg.d += `${seg.d ? "L" : "M"}${x(i).toFixed(1)},${y(p.avg7).toFixed(1)}`;
    seg.x1 = x(i);
  });
  const span = W - L - R;
  const lines = segs.map((s) => `<path class="trend" pathLength="1" data-d0="${((s.x0 - L) / span).toFixed(3)}" data-dl="${Math.max(0.05, (s.x1 - s.x0) / span).toFixed(3)}" d="${s.d}"/>`).join("");
  // 기록이 없는 기간(예: 9월 기준선과 본조사 사이)이 7일 이상이면 그래프가 끊긴 이유를 알려 준다
  let gap = 0, run = 0;
  for (const p of pts) { run = fin(p.bed18) ? 0 : run + 1; gap = Math.max(gap, run); }
  const gapNote = gap >= RULES.trendWindow ? ` 기록이 없는 ${gap}일 동안은 선이 끊겨요.` : "";
  return card("취침 시각 추세", `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="날짜별 취침 시각과 7일 평균">${g}${dots}${lines}</svg>
    <div class="legend"><span><i class="ld"></i>날마다의 취침</span><span><i class="ll"></i>7일 평균(추세)</span></div>
    <p class="note">점이 위아래로 튀는 건 날마다의 차이이고, 선이 천천히 움직이는 건 추세예요. 선은 그날까지 7일 중 ${RULES.trendMinValues}일 이상 기록이 있을 때만 그려요.${gapNote}</p>`);
}

// 목표 하나를 고르면 그 목표의 실천 계획 예시와 팁(출처 링크)이 보인다. 팁이 아직 없으면 예시만 보인다.
function goalHelp(g) {
  const tips = TIPS[g.id] || [];
  const tip = (t) => {
    const s = SOURCES[t.src];
    if (!s) return "";
    return `<li>${esc(t.text)}<span class="src"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"
      aria-label="출처: ${esc(s.name)}, ${esc(s.lang)} 페이지, 새 탭에서 열려요">출처: ${esc(s.name)}</a><span class="lang">${esc(s.lang)}</span></span></li>`;
  };
  const list = tips.length ? `<p class="help-title">도움이 되는 방법</p><ul class="tips">${tips.map(tip).join("")}</ul>` : "";
  return `<div class="goal-help" data-goal="${g.id}" hidden>
    <p class="help-title">실천 계획 예시</p><p class="plan-line">${esc(PLAN_EXAMPLES[g.id] || "")}</p>${list}</div>`;
}

// withForm이면(개인 결과 페이지) 이 페이지 안에서 목표와 실천 계획 한 줄을 제출한다(Netlify Forms "goal-submit").
// 확인 코드는 숨은 칸으로 자동으로 붙는다. 없으면(공개 자가진단) 제출 없이, 고른 목표는 이 기기에만 저장된다고 알린다.
// goalUntil(예: "11월 20일")이 있으면(개인 결과 페이지) 목표 기간을 조사 끝날까지로 적는다.
// 받는 날에 따라 남은 기간이 7~13일이라 "이번 주"라고 하면 일주일 뒤 그만둘 수 있기 때문이다.
function feedback(text, m, storageKey, withForm, goalUntil) {
  const goals = goalOptions(m);
  let saved = null;
  try { saved = storageKey ? localStorage.getItem(storageKey) : null; } catch (e) { saved = null; }
  const radios = goals.map((g) => `<label><input type="radio" name="goal" value="${g.id}" ${saved === g.id ? "checked" : ""}><span>${esc(g.text)}</span></label>`).join("");
  const submit = withForm
    ? `<form class="goal-form" novalidate>
      <label class="field-label" for="goal-plan">실천 계획 한 줄 <span class="req">필수</span></label>
      <input id="goal-plan" name="plan" type="text" maxlength="200" autocomplete="off" placeholder="만약 ~하면, ~한다." required>
      <p class="hp" aria-hidden="true"><label>비워 두세요 <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
      <button type="submit" class="primary goal-submit" disabled>목표와 계획 제출하기</button>
      <p class="form-msg" role="status" aria-live="polite"></p>
    </form>
    <p class="note">목표를 고르고 실천 계획 한 줄을 쓴 뒤 제출해 주세요. 이름 대신 확인 코드만 함께 보내고, 제출해야 연구자에게 전해져요. 다시 제출하면 마지막에 낸 것으로 바뀌어요.</p>`
    : `<p class="note">고른 목표는 이 기기 브라우저에만 저장돼요. 다른 곳으로 보내지 않아요.</p>`;
  const title = goalUntil ? `설명과 ${esc(goalUntil)}까지의 목표` : "설명과 이번 주 목표";
  const ask = goalUntil ? `${esc(goalUntil)}까지 해 볼 것 하나만 골라 보세요.` : "이번 주에 해볼 것 하나만 골라 보세요.";
  return card(title, `<p>${esc(text)}</p>
    <p><b>${ask}</b></p><div class="goals">${radios}</div>${goals.map(goalHelp).join("")}${submit}`);
}

// 목표 제출: 같은 사이트로 POST. 성공·실패를 알려 주고, 실패해도 쓴 글은 그대로 둔다(이 기기에도 임시 저장).
function setupGoalForm(form, { goals, chosen, ready, checkCode, draftKey }) {
  const msg = form.querySelector(".form-msg"), btn = form.querySelector(".goal-submit");
  try { const d = draftKey && localStorage.getItem(draftKey); if (d) form.plan.value = d; } catch (e) { /* 없으면 빈칸 */ }
  form.plan.addEventListener("input", () => {
    ready();
    try { if (draftKey) localStorage.setItem(draftKey, form.plan.value); } catch (e) { /* 저장 못 해도 진행 */ }
  });
  ready();
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const c = chosen(), plan = form.plan.value.trim();
    if (!c || !plan) { msg.className = "form-msg err"; msg.textContent = "목표를 고르고 실천 계획 한 줄을 써 주세요."; return; }
    const goal = goals.find((x) => x.id === c.value);
    btn.disabled = true; msg.className = "form-msg"; msg.textContent = "보내는 중이에요…";
    const ok = await submitNetlifyForm("goal-submit", { code: checkCode, goal: goal ? goal.text : c.value, plan,
      "bot-field": form.elements["bot-field"].value });
    msg.className = ok ? "form-msg ok" : "form-msg err";
    msg.textContent = ok ? "제출했어요. 고마워요. 다시 제출하면 마지막에 낸 것으로 바뀌어요."
      : "제출하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요. 쓴 내용은 그대로 있어요.";
    ready();
  });
}

export function renderResults(el, { records, survey, classRef, feedbackText, storageKey, checkCode, goalUntil }) {
  const m = computeMetrics(records);
  if (m.nValid < 3) {
    el.innerHTML = card("결과", `<p>쓸 수 있는 기록이 ${m.nValid}일이에요. 3일 이상이면 보여드릴게요.</p>
      <p class="note">취침이 18:00~06:00 밖이거나, 수면이 3시간 미만·14시간 초과인 날은 계산에서 빠져요.</p>`);
    return m;
  }
  const cls = compareToClass(m, classRef);
  const text = feedbackText || templateText(m, cls);
  const goals = goalOptions(m);
  const formOk = /^[0-9a-f]{8}$/.test(checkCode || "");      // 개인 결과 페이지에서만 확인 코드가 있다
  el.innerHTML = [glance(m, cls, classRef), midSleep(m, cls, classRef), jetlag(m, cls), weekdays(m), similar(cls),
    selfVsMeasured(m, cls, survey), trendChart(m), feedback(text, m, storageKey, formOk, goalUntil), world(m, cleanRecords(records))].join("");
  // 보안 정책(CSP)이 HTML 속 style 속성을 막으므로 위치와 막대 길이는 그린 뒤 JS로 넣는다
  el.querySelectorAll("[data-x]").forEach((d) => { d.style.left = `${d.dataset.x}%`; });
  el.querySelectorAll("[data-w]").forEach((d) => { d.style.width = `${d.dataset.w}%`; });
  animateResults(el);
  const form = el.querySelector(".goal-form");
  const chosen = () => el.querySelector('input[name="goal"]:checked');
  const ready = () => { if (form) form.querySelector(".goal-submit").disabled = !(chosen() && form.plan.value.trim()); };
  const choose = (id) => {
    el.querySelectorAll(".goal-help").forEach((h) => { h.hidden = h.dataset.goal !== id; });
    ready();
  };
  if (chosen()) choose(chosen().value);
  el.querySelectorAll('input[name="goal"]').forEach((r) => r.addEventListener("change", () => {
    choose(r.value);
    try { if (storageKey) localStorage.setItem(storageKey, r.value); } catch (e) { /* 저장 못 해도 화면은 그대로 */ }
  }));
  if (form) setupGoalForm(form, { goals, chosen, ready, checkCode, draftKey: storageKey ? `${storageKey}-plan` : null });
  return m;
}
