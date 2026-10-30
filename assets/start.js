// 시작 설문 제출: 빈칸을 확인한 뒤 같은 사이트로 POST(Netlify Forms "start-survey").
// 성공·실패를 알려 주고, 실패해도 쓴 내용은 그대로 둔다. 다시 내면 연구자는 마지막 응답을 쓴다.
import { submitNetlifyForm } from "./netlify-form.js";

const form = document.querySelector(".start-form");
const msg = form.querySelector(".form-msg");
const btn = form.querySelector('button[type="submit"]');
const nameInput = form.elements.namedItem("name");          // form.name은 폼 자신의 이름과 헷갈리므로 칸을 직접 집는다

function problem() {
  if (!nameInput.value.trim()) return "이름을 써 주세요.";
  if (!form.querySelector('input[name="regularity"]:checked')) return "규칙성 문항(1~5)을 골라 주세요.";
  const v = form.weekend_delay.value.trim();
  const n = Number(v);
  if (v === "" || !Number.isFinite(n) || n < 0 || n > 12 || Math.round(n * 2) !== n * 2) return "주말 문항은 0부터 12까지, 0.5 단위 숫자로 적어 주세요.";
  if (!form.consent.checked) return "참여 동의에 체크해 주세요.";
  return "";
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const p = problem();
  if (p) { msg.className = "form-msg err"; msg.textContent = p; return; }
  btn.disabled = true; msg.className = "form-msg"; msg.textContent = "보내는 중이에요…";
  const ok = await submitNetlifyForm("start-survey", {
    name: nameInput.value.trim(),
    regularity: form.querySelector('input[name="regularity"]:checked').value,
    weekend_delay: String(Number(form.weekend_delay.value)),
    consent: form.consent.checked ? "동의함" : "",
    "bot-field": form.elements["bot-field"].value,
  });
  msg.className = ok ? "form-msg ok" : "form-msg err";
  msg.textContent = ok ? "제출했어요. 고마워요. 아래 버튼으로 매일 기록 폼을 열어 두세요. 기록은 11월 20일(금)까지예요."
    : "제출하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요. 쓴 내용은 그대로 있어요.";
  btn.disabled = false;
  if (ok) form.querySelector(".start-done").hidden = false;           // 매일 기록 폼(/record/)으로 가는 버튼
});
