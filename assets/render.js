// 결과 화면 그리기. 개인 결과 페이지와 공개 자가진단이 같이 쓴다.
// 유형 이름을 붙이지 않고, 학급 참고 막대 위의 위치로만 보여준다. 진단·단정 표현은 쓰지 않는다.
import {
  computeMetrics, compareToClass, travelFor, templateText, goalOptions,
  bed18ToHhmm, minToHhmm, TRAVEL, RULES,
} from "./calc.js";

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
  const row = (label, mine, theirs, bar) => `<div class="metric">
      <div class="row"><span class="label">${label}</span><span class="value">${mine}</span></div>
      ${fin(theirs) ? `<div class="row note"><span>학급 참고 평균</span><span>${theirs}</span></div>` : ""}${bar}</div>`;
  let body = "";
  if (fin(m.sleepMean)) body += row("평균 수면", `${hours1(m.sleepMean)}시간`, fin(mean("sleepMean")) ? `${hours1(mean("sleepMean"))}시간` : NaN,
    cls ? posBar(cls.sleepPct, "짧은 쪽", "긴 쪽") : "");
  if (fin(m.bedResidSd)) body += row("취침 시각 흔들림", `±${Math.round(m.bedResidSd)}분`, fin(mean("bedResidSd")) ? `±${Math.round(mean("bedResidSd"))}분` : NaN,
    cls ? posBar(cls.bedSdPct, "덜 흔들림", "더 흔들림") : "");
  if (fin(m.wakeResidSd)) body += row("기상 시각 흔들림", `±${Math.round(m.wakeResidSd)}분`, fin(mean("wakeResidSd")) ? `±${Math.round(mean("wakeResidSd"))}분` : NaN,
    cls ? posBar(cls.wakeSdPct, "덜 흔들림", "더 흔들림") : "");
  if (!body) return card("한눈에", `<p class="note">기록이 더 필요해요. 흔들림은 ${RULES.minDaysSd}일 이상 기록이 있어야 보여요.</p>`);
  return card("한눈에", `<p>${m.nValid}일 기록 · 보통 ${bed18ToHhmm(m.bedMean18)}쯤 자고 ${minToHhmm(m.wakeMean)}쯤 일어났어요.</p>${body}
    <p class="note">흔들림은 평일·주말 차이를 뺀 뒤, 날마다 앞뒤로 움직인 정도(표준편차)예요.</p>${classNote(ref)}`);
}

function midSleep(m, cls, ref) {
  if (!fin(m.midMean18)) return "";
  return card("수면 중간 시각", `<div class="row"><span>잠든 시각과 일어난 시각의 가운데</span><span class="big">${bed18ToHhmm(m.midMean18)}</span></div>
    ${cls ? posBar(cls.midPct, "이른 쪽", "늦은 쪽") : ""}
    <p class="note">몸의 하루 리듬이 이른 편인지 늦은 편인지 볼 때 쓰는 값이에요. 어느 쪽이 정답이라는 뜻은 없어요.</p>${cls ? classNote(ref) : ""}`);
}

function jetlag(m, cls) {
  const t = travelFor(m.socialJetlag);
  if (!t) return card("사회적 시차", `<p class="note">주말 기록 ${RULES.minWeekend}일, 평일 기록 ${RULES.minWeekday}일 이상이 있어야 계산해요.</p>`);
  const later = m.socialJetlagSigned >= 0 ? "늦게" : "일찍";
  const chips = [`<span class="${t.city ? "" : "on"}">서울</span>`]
    .concat(TRAVEL.map((x) => `<span class="${t.city === x.city ? "on" : ""}">${x.city} ${x.h}h</span>`)).join("");
  const line = t.city
    ? `주말에는 평일보다 수면 중간 시각이 약 <b>${t.hours.toFixed(1)}시간</b> ${later} 와요. 비유하면 주말마다 <b>${t.city}</b>(서울과 ${t.cityHours}시간 차이)에 다녀오는 셈이에요.`
    : `주말과 평일의 수면 중간 시각 차이가 30분이 안 돼요. <b>거의 서울 안</b>에서 지내는 셈이에요.`;
  return card("사회적 시차 · 주말 시차 여행", `<p>${line}</p><div class="trip">${chips}</div>
    ${cls ? posBar(cls.sjPct, "차이 작음", "차이 큼") : ""}
    <p class="note">비유예요. 실제로 시차 증상이 있다는 뜻은 아니고, 평일과 주말 리듬의 차이를 거리로 바꿔 본 거예요.</p>`);
}

function weekdays(m) {
  const any = m.byWeekday.some((w) => fin(w.bed18) || fin(w.wake));
  if (!any) return card("요일별 평균", `<p class="note">요일마다 기록이 ${RULES.minPerWeekday}일 이상 쌓이면 보여줘요.</p>`);
  const rows = m.byWeekday.map((w) => `<tr><td>${WD[w.weekday]}</td><td>${fin(w.bed18) ? bed18ToHhmm(w.bed18) : "–"}</td><td>${fin(w.wake) ? minToHhmm(w.wake) : "–"}</td></tr>`).join("");
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
  return card("나와 비슷한 패턴", `<p><span class="big">${s.count}명</span> <span class="muted">/ ${s.n}명 (약 ${Math.round((s.count / s.n) * 100)}%)</span></p>
    <p>수면 중간 시각이 학급에서 <b>${mid}</b> 쪽이고, 평일·주말 차이가 <b>${sj}</b>인 학생 수예요.</p>
    <p class="note">학급 참고값에서 센 인원이에요. ${RULES.minSimilarCount}명 미만인 묶음은 보여주지 않아요.</p>`);
}

