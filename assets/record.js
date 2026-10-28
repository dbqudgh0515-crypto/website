// 매일 기록 제출: 빈칸과 수면 길이를 확인한 뒤 같은 사이트로 POST(Netlify Forms "daily-record").
// 이름은 이 기기에만 기억해 다음부터 채운다. 같은 날을 다시 내면 연구자는 마지막에 낸 기록을 쓴다.
import { submitNetlifyForm } from "./netlify-form.js";

const form = document.querySelector(".record-form");
const msg = form.querySelector(".form-msg");
const last = form.querySelector(".last-sent");
const btn = form.querySelector('button[type="submit"]');
const nameInput = form.elements.namedItem("name");          // form.name은 폼 자신의 이름과 헷갈리므로 칸을 직접 집는다
const dateInput = form.elements.namedItem("date");
const bedInput = form.elements.namedItem("bed_time");
const wakeInput = form.elements.namedItem("wake_time");
const KEY = "wys-record";                                     // 이 기기에만: { name, last }
const WD = ["일", "월", "화", "수", "목", "금", "토"];

const pad = (n) => String(n).padStart(2, "0");
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const label = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${m}월 ${d}일(${WD[new Date(y, m - 1, d).getDay()]})`; };
const minutes = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ""); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
const span = (bed, wake) => (((wake - bed) % 1440) + 1440) % 1440;     // 자정을 넘겨 자도 그대로 계산
const hm = (min) => (min % 60 ? `${Math.floor(min / 60)}시간 ${min % 60}분` : `${min / 60}시간`);

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 제출은 된다 */ } }

const saved = load();
if (saved.name) nameInput.value = saved.name;
dateInput.value = todayIso();
dateInput.max = todayIso();
if (saved.last) { last.hidden = false; last.textContent = `이 기기에서 마지막으로 낸 기록: ${label(saved.last)}`; }

let confirmed = "";             // 수면 길이가 3시간 미만·14시간 초과면 한 번 알리고, 같은 값으로 다시 누르면 그대로 낸다
function problem() {
  if (!nameInput.value.trim()) return "이름을 써 주세요.";
  if (!dateInput.value) return "일어난 날짜를 골라 주세요.";
  if (dateInput.value > todayIso()) return "일어난 날짜가 오늘보다 뒤예요. 날짜를 확인해 주세요.";
  if (!bedInput.value) return "어젯밤 잠든 시각을 골라 주세요.";
  if (!wakeInput.value) return "오늘 일어난 시각을 골라 주세요.";
  return "";
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const p = problem();
  if (p) { msg.className = "form-msg err"; msg.textContent = p; return; }
  const sleep = span(minutes(bedInput.value), minutes(wakeInput.value));
  const key = `${dateInput.value} ${bedInput.value} ${wakeInput.value}`;
  if ((sleep < 180 || sleep > 840) && confirmed !== key) {
    confirmed = key;
    msg.className = "form-msg err";
    msg.textContent = `잠든 시각부터 일어난 시각까지 ${hm(sleep)}으로 계산돼요. 오전·오후를 확인하고, 맞으면 한 번 더 눌러 주세요.`;
    return;
  }
  btn.disabled = true; msg.className = "form-msg"; msg.textContent = "보내는 중이에요…";
  const ok = await submitNetlifyForm("daily-record", {
    name: nameInput.value.trim(), date: dateInput.value, bed_time: bedInput.value, wake_time: wakeInput.value,
    "bot-field": form.elements["bot-field"].value,
  });
  btn.disabled = false;
  if (!ok) {
    msg.className = "form-msg err";
    msg.textContent = "제출하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요. 쓴 내용은 그대로 있어요.";
    return;
  }
  save({ name: nameInput.value.trim(), last: dateInput.value });
  msg.className = "form-msg ok";
  msg.textContent = `${label(dateInput.value)} 기록을 냈어요. ${bedInput.value}에 자서 ${wakeInput.value}에 일어났어요(${hm(sleep)}). 고마워요.`;
  last.hidden = false;
  last.textContent = `이 기기에서 마지막으로 낸 기록: ${label(dateInput.value)}`;
  bedInput.value = ""; wakeInput.value = ""; confirmed = "";                 // 같은 기록을 실수로 두 번 내지 않게
});
