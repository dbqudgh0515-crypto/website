// 생활리듬 계산 엔진. 브라우저와 Node에서 똑같이 쓴다.
// tools/metrics_ref.py 가 같은 계산을 파이썬으로 한다. 둘이 같은지는 tests/ 에서 확인한다.
// 입력값은 이 파일 안에서만 계산하고 어디로도 보내지 않는다.

export const RULES = {
  bedWindowMax18: 12 * 60,   // 취침 시각이 18:00 기준 12시간(=06:00) 넘으면 오류
  sleepMin: 180,             // 수면 3시간 미만이면 그날 취침·기상·수면 제외
  sleepMax: 840,             // 수면 14시간 초과면 제외
  minDaysSd: 5,              // 흔들림(표준편차) 계산에 필요한 최소 기록 수
  minWeekend: 2,             // 사회적 시차·주말 차이에 필요한 최소 주말 기록
  minWeekday: 3,             // 사회적 시차·주말 차이에 필요한 최소 평일 기록
  minPerWeekday: 2,          // 요일별 평균: 요일당 이보다 적으면 숨김
  trendWindow: 7,            // 이동평균 창(일)
  trendMinValues: 4,         // 창 안에 유효 기록이 이보다 적으면 그날 추세는 비움
  minSimilarCount: 5,        // 비슷한 패턴 인원이 이보다 적으면 숨김
  sjCutMin: 60,              // 비슷한 패턴: 사회적 시차 1시간 기준
};

export const TRAVEL = [
  // 서울에서 서쪽으로 n시간 = 주말에 몸이 n시간 늦게 사는 것에 비유
  { h: 1, city: "베이징" }, { h: 2, city: "방콕" }, { h: 3, city: "다카" },
  { h: 4, city: "타슈켄트" }, { h: 5, city: "두바이" }, { h: 6, city: "모스크바" },
];

// ---------------------------------------------------------------- 기본 변환
export function hhmmToMin(s) {
  if (s === null || s === undefined) return NaN;
  const m = /^\s*(\d{1,2}):(\d{2})/.exec(String(s));
  if (!m) return NaN;
  const h = Number(m[1]), mi = Number(m[2]);
  if (!(h >= 0 && h < 24 && mi >= 0 && mi < 60)) return NaN;
  return h * 60 + mi;
}

export function minToHhmm(m) {
  if (!Number.isFinite(m)) return null;
  const v = ((Math.round(m) % 1440) + 1440) % 1440;
  return String(Math.floor(v / 60)).padStart(2, "0") + ":" + String(v % 60).padStart(2, "0");
}

export const bed18ToHhmm = (m) => (Number.isFinite(m) ? minToHhmm(m + 18 * 60) : null);

