// 공개 자가진단: 입력 -> calc.js 계산 -> 화면. 네트워크 요청은 없다 (index.html의 CSP가 막는다).
import { renderResults } from "./render.js";
import classRef from "./class_ref.js";

const $ = (id) => document.getElementById(id);
const rowsEl = $("rows");

function todayIso(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function nextDate(iso) {
  const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addRow(date = "", bed = "", wake = "") {
  const last = rowsEl.querySelector(".inrow:last-child input[type=date]");
  if (!date) date = last && last.value ? nextDate(last.value) : todayIso(-6);
  const div = document.createElement("div");
  div.className = "inrow";
  // 시각은 24시간제 글자로 받는다. type=time은 휴대폰에서 오전/오후로 보여 좁은 칸에서 23:40과 11:40이 헷갈린다.
  div.innerHTML = `<input type="date" aria-label="일어난 날"><input type="text" inputmode="numeric" placeholder="23:40" maxlength="5" aria-label="잠든 시각 (24시간제)"><input type="text" inputmode="numeric" placeholder="06:50" maxlength="5" aria-label="일어난 시각 (24시간제)"><button type="button" class="x" aria-label="이 줄 지우기">✕</button>`;
  const [d, b, w] = div.querySelectorAll("input");
  d.value = date; b.value = bed; w.value = wake;
  div.querySelector("button").addEventListener("click", () => div.remove());
  rowsEl.appendChild(div);
}

// "2340", "23:40", "23.40", "7:05" -> "HH:MM". 못 읽으면 그대로 둔다(계산에서 빠짐).
function normTime(s) {
  const t = String(s || "").trim();
  const m = /^(\d{1,2})\D?(\d{2})$/.exec(t);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : t;
}

function readRows() {
  return [...rowsEl.querySelectorAll(".inrow")].map((r) => {
    const [d, b, w] = r.querySelectorAll("input");
    b.value = normTime(b.value); w.value = normTime(w.value);
    return { date: d.value, bed: b.value, wake: w.value };
  }).filter((r) => r.date && (r.bed || r.wake));
}

function normDate(s) {
  const m = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(s);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : "";
}

$("add").addEventListener("click", () => addRow());
$("clear").addEventListener("click", () => { rowsEl.innerHTML = ""; $("out").innerHTML = ""; for (let i = 0; i < 7; i++) addRow(); });
$("usePaste").addEventListener("click", () => {
  const lines = $("paste").value.split(/\n+/).map((l) => l.split(/[,\t]+/).map((x) => x.trim())).filter((p) => p.length >= 3);
  if (!lines.length) { $("msg").textContent = "붙여넣은 내용에서 기록을 찾지 못했어요."; return; }
  rowsEl.innerHTML = "";
  for (const [d, b, w] of lines) addRow(normDate(d), normTime(b), normTime(w));
  $("msg").textContent = "";
});
$("demo").addEventListener("click", () => {
  rowsEl.innerHTML = "";
  const beds = ["23:40", "00:10", "23:55", "00:30", "23:50", "01:20", "01:40", "23:30", "00:05", "23:45", "00:20", "00:00", "01:10", "01:30"];
  const wakes = ["06:50", "06:55", "06:45", "07:00", "06:50", "09:10", "09:40", "06:40", "06:55", "06:50", "07:05", "06:45", "08:50", "09:20"];
  let d = "2026-09-14";
  for (let i = 0; i < 14; i++) { addRow(d, beds[i], wakes[i]); d = nextDate(d); }
});
$("go").addEventListener("click", () => {
  const recs = readRows();
  $("msg").textContent = recs.length ? "" : "기록을 한 줄 이상 넣어 주세요.";
  if (!recs.length) return;
  const survey = { selfRegularity: $("selfReg").value || null, expectedWeekendDelayH: $("expDelay").value === "" ? null : Number($("expDelay").value) };
  renderResults($("out"), { records: recs, survey, classRef, feedbackText: null, storageKey: null });
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;   // 움직임 줄이기면 부드러운 스크롤도 끈다
  $("out").scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
});

for (let i = 0; i < 7; i++) addRow();