function selfVsMeasured(m, cls, survey) {
  if (!survey) return "";
  let body = "";
  const s = Number(survey.selfRegularity);
  if (s >= 1 && s <= 5 && cls && fin(cls.bedSdPct)) {
    const think = ((s - 1) / 4) * 100, real = 100 - cls.bedSdPct;
    const extra = `<div class="me alt" data-x="${Math.min(97, Math.max(3, think))}" title="내 생각"></div>`;
    body += `<div class="metric"><div class="label">생활 규칙성</div>${posBar(real, "덜 규칙적", "더 규칙적", extra)}
      <p class="note">빈 원: 시작 설문에서 고른 ${s}점(1~5) · 파란 점: 기록으로 본 취침 흔들림의 학급 내 위치</p></div>`;
  }
  const e = Number(survey.expectedWeekendDelayH);
  if (survey.expectedWeekendDelayH !== null && survey.expectedWeekendDelayH !== undefined && survey.expectedWeekendDelayH !== "" && fin(e) && fin(m.wakeGap)) {
    body += `<div class="metric"><div class="label">주말에 늦게 일어나는 시간</div>
      <div class="row"><span>내 생각</span><span class="value">${e.toFixed(1)}시간</span></div>
      <div class="row"><span>기록</span><span class="value">${(m.wakeGap / 60).toFixed(1)}시간</span></div></div>`;
  }
  if (!body) return "";
  return card("내 생각과 기록 비교", body + `<p class="note">생각과 기록이 다른 건 흔한 일이에요. 어느 쪽이 틀렸다는 뜻은 아니에요.</p>`);
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
  let path = "", pen = false;
  pts.forEach((p, i) => { if (fin(p.avg7)) { path += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(p.avg7).toFixed(1)}`; pen = true; } else pen = false; });
  // 기록이 없는 기간(예: 9월 기준선과 본조사 사이)이 7일 이상이면 그래프가 끊긴 이유를 알려 준다
  let gap = 0, run = 0;
  for (const p of pts) { run = fin(p.bed18) ? 0 : run + 1; gap = Math.max(gap, run); }
  const gapNote = gap >= RULES.trendWindow ? ` 기록이 없는 ${gap}일 동안은 선이 끊겨요.` : "";
  return card("취침 시각 추세", `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="날짜별 취침 시각과 7일 평균">${g}${dots}<path class="trend" d="${path}"/></svg>
    <div class="legend"><span><i class="ld"></i>날마다의 취침</span><span><i class="ll"></i>7일 평균(추세)</span></div>
    <p class="note">점이 위아래로 튀는 건 날마다의 흔들림이고, 선이 천천히 움직이는 건 추세예요. 선은 그날까지 7일 중 ${RULES.trendMinValues}일 이상 기록이 있을 때만 그려요.${gapNote}</p>`);
}

function feedback(text, m, storageKey) {
  const goals = goalOptions(m);
  let saved = null;
  try { saved = storageKey ? localStorage.getItem(storageKey) : null; } catch (e) { saved = null; }
  const radios = goals.map((g) => `<label><input type="radio" name="goal" value="${g.id}" ${saved === g.id ? "checked" : ""}><span>${esc(g.text)}</span></label>`).join("");
  return card("설명과 이번 주 목표", `<p>${esc(text)}</p>
    <p><b>이번 주에 해볼 것 하나만 골라 보세요.</b></p><div class="goals">${radios}</div>
    <p class="note">고른 목표는 이 기기 브라우저에만 저장돼요. 다른 곳으로 보내지 않아요.</p>`);
}

export function renderResults(el, { records, survey, classRef, feedbackText, storageKey }) {
  const m = computeMetrics(records);
  if (m.nValid < 3) {
    el.innerHTML = card("결과", `<p>쓸 수 있는 기록이 ${m.nValid}일이에요. 3일 이상이면 보여드릴게요.</p>
      <p class="note">취침이 18:00~06:00 밖이거나, 수면이 3시간 미만·14시간 초과인 날은 계산에서 빠져요.</p>`);
    return m;
  }
  const cls = compareToClass(m, classRef);
  const text = feedbackText || templateText(m, cls);
  el.innerHTML = [glance(m, cls, classRef), midSleep(m, cls, classRef), jetlag(m, cls), weekdays(m), similar(cls),
    selfVsMeasured(m, cls, survey), trendChart(m), feedback(text, m, storageKey)].join("");
  // 보안 정책(CSP)이 HTML 속 style 속성을 막으므로 위치는 그린 뒤 JS로 넣는다
  el.querySelectorAll("[data-x]").forEach((d) => { d.style.left = `${d.dataset.x}%`; });
  el.querySelectorAll('input[name="goal"]').forEach((r) => r.addEventListener("change", () => {
    try { if (storageKey) localStorage.setItem(storageKey, r.value); } catch (e) { /* 저장 못 해도 화면은 그대로 */ }
  }));
  return m;
}