// ISO 날짜(YYYY-MM-DD) -> 1970-01-01부터 날 수. 시간대 영향을 받지 않는다.
export function dayNumber(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return NaN;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  if (d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return NaN;
  return t / 86400000;
}
// 요일: 0=월 ... 6=일 (파이썬 weekday와 같음)
export const weekdayOf = (dn) => (((dn + 3) % 7) + 7) % 7;
export const isoOf = (dn) => new Date(dn * 86400000).toISOString().slice(0, 10);

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
function sd(a) {
  if (a.length < 2) return NaN;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

// ---------------------------------------------------------------- 정리
// records: [{date: "YYYY-MM-DD", bed: "HH:MM", wake: "HH:MM"}]
// 같은 날짜가 여러 번 있으면 마지막 것을 쓴다.
export function cleanRecords(records) {
  const byDay = new Map();
  for (const r of records || []) {
    const dn = dayNumber(String(r.date || "").trim());
    if (!Number.isFinite(dn)) continue;
    byDay.set(dn, r);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);
  return days.map((dn) => {
    const r = byDay.get(dn);
    const bedRaw = hhmmToMin(r.bed);
    let wake = hhmmToMin(r.wake);
    let bed18 = Number.isFinite(bedRaw) ? (bedRaw >= 1080 ? bedRaw - 1080 : bedRaw + 360) : NaN;
    if (bed18 > RULES.bedWindowMax18) bed18 = NaN;
    let sleep = wake + 360 - bed18;
    if (Number.isFinite(sleep) && (sleep < RULES.sleepMin || sleep > RULES.sleepMax)) {
      bed18 = NaN; wake = NaN; sleep = NaN;
    }
    const wd = weekdayOf(dn);
    return { dn, date: isoOf(dn), wd, weekend: wd >= 5, bed18, wake, sleep };
  });
}

// ---------------------------------------------------------------- 지표
// 평일·주말 평균을 각각 뺀 잔차의 표준편차 (분석의 1차 평가변수와 같은 정의)
export function residSd(rows, key) {
  const v = rows.filter((r) => Number.isFinite(r[key]));
  if (v.length < RULES.minDaysSd) return NaN;
  const groups = [false, true].map((we) => v.filter((r) => r.weekend === we).map((r) => r[key]));
  let ss = 0, ng = 0;
  for (const g of groups) {
    if (!g.length) continue;
    ng += 1;
    const m = mean(g);
    for (const x of g) ss += (x - m) ** 2;
  }
  return Math.sqrt(ss / (v.length - ng));
}

function weekendSplit(rows, key) {
  const wd = rows.filter((r) => !r.weekend && Number.isFinite(r[key])).map((r) => r[key]);
  const we = rows.filter((r) => r.weekend && Number.isFinite(r[key])).map((r) => r[key]);
  if (we.length < RULES.minWeekend || wd.length < RULES.minWeekday) return null;
  return { wd: mean(wd), we: mean(we) };
}

export function computeMetrics(records) {
  const rows = cleanRecords(records);
  for (const r of rows) r.mid = r.bed18 + r.sleep / 2;           // 수면 중간 시각 (18:00 기준 분)
  const vals = (k) => rows.filter((r) => Number.isFinite(r[k])).map((r) => r[k]);

  const midSplit = weekendSplit(rows, "mid");
  const wakeSplit = weekendSplit(rows, "wake");
  const sjSigned = midSplit ? midSplit.we - midSplit.wd : NaN;

  // 요일별 평균: 취침은 "잠든 밤"의 요일(일어난 날 하루 전), 기상은 일어난 날의 요일
  const byWeekday = [];
  for (let w = 0; w < 7; w++) {
    const bedNight = rows.filter((r) => Number.isFinite(r.bed18) && (r.wd + 6) % 7 === w).map((r) => r.bed18);
    const wakeDay = rows.filter((r) => Number.isFinite(r.wake) && r.wd === w).map((r) => r.wake);
    byWeekday.push({
      weekday: w,
      bed18: bedNight.length >= RULES.minPerWeekday ? mean(bedNight) : NaN,
      bedN: bedNight.length,
      wake: wakeDay.length >= RULES.minPerWeekday ? mean(wakeDay) : NaN,
      wakeN: wakeDay.length,
    });
  }

  // 취침 7일 이동평균: 그날 포함 지난 7일 안의 유효 기록 평균
  const trend = [];
  if (rows.length) {
    const first = rows[0].dn, last = rows[rows.length - 1].dn;
    const bedByDay = new Map(rows.filter((r) => Number.isFinite(r.bed18)).map((r) => [r.dn, r.bed18]));
    for (let dn = first; dn <= last; dn++) {
      const win = [];
      for (let k = dn - RULES.trendWindow + 1; k <= dn; k++) if (bedByDay.has(k)) win.push(bedByDay.get(k));
      trend.push({
        date: isoOf(dn),
        bed18: bedByDay.has(dn) ? bedByDay.get(dn) : NaN,
        avg7: win.length >= RULES.trendMinValues ? mean(win) : NaN,
      });
    }
  }

  return {
    nRecords: rows.length,
    nValid: vals("sleep").length,
    sleepMean: mean(vals("sleep")),
    bedMean18: mean(vals("bed18")),
    wakeMean: mean(vals("wake")),
    bedResidSd: residSd(rows, "bed18"),
    wakeResidSd: residSd(rows, "wake"),
    midMean18: mean(vals("mid")),
    midWeekday18: midSplit ? midSplit.wd : NaN,
    midWeekend18: midSplit ? midSplit.we : NaN,
    socialJetlag: Number.isFinite(sjSigned) ? Math.abs(sjSigned) : NaN,
    socialJetlagSigned: sjSigned,
    wakeGap: wakeSplit ? wakeSplit.we - wakeSplit.wd : NaN,        // 주말 기상 - 평일 기상 (분)
    byWeekday,
    trend,
  };
}

// ---------------------------------------------------------------- 학급 기준과 비교
// 학급 기준값(classRef)에는 개인 값이 없고 분위수와 칸별 인원만 있다.
const QS = [10, 25, 50, 75, 90];

// 분위수 사이를 직선으로 이어 대략의 위치(%)를 낸다. 10% 아래는 5, 90% 위는 95로 묶는다.
export function percentileOf(value, q) {
  if (!Number.isFinite(value) || !q) return NaN;
  const xs = QS.map((p) => q["p" + p]);
  if (value < xs[0]) return 5;
  if (value > xs[4]) return 95;
  for (let i = 0; i < 4; i++) {
    if (value <= xs[i + 1]) {
      const span = xs[i + 1] - xs[i];
      if (span <= 0) return QS[i];
      return QS[i] + ((value - xs[i]) / span) * (QS[i + 1] - QS[i]);
    }
  }
  return 95;
}

export function travelFor(sjMin) {
  if (!Number.isFinite(sjMin)) return null;
  const h = sjMin / 60;
  if (h < 0.5) return { hours: h, city: null };
  const n = Math.min(6, Math.max(1, Math.floor(h + 0.5)));
  return { hours: h, city: TRAVEL[n - 1].city, cityHours: n };
}

// 비슷한 패턴: 수면 중간 시각(학급 3등분) x 사회적 시차(1시간 미만/이상) 칸
export function patternCell(m, classRef) {
  if (!classRef || !Number.isFinite(m.midMean18) || !Number.isFinite(m.socialJetlag)) return null;
  const [c1, c2] = classRef.midCuts;
  const midBin = m.midMean18 <= c1 ? 0 : m.midMean18 <= c2 ? 1 : 2;
  const sjBin = m.socialJetlag < RULES.sjCutMin ? 0 : 1;
  const key = `${midBin}-${sjBin}`;
  const count = classRef.cells[key];
  return { key, midBin, sjBin, count: count === undefined ? null : count, n: classRef.n };
}

export function compareToClass(m, classRef) {
  if (!classRef) return null;
  const q = classRef.quantiles;
  return {
    sleepPct: percentileOf(m.sleepMean, q.sleepMean),
    bedSdPct: percentileOf(m.bedResidSd, q.bedResidSd),
    wakeSdPct: percentileOf(m.wakeResidSd, q.wakeResidSd),
    midPct: percentileOf(m.midMean18, q.midMean18),
    sjPct: percentileOf(m.socialJetlag, q.socialJetlag),
    similar: patternCell(m, classRef),
  };
}

// ---------------------------------------------------------------- 설명 문장 (규칙 기반)
// 개인 결과 페이지는 미리 만든 설명(LLM 또는 이 템플릿)을 쓰고, 공개 자가진단은 이 템플릿을 쓴다.
export function templateText(m, cls) {
  const out = [];
  const h1 = (x) => (Math.round(x / 6) / 10).toFixed(1);
  if (Number.isFinite(m.sleepMean)) {
    out.push(`기록한 ${m.nValid}일 동안 평균 수면은 ${h1(m.sleepMean)}시간이었고, 보통 ${bed18ToHhmm(m.bedMean18)}쯤 자서 ${minToHhmm(m.wakeMean)}쯤 일어났어요.`);
  }
  if (Number.isFinite(m.bedResidSd)) {
    out.push(`평일·주말 차이를 빼고 봐도 취침 시각은 날마다 평균 ${Math.round(m.bedResidSd)}분 정도 앞뒤로 움직였어요.`);
  }
  const t = travelFor(m.socialJetlag);
  if (t) {
    out.push(t.city
      ? `주말과 평일의 수면 중간 시각이 약 ${t.hours.toFixed(1)}시간 차이 나요. 비유하면 주말마다 ${t.city}에 다녀오는 셈이에요.`
      : `주말과 평일의 수면 중간 시각 차이는 30분이 안 돼요. 거의 서울 안에서 지내는 셈이에요.`);
  }
  if (cls && Number.isFinite(cls.bedSdPct)) {
    out.push(`취침 흔들림은 학급 참고값 막대에서 ${cls.bedSdPct < 50 ? "작은 쪽" : "큰 쪽"}에 있어요. 좋고 나쁨이 아니라 위치만 보여주는 거예요.`);
  }
  if (m.nValid < 10) out.push("기록이 10일보다 적어서 결과가 달라질 수 있어요.");
  out.push("이 결과는 기록한 기간의 패턴을 정리한 것이고, 건강 상태를 판단하는 것이 아니에요.");
  return out.join(" ");
}

// 개선 목표 후보 3개(사전등록 5장). 학생이 하나만 고른다. 고른 값은 이 기기 안에만 저장된다.
// "매일 아침 기록 빠뜨리지 않기"는 측정(기록 행동) 자체를 바꾸는 목표라 후보에서 뺐다.
// 목표 제출 폼과 같은 3개를 늘 같은 순서로 보여준다.
export const GOALS = [
  { id: "bed-window", text: "평일 취침을 정한 시각 앞뒤 30분 안에 맞추기" },
  { id: "weekend-wake", text: "주말에도 평일보다 1시간 안에 일어나기" },
  { id: "wind-down", text: "잠들기 30분 전에 휴대폰 내려놓기" },
];
export function goalOptions() {
  return GOALS;
}
