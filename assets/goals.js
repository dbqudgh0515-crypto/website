// 목표 도우미 (사전등록 5장 ②~④): 목표마다 "만약 ~하면 ~한다" 예시 한 줄과 팁 2~3개(출처 링크).
// 목표 문장과 순서는 calc.js의 GOALS, 목표 제출 구글폼의 선택지와 똑같아야 한다.

// 실천 계획 예시. 학생은 폼에서 자기 상황에 맞게 직접 쓴다.
export const PLAN_EXAMPLES = {
  "bed-window": "만약 평일 밤 취침 30분 전 알람이 울리면, 하던 일을 저장하고 씻으러 간다.",
  "weekend-wake": "만약 주말 아침 알람이 울리면, 다시 눕지 않고 커튼부터 연다.",
  "wind-down": "만약 잠자리에 들기 30분 전 알람이 울리면, 휴대폰을 책상 위 충전기에 꽂아 둔다.",
};

// 팁: { text: "한 문장", source: "기관·학회·논문 이름", url: "https://..." }
// 연구자가 출처 페이지를 직접 확인한 것만 넣는다. 약·질환·진단 내용은 넣지 않는다.
// 비어 있으면 팁 칸을 보여주지 않는다.
export const TIPS = {
  "bed-window": [],
  "weekend-wake": [],
  "wind-down": [],
};

// 목표 제출 폼 미리 채우기 주소. form은 암호문에 든 { base, codeEntry, goalEntry }와 확인 코드(code).
// 형식이 하나라도 어긋나면 null을 돌려줘서 버튼을 만들지 않는다.
const FORM_BASE = /^https:\/\/docs\.google\.com\/forms\/d\/e\/[A-Za-z0-9_-]+\/viewform$/;
const ENTRY = /^entry\.\d+$/;
export function prefillUrl(form, code, goalText) {
  if (!form || !FORM_BASE.test(form.base || "") || !ENTRY.test(form.codeEntry || "") || !ENTRY.test(form.goalEntry || "")) return null;
  if (!/^[0-9a-f]{8}$/.test(code || "") || !goalText) return null;
  const q = new URLSearchParams({ usp: "pp_url" });
  q.set(form.codeEntry, code);
  q.set(form.goalEntry, goalText);
  return `${form.base}?${q}`;
}
