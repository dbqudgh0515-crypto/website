// 사용 후기 제출: 빈칸을 확인한 뒤 같은 사이트로 POST(Netlify Forms "review-survey"). 문항은 사전등록 9장.
// 성공·실패를 알려 주고, 실패해도 쓴 내용은 그대로 둔다. 다시 내면 연구자는 마지막 응답을 쓴다.
import { submitNetlifyForm } from "./netlify-form.js";

const form = document.querySelector(".review-form");
const msg = form.querySelector(".form-msg");
const btn = form.querySelector('button[type="submit"]');
const nameInput = form.elements.namedItem("name");          // form.name은 폼 자신의 이름과 헷갈리므로 칸을 직접 집는다

// 고르는 문항: [칸 이름, 비었을 때 문구]
const CHOICES = [
  ["opens", "결과 링크를 몇 번 열어 봤는지 골라 주세요."],
  ["understand", "이해하기 쉬웠는지(1~5) 골라 주세요."],
  ["helpful", "도움이 됐는지(1~5) 골라 주세요."],
  ["changed", "바꿔 본 것이 있는지 골라 주세요."],
  ["goal_kept", "목표를 얼마나 지켰는지 골라 주세요."],
  ["plan_recall", "실천 계획을 떠올린 적이 있는지 골라 주세요."],
  ["tips", "팁이 도움이 됐는지(1~5) 골라 주세요."],
  ["contaminated", "마지막 문항(결과를 받기 전에 친구 결과를 봤는지)을 골라 주세요."],
];
const picked = (n) => form.querySelector(`input[name="${n}"]:checked`);

function problem() {
  if (!nameInput.value.trim()) return "이름을 써 주세요.";
  const miss = CHOICES.find(([n]) => !picked(n));
  return miss ? miss[1] : "";
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const p = problem();
  if (p) { msg.className = "form-msg err"; msg.textContent = p; return; }
  btn.disabled = true; msg.className = "form-msg"; msg.textContent = "보내는 중이에요…";
  const fields = { name: nameInput.value.trim() };
  for (const [n] of CHOICES) fields[n] = picked(n).value;
  fields.changed_what = form.elements.namedItem("changed_what").value.trim();
  fields.problems = form.elements.namedItem("problems").value.trim();
  fields["bot-field"] = form.elements["bot-field"].value;
  const ok = await submitNetlifyForm("review-survey", fields);
  msg.className = ok ? "form-msg ok" : "form-msg err";
  msg.textContent = ok ? "제출했어요. 끝까지 참여해 줘서 고마워요."
    : "제출하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요. 쓴 내용은 그대로 있어요.";
  btn.disabled = false;
});
